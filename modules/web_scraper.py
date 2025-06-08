"""
Enhanced Web Scraper Module for LinkedIn Post Generator
This module handles website monitoring and content extraction from various sources
with advanced features for relevance filtering and caching.

Updated: June 6, 2025
"""
import os
import json
import random
from datetime import datetime, timedelta
import time
import re
import logging
import hashlib
from urllib.parse import urlparse, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional, Tuple, Union

# Import our article scoring module
from .article_scorer import ArticleScorer
from .config import DEFAULT_WEBSCRAPER_CONFIG, _apply_env_overrides

# Configure logger
logger = logging.getLogger(__name__)

# Conditionally import these modules
try:
    import requests
    from bs4 import BeautifulSoup
    import feedparser
    import newspaper
    from newspaper import Article as NewsArticle
    from readability import Document
    import trafilatura
    MOCK_MODE = False
except ImportError:
    logger.warning("Some scraping dependencies not available. Using mock data or limited functionality.")
    MOCK_MODE = True

class WebScraper:
    def __init__(self, config=None):
        """Initialize the web scraper with enhanced settings
        
        Args:
            config (dict, optional): Configuration override
        """
        # Default configuration from central config
        self.config = DEFAULT_WEBSCRAPER_CONFIG.copy()
        # Apply environment variable overrides
        self.config = _apply_env_overrides(self.config, "WEBSCRAPER")
        
        # Override with provided config
        if config:
            self.config.update(config)
        
        # Initialize scraper state
        self.sources = []
        self.frequency = 'daily'
        self.last_check = {}
        self.content_cache = {}
        self.keyword_cache = {}
        self.visited_urls = set()
        self.mock_mode = MOCK_MODE
        
        # Initialize article scorer with our config
        self.article_scorer = ArticleScorer(self.config)
        
        # Load data from file system if available
        self.load_state()
        
        if self.mock_mode:
            logger.info("Running web scraper in mock mode. Will use sample article data.")
            self._initialize_mock_sources()
    
    def load_state(self):
        """Load scraper state from file system"""
        try:
            cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'cache')
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir)
                
            # Load sources
            sources_path = os.path.join(cache_dir, 'sources.json')
            if os.path.exists(sources_path):
                with open(sources_path, 'r') as f:
                    self.sources = json.load(f)
                logger.info(f"Loaded {len(self.sources)} sources from disk")
            
            # Load last check times
            last_check_path = os.path.join(cache_dir, 'last_check.json')
            if os.path.exists(last_check_path):
                with open(last_check_path, 'r') as f:
                    # Convert string timestamps back to datetime
                    data = json.load(f)
                    for source_id, timestamp_str in data.items():
                        try:
                            self.last_check[source_id] = datetime.fromisoformat(timestamp_str)
                        except ValueError:
                            # If timestamp can't be parsed, treat as never checked
                            pass
                    
            # Load content cache (most recent articles)
            cache_path = os.path.join(cache_dir, 'content_cache.json')
            if os.path.exists(cache_path):
                with open(cache_path, 'r') as f:
                    self.content_cache = json.load(f)
                    
                # Clean up old cache entries
                self._cleanup_cache()
        except Exception as e:
            logger.error(f"Error loading scraper state: {e}")
    
    def save_state(self):
        """Save scraper state to file system"""
        try:
            cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'cache')
            if not os.path.exists(cache_dir):
                os.makedirs(cache_dir)
            
            # Save sources
            sources_path = os.path.join(cache_dir, 'sources.json')
            with open(sources_path, 'w') as f:
                json.dump(self.sources, f)
                
            # Save last check times
            last_check_path = os.path.join(cache_dir, 'last_check.json')
            # Convert datetime objects to strings
            serializable_data = {}
            for source_id, dt in self.last_check.items():
                if isinstance(dt, datetime):
                    serializable_data[source_id] = dt.isoformat()
            with open(last_check_path, 'w') as f:
                json.dump(serializable_data, f)
                
            # Save content cache (limited to most recent/relevant articles)
            self._cleanup_cache()
            cache_path = os.path.join(cache_dir, 'content_cache.json')
            with open(cache_path, 'w') as f:
                json.dump(self.content_cache, f)
        except Exception as e:
            logger.error(f"Error saving scraper state: {e}")
            
    def _cleanup_cache(self):
        """Clean up old and excessive cache entries"""
        # Remove expired entries
        now = datetime.now()
        max_age = timedelta(days=self.config['max_article_age'])
        
        for source_id in list(self.content_cache.keys()):
            if source_id not in self.content_cache:
                continue
                
            # Filter out old articles
            current_articles = self.content_cache[source_id]
            fresh_articles = []
            
            for article in current_articles:
                try:
                    pub_date = datetime.fromisoformat(article.get('pub_date', '')) 
                    if now - pub_date <= max_age:
                        fresh_articles.append(article)
                except (ValueError, TypeError):
                    # Keep articles with invalid dates (for now)
                    fresh_articles.append(article)
            
            # Keep only the most recent articles if cache is too large
            max_articles = self.config['content_cache_size'] // max(1, len(self.sources))
            if len(fresh_articles) > max_articles:
                # Sort by date (newest first) and trim
                try:
                    fresh_articles.sort(key=lambda x: datetime.fromisoformat(x.get('pub_date', '0')), reverse=True)
                except (ValueError, TypeError):
                    # Fallback to just trimming without sorting
                    pass
                fresh_articles = fresh_articles[:max_articles]
                
            self.content_cache[source_id] = fresh_articles
            
    def add_source(self, source_info):
        """Add or update a website source
        
        Args:
            source_info (dict): Source information with name, url, and category
            
        Returns:
            dict: The added/updated source with ID
        """
        # Generate a unique ID if not provided
        if 'id' not in source_info:
            source_info['id'] = self._generate_source_id(source_info['url'])
            
        # Set default values for new sources
        if 'active' not in source_info:
            source_info['active'] = True
        if 'last_updated' not in source_info:
            source_info['last_updated'] = datetime.now().isoformat()
            
        # Discover RSS feed if not provided
        if 'rss_url' not in source_info or not source_info['rss_url']:
            discovered_rss = self._discover_rss_feed(source_info['url'])
            if discovered_rss:
                source_info['rss_url'] = discovered_rss
                
        # Update existing source or add new one
        for i, source in enumerate(self.sources):
            if source['id'] == source_info['id']:
                self.sources[i] = {**source, **source_info}
                self.save_state()
                return self.sources[i]
                
        # Add new source
        self.sources.append(source_info)
        self.save_state()
        return source_info
    
    def remove_source(self, source_id):
        """Remove a website source
        
        Args:
            source_id (str): ID of the source to remove
            
        Returns:
            bool: True if removed, False if not found
        """
        for i, source in enumerate(self.sources):
            if source['id'] == source_id:
                del self.sources[i]
                # Also remove from cache
                if source_id in self.content_cache:
                    del self.content_cache[source_id]
                if source_id in self.last_check:
                    del self.last_check[source_id]
                self.save_state()
                return True
        return False
        
    def get_sources(self):
        """Get all monitored sources
        
        Returns:
            list: All sources
        """
        return self.sources
        
    def _generate_source_id(self, url):
        """Generate a unique source ID from URL
        
        Args:
            url (str): Website URL
            
        Returns:
            str: Unique ID
        """
        parsed = urlparse(url)
        domain = parsed.netloc
        domain = re.sub(r'^www\.', '', domain)  # Remove www
        timestamp = int(time.time())
        return f"{domain}-{timestamp}"
        
    def _discover_rss_feed(self, url):
        """Discover RSS feed URL from website
        
        Args:
            url (str): Website URL
            
        Returns:
            str: RSS feed URL or None
        """
        if self.mock_mode:
            return None
            
        try:
            headers = {'User-Agent': self.config['user_agent']}
            response = requests.get(
                url, 
                headers=headers, 
                timeout=self.config['request_timeout'],
                allow_redirects=True
            )
            if response.status_code != 200:
                return None
                
            # Parse HTML
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Search for RSS links
            feed_links = soup.find_all('link', rel='alternate')
            for link in feed_links:
                if 'type' in link.attrs and (
                    'rss+xml' in link.attrs['type'] or 
                    'atom+xml' in link.attrs['type']
                ):
                    feed_url = link.attrs.get('href', '')
                    if feed_url.startswith('/'):
                        feed_url = urljoin(url, feed_url)
                    return feed_url
                    
            # Look for common RSS paths if none found in HTML
            common_paths = [
                '/feed', '/rss', '/feed/rss', '/rss.xml', 
                '/atom.xml', '/feed.xml', '/index.xml'
            ]
            
            for path in common_paths:
                test_url = urljoin(url, path)
                try:
                    feed_response = requests.head(
                        test_url, 
                        headers=headers,
                        timeout=self.config['request_timeout'] / 2
                    )
                    if feed_response.status_code == 200:
                        content_type = feed_response.headers.get('Content-Type', '')
                        if 'xml' in content_type:
                            return test_url
                except:
                    continue
        except Exception as e:
            logger.error(f"Error discovering RSS feed for {url}: {e}")
            
        return None
        
    def fetch_articles(self, source_id=None, force_refresh=False):
        """Fetch articles from a specific source or all sources
        
        Args:
            source_id (str, optional): ID of source to fetch from. If None, fetch from all.
            force_refresh (bool): If True, bypass cache
            
        Returns:
            list: Articles fetched
        """
        articles = []
        
        # If source_id provided, fetch from specific source
        if source_id:
            source = next((s for s in self.sources if s['id'] == source_id), None)
            if source:
                if self._should_check_source(source) or force_refresh:
                    return self._fetch_source_articles(source, force_refresh)
                else:
                    # Return cached articles if we shouldn't check yet
                    if source_id in self.content_cache:
                        logger.debug(f"Using cached content for {source['name']} (not time to check yet)")
                        return self.content_cache[source_id]['articles']
                    else:
                        # No cache but not time to check, return empty
                        return []
            else:
                logger.warning(f"Source ID {source_id} not found")
                return []
        
        # Otherwise fetch from all active sources that should be checked
        else:
            with ThreadPoolExecutor(max_workers=self.config['max_workers']) as executor:
                future_to_source = {}
                
                for source in self.sources:
                    if not source.get('active', True):
                        continue
                        
                    if self._should_check_source(source) or force_refresh:
                        # Submit task to thread pool
                        future = executor.submit(self._fetch_source_articles, source, force_refresh)
                        future_to_source[future] = source
                    elif source['id'] in self.content_cache:
                        # Use cached content
                        logger.debug(f"Using cached content for {source['name']}")
                        articles.extend(self.content_cache[source['id']]['articles'])
                        
                # Collect results from threads
                for future in as_completed(future_to_source):
                    source = future_to_source[future]
                    try:
                        source_articles = future.result()
                        if source_articles:
                            articles.extend(source_articles)
                    except Exception as e:
                        logger.error(f"Error fetching from {source['name']}: {e}")
            
            # Use our article scorer to organize all articles by relevance
            articles = self._order_articles_by_relevance(articles)
        
        return articles
        
    def _order_articles_by_relevance(self, articles):
        """Order articles by relevance score, handling duplicates
        
        Args:
            articles (list): Articles to order
            
        Returns:
            list: Ordered articles with duplicates removed
        """
        return self.article_scorer.order_articles_by_relevance(articles)
            
    def _should_check_source(self, source):
        """Check if a source should be scraped based on last check time and frequency
        
        Args:
            source (dict): Source information
            
        Returns:
            bool: True if source should be checked
        """
        source_id = source['id']
        frequency = source.get('check_frequency', self.frequency)
        
        # If never checked before, always check
        if source_id not in self.last_check:
            return True
            
        last_check_time = self.last_check[source_id]
        now = datetime.now()
        
        # Calculate time delta based on frequency
        if frequency == 'hourly':
            return now - last_check_time >= timedelta(hours=1)
        elif frequency == 'daily':
            return now - last_check_time >= timedelta(days=1)
        elif frequency == 'weekly':
            return now - last_check_time >= timedelta(weeks=1)
        else:  # Default: check every 12 hours
            return now - last_check_time >= timedelta(hours=12)
            
    def _fetch_source_articles(self, source, force_refresh=False):
        """Fetch articles from a specific source
        
        Args:
            source (dict): Source information
            force_refresh (bool): If True, bypass cache
            
        Returns:
            list: Articles fetched
        """
        source_id = source['id']
        source_url = source['url']
        
        # Return cached articles if available and not expired
        if not force_refresh and source_id in self.content_cache:
            cache_entry = self.content_cache[source_id]
            if time.time() - cache_entry['timestamp'] < self.config['cache_duration']:
                logger.debug(f"Using cached articles for {source['name']}")
                return cache_entry['articles']
                
        articles = []
        
        # Update last check time
        self.last_check[source_id] = datetime.now().isoformat()
        
        # 1. Try RSS feed first if available
        rss_url = source.get('rss_url')
        if rss_url:
            try:
                rss_articles = self._fetch_rss_articles(rss_url, source)
                if rss_articles:
                    articles.extend(rss_articles)
            except Exception as e:
                logger.error(f"Error fetching RSS from {rss_url}: {e}")
                
        # 2. If we don't have enough articles, try direct scraping
        if len(articles) < self.config['max_articles_per_source']:
            try:
                direct_articles = self._scrape_website_articles(source_url, source)
                if direct_articles:
                    articles.extend(direct_articles)
            except Exception as e:
                logger.error(f"Error scraping website {source_url}: {e}")
                
        # If we have no articles and in mock mode, return mock data
        if not articles and self.mock_mode:
            mock_articles = self._get_mock_articles(source)
            if mock_articles:
                articles.extend(mock_articles)
        
        # Use our ArticleScorer to process the articles
        processed_articles = self.article_scorer.process_articles(articles, source.get('category', ''))
                
        # Cache the processed results
        self.content_cache[source_id] = {
            'timestamp': time.time(),
            'articles': processed_articles
        }
                
        
        logger.info(f"Fetched {len(processed_articles)} articles from {source['name']}")
        return processed_articles
        
    def _fetch_rss_articles(self, rss_url, source):
        """Fetch articles from RSS feed
        
        Args:
            rss_url (str): URL of RSS feed
            source (dict): Source information
            
        Returns:
            list: Articles fetched from RSS
        """
        articles = []
        
        # Parse RSS feed
        feed = feedparser.parse(rss_url)
        
        # Extract articles
        for entry in feed.entries:
            try:
                # Get publication date
                pub_date = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    pub_date = datetime(*entry.published_parsed[:6])
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    pub_date = datetime(*entry.updated_parsed[:6])
                else:
                    pub_date = datetime.now()
                    
                # Create article object
                article = {
                    'title': entry.title,
                    'url': entry.link,
                    'summary': entry.get('summary', ''),
                    'content': entry.get('content', [{}])[0].get('value', '') if 'content' in entry else '',
                    'pub_date': pub_date.isoformat(),
                    'source_id': source['id'],
                    'source_name': source['name'],
                    'source_url': source['url'],
                    'category': source.get('category', ''),
                    'author': entry.get('author', ''),
                    'image_url': self._extract_image_from_rss_entry(entry)
                }
                
                # If content is missing, use summary
                if not article['content'] and article['summary']:
                    article['content'] = article['summary']
                    
                # Add to articles list
                articles.append(article)
                
            except Exception as e:
                logger.error(f"Error processing RSS entry: {e}")
                continue
                
        return articles
        
    def _extract_image_from_rss_entry(self, entry):
        """Extract image URL from RSS entry
        
        Args:
            entry: RSS entry object
            
        Returns:
            str: Image URL or None
        """
        # Check for media:content
        if 'media_content' in entry and entry.media_content:
            media = entry.media_content[0]
            if 'url' in media:
                return media['url']
                
        # Check for media:thumbnail
        if 'media_thumbnail' in entry and entry.media_thumbnail:
            media = entry.media_thumbnail[0]
            if 'url' in media:
                return media['url']
                
        # Check for enclosures
        if 'enclosures' in entry and entry.enclosures:
            for enclosure in entry.enclosures:
                if 'type' in enclosure and enclosure.type.startswith('image'):
                    return enclosure.href
                    
        # Check for image in content
        if 'content' in entry and entry.content:
            content = entry.content[0].value
            soup = BeautifulSoup(content, 'html.parser')
            img = soup.find('img')
            if img and 'src' in img.attrs:
                return img['src']
                
        # Check for image in summary
        if 'summary' in entry:
            soup = BeautifulSoup(entry.summary, 'html.parser')
            img = soup.find('img')
            if img and 'src' in img.attrs:
                return img['src']
                
        return None
            
    def _scrape_website_articles(self, url, source):
        """Scrape articles directly from website
        
        Args:
            url (str): Website URL
            source (dict): Source information
            
        Returns:
            list: Articles scraped from website
        """
        articles = []
        source_id = source['id']
        source_name = source['name']
        
        # Skip scraping in mock mode
        if self.mock_mode:
            logger.debug(f"Mock mode: Skipping real scraping of {url}")
            return []
        
        try:
            # Use newspaper library for extraction
            logger.info(f"Building site model for {url}")
            news_source = newspaper.build(
                url, 
                memoize_articles=False,
                fetch_images=False,
                request_timeout=self.config['request_timeout'],
                number_threads=2
            )
            
            # Get article URLs
            article_urls = [article.url for article in news_source.articles[:20]]
            logger.debug(f"Found {len(article_urls)} article URLs on {url}")
            
            # Process each article URL
            for article_url in article_urls[:self.config['max_articles_per_source'] * 2]:
                # Skip if already visited
                if article_url in self.visited_urls:
                    continue
                    
                # Skip URLs matching excluded patterns
                if any(re.search(pattern, article_url, re.IGNORECASE) for pattern in self.config['excluded_patterns']):
                    continue
                    
                try:
                    # Get article content using newspaper
                    article = NewsArticle(article_url)
                    article.download()
                    article.parse()
                    
                    # Extract metadata
                    title = article.title
                    # Skip articles with no title
                    if not title:
                        continue
                        
                    # Get content using multiple methods for best results
                    content = ''
                    try:
                        # Try trafilatura first (often better quality)
                        downloaded = trafilatura.fetch_url(article_url)
                        if downloaded:
                            content = trafilatura.extract(downloaded, include_comments=False, include_tables=True) or ''
                    except Exception:
                        pass
                        
                    # If trafilatura failed, use newspaper content
                    if not content.strip():
                        content = article.text
                        
                    # If still no content, use readability
                    if not content.strip():
                        try:
                            headers = {'User-Agent': self.config['user_agent']}
                            response = requests.get(article_url, headers=headers, timeout=self.config['request_timeout'])
                            doc = Document(response.text)
                            content = doc.summary()
                            # Strip HTML
                            soup = BeautifulSoup(content, 'html.parser')
                            content = soup.get_text()
                        except Exception:
                            pass
                    
                    # Skip if still no content or too short
                    if len(content) < self.config['min_article_length']:
                        continue
                        
                    # Create article object
                    article_obj = {
                        'title': title,
                        'url': article_url,
                        'summary': article.summary or content[:200] + '...',
                        'content': content,
                        'pub_date': article.publish_date.isoformat() if article.publish_date else datetime.now().isoformat(),
                        'source_id': source_id,
                        'source_name': source_name,
                        'source_url': url,
                        'category': source.get('category', ''),
                        'author': article.authors[0] if article.authors else '',
                        'image_url': article.top_image
                    }
                    
                    articles.append(article_obj)
                    self.visited_urls.add(article_url)
                    logger.debug(f"Extracted article: {title} from {article_url}")
                    
                except Exception as e:
                    logger.debug(f"Error processing article {article_url}: {e}")
                    continue
        except Exception as e:
            logger.error(f"Error scraping website {url}: {e}")
            
        logger.info(f"Scraped {len(articles)} articles from {source_name} website")
        return articles
        
    def _get_mock_articles(self, source):
        """Get mock articles for testing
        
        Args:
            source (dict): Source information
            
        Returns:
            list: Mock articles
        """
        source_id = source['id']
        source_name = source['name']
        category = source.get('category', '')
        
        # Generate 5-10 mock articles
        num_articles = random.randint(5, 10)
        mock_articles = []
        
        # Sample topics based on category
        topics = {
            'technology': ['AI', 'Machine Learning', 'Blockchain', 'IoT', 'Cloud Computing', '5G', 'Cybersecurity'],
            'business': ['Startups', 'Leadership', 'Marketing', 'Finance', 'Entrepreneurship', 'Innovation'],
            'science': ['Space', 'Climate', 'Medicine', 'Biology', 'Physics', 'Research'],
            'health': ['Wellness', 'Fitness', 'Nutrition', 'Mental Health', 'Medicine', 'Healthcare']  
        }
        
        # Default topics if category not specified
        default_topics = ['Technology', 'Business', 'Innovation', 'Digital Transformation', 'Leadership']
        
        # Get relevant topics based on category
        relevant_topics = topics.get(category.lower(), default_topics) if category else default_topics
        
        for i in range(num_articles):
            # Generate random date within the past week
            days_old = random.randint(0, 6)
            pub_date = (datetime.now() - timedelta(days=days_old, 
                                                 hours=random.randint(0, 23),
                                                 minutes=random.randint(0, 59)))
            
            # Select random topics for this article
            article_topics = random.sample(relevant_topics, k=min(3, len(relevant_topics)))
            
            # Create a title based on topics
            primary_topic = random.choice(article_topics)
            title_templates = [
                f"How {primary_topic} is Transforming the Future of Work",
                f"10 Ways {primary_topic} is Changing Business in 2025",
                f"The Rise of {primary_topic}: What You Need to Know",
                f"Why {primary_topic} Matters More Than Ever",
                f"The Future of {primary_topic}: Trends and Insights"
            ]
            
            title = random.choice(title_templates)
            
            # Generate content length (between 1000-5000 chars)
            content_length = random.randint(1000, 5000)
            content = f"This is a mock article about {', '.join(article_topics)}. " * (content_length // 50)
            
            # Create mock article
            mock_article = {
                'title': title,
                'url': f"https://mock-{source_id}.com/article-{i}",
                'summary': f"Summary of article about {', '.join(article_topics)}...",
                'content': content,
                'pub_date': pub_date.isoformat(),
                'source_id': source_id,
                'source_name': source_name,
                'source_url': source.get('url', ''),
                'category': category,
                'author': 'Mock Author',
                'image_url': f"https://mock-{source_id}.com/images/{i}.jpg",
                'topics': article_topics
            }
            
            mock_articles.append(mock_article)
            
        return mock_articles
        
    def _initialize_mock_sources(self):
        """Initialize sample sources for mock mode"""
        # Pre-defined mock sources for testing
        self.sources = [
            {
                'id': 'techcrunch',
                'name': 'TechCrunch',
                'url': 'https://techcrunch.com',
                'category': 'technology, startups',
                'active': True
            },
            {
                'id': 'wired',
                'name': 'Wired',
                'url': 'https://wired.com',
                'category': 'technology, innovation',
                'active': True
            },
            {
                'id': 'hbr',
                'name': 'Harvard Business Review',
                'url': 'https://hbr.org',
                'category': 'business, leadership',
                'active': True
            },
            {
                'id': 'forbes',
                'name': 'Forbes',
                'url': 'https://forbes.com',
                'category': 'business, finance',
                'active': True
            },
            {
                'id': 'nature',
                'name': 'Nature',
                'url': 'https://nature.com',
                'category': 'science, research',
                'active': True
            }
        ]
        
        # Generate mock articles
        for source in self.sources:
            self.content_cache[source['id']] = {'articles': self._get_mock_articles(source), 'last_updated': datetime.now()}
            
        logger.info(f"Initialized {len(self.sources)} mock sources")
        
    def _load_sources(self):
        """Load sources from a JSON file if it exists"""
        try:
            if os.path.exists('sources_config.json'):
                with open('sources_config.json', 'r') as f:
                    config = json.load(f)
                    self.sources = config.get('sources', [])
                    self.frequency = config.get('frequency', 'daily')
                    self.last_check = {s['url']: None for s in self.sources}
        except Exception as e:
            print(f"Error loading sources: {e}")
    
    def _save_sources(self):
        """Save sources to a JSON file"""
        if self.mock_mode:
            return
            
        try:
            with open('sources_config.json', 'w') as f:
                json.dump({
                    'sources': self.sources,
                    'frequency': self.frequency
                }, f)
        except Exception as e:
            print(f"Error saving sources: {e}")
        
    def configure(self, sources, frequency='daily'):
        """
        Configure the websites and RSS feeds to monitor.
        
        Args:
            sources (list): List of dictionaries containing source information
                Each dict should have: name, url, type (website or rss), category
            frequency (str): How often to check ('hourly', 'daily', 'weekly')
        """
        self.sources = sources
        self.frequency = frequency
        self.last_check = {s['url']: None for s in self.sources}
        self._save_sources()
        
    def should_check(self, source):
        """
        Determine if a source should be checked based on frequency.
        
        Args:
            source (dict): Source information dictionary
            
        Returns:
            bool: True if source should be checked, False otherwise
        """
        url = source['url']
        if url not in self.last_check or self.last_check[url] is None:
            return True
            
        now = datetime.now()
        last = self.last_check[url]
        
        if self.frequency == 'hourly':
            return (now - last).total_seconds() >= 3600
        elif self.frequency == 'daily':
            return (now - last).days >= 1
        elif self.frequency == 'weekly':
            return (now - last).days >= 7
        
        return True
    
    def is_rss_feed(self, url):
        """
        Check if the URL is an RSS feed.
        
        Args:
            url (str): URL to check
            
        Returns:
            bool: True if URL is an RSS feed, False otherwise
        """
        try:
            feed = feedparser.parse(url)
            return len(feed.entries) > 0 and hasattr(feed, 'version') and feed.version != ''
        except:
            return False
    
    def scrape_website(self, source):
        """
        Scrape content from a regular website.
        
        Args:
            source (dict): Source information dictionary
            
        Returns:
            dict: Extracted content or None if failure
        """
        url = source['url']
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title = soup.title.string if soup.title else url
            
            # Extract main content (prioritize article content)
            content = ''
            article = soup.find('article')
            
            if article:
                # If article tag exists, use it as main content source
                for paragraph in article.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                    content += paragraph.get_text() + '\n'
            else:
                # Otherwise extract from main content elements
                main_content = soup.find(['main', 'div#content', 'div.content', 'div#main', 'div.main'])
                
                if main_content:
                    for paragraph in main_content.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                        content += paragraph.get_text() + '\n'
                else:
                    # Fallback to all paragraphs
                    for paragraph in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
                        content += paragraph.get_text() + '\n'
            
            # Generate a summary if content is too long
            summary = content[:500] + '...' if len(content) > 500 else content
            
            return {
                'id': hash(url + title),
                'title': title,
                'source': source['name'],
                'url': url,
                'content': content[:10000],  # Limit content length
                'summary': summary,
                'date': datetime.now().isoformat(),
                'type': 'web',
                'category': source.get('category', 'General')
            }
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return None
    
    def parse_rss_feed(self, source):
        """
        Parse content from an RSS feed.
        
        Args:
            source (dict): Source information dictionary
            
        Returns:
            list: List of content items or empty list if failure
        """
        url = source['url']
        try:
            feed = feedparser.parse(url)
            results = []
            
            for entry in feed.entries[:10]:  # Get up to 10 recent entries
                content = entry.get('content', [{}])[0].get('value', '') if 'content' in entry else ''
                if not content and 'summary' in entry:
                    content = entry.get('summary', '')
                if not content and 'description' in entry:
                    content = entry.get('description', '')
                
                # Generate a summary
                summary = content[:500] + '...' if len(content) > 500 else content
                
                # Parse date
                published = entry.get('published', '')
                try:
                    if published:
                        dt = datetime(*entry.published_parsed[:6])
                        published = dt.isoformat()
                except:
                    published = datetime.now().isoformat()
                
                results.append({
                    'id': hash(entry.get('link', '') + entry.get('title', '')),
                    'title': entry.get('title', 'No title'),
                    'source': source['name'],
                    'url': entry.get('link', url),
                    'content': content,
                    'summary': summary,
                    'date': published,
                    'type': 'rss',
                    'category': source.get('category', 'General')
                })
                
            return results
        except Exception as e:
            print(f"Error parsing RSS feed {url}: {e}")
            return []
            
    def score_relevance(self, content, user_interests=None):
        """
        Score content relevance on a 1-10 scale.
        
        Args:
            content (dict): Content item to score
            user_interests (list): List of user interest keywords
            
        Returns:
            int: Relevance score from 1-10
        """
        # Default interests if none provided
        if user_interests is None or not user_interests:
            user_interests = ['technology', 'AI', 'machine learning', 'data', 'business', 'leadership', 'professional']
            
        score = 5  # Default mid-range score
        
        # Combine title and content for analysis
        text = f"{content.get('title', '')} {content.get('summary', '')}"
        
        # Count matches of interest keywords
        matches = sum(1 for interest in user_interests 
                      if re.search(r'\b' + re.escape(interest.lower()) + r'\b', text.lower()))
        
        # Date recency bonus
        try:
            pub_date = datetime.fromisoformat(content.get('date', datetime.now().isoformat()))
            days_old = (datetime.now() - pub_date).days
            recency_bonus = max(0, 2 - (days_old / 7))  # Up to 2 points for very recent content
        except:
            recency_bonus = 0
        
        # Calculate final score
        score = min(10, 5 + (matches * 1.5) + recency_bonus)
        
        return round(score)
        
    def _get_mock_content(self, user_interests=None):
        """
        Generate mock content for testing when real scraping is unavailable
        
        Args:
            user_interests (list): List of interests to filter content
            
        Returns:
            list: Mock content with relevance scores
        """
        mock_articles = [
            {
                'id': 1001,
                'title': 'The Future of AI in Business Transformation',
                'source': 'Harvard Business Review',
                'url': 'https://hbr.org/2023/ai-business-transformation',
                'content': """Artificial intelligence is reshaping business operations across industries. This article explores how AI is being used to transform decision-making processes, customer experiences, and operational efficiency.
                
Many organizations are still in the early stages of AI adoption, focusing on specific use cases rather than enterprise-wide transformation. However, leading companies are beginning to integrate AI capabilities into their core business processes.
                
The most successful implementations share several characteristics: clear business objectives, cross-functional teams, robust data infrastructure, and a commitment to ethical AI principles.
                
Leaders should focus on building AI literacy throughout their organizations, establishing governance frameworks, and creating a culture that embraces both the opportunities and responsibilities of AI-powered innovation.""",
                'summary': 'Artificial intelligence is reshaping business operations across industries. This article explores how AI is being used to transform decision-making processes, customer experiences, and operational efficiency...',
                'date': (datetime.now() - timedelta(days=2)).isoformat(),
                'type': 'web',
                'category': 'business',
                'topics': ['AI', 'digital transformation', 'leadership', 'innovation'],
                'relevance_score': 8.7 if user_interests and any(i in ['AI', 'technology', 'business'] for i in user_interests) else 6.5
            },
            {
                'id': 1002,
                'title': 'How to Build a Data-Driven Culture',
                'source': 'Forbes',
                'url': 'https://www.forbes.com/data-driven-culture-2023',
                'content': """In today's competitive landscape, building a data-driven culture is no longer optional. Organizations that effectively leverage data for decision-making consistently outperform those that rely primarily on intuition or experience.
                
This article outlines the five key components of a successful data-driven culture: leadership commitment, data literacy, accessible tools, defined processes, and continuous improvement.
                
Case studies from industries including finance, healthcare, and retail demonstrate that the path to data-driven decision making is not just about technology investments but requires fundamental shifts in organizational mindset.
                
Practical steps for leaders include setting clear data goals, investing in training, celebrating data-driven successes, and modeling the behaviors they wish to see throughout the organization.""",
                'summary': 'In today\'s competitive landscape, building a data-driven culture is no longer optional. Organizations that effectively leverage data for decision-making consistently outperform those that rely primarily on intuition or experience...',
                'date': (datetime.now() - timedelta(days=3)).isoformat(),
                'type': 'web',
                'category': 'business',
                'topics': ['data analytics', 'organizational culture', 'leadership', 'decision making'],
                'relevance_score': 7.8 if user_interests and any(i in ['data', 'analytics', 'business'] for i in user_interests) else 5.9
            },
            {
                'id': 1003,
                'title': 'The Rise of Remote-First Software Development Teams',
                'source': 'TechCrunch',
                'url': 'https://techcrunch.com/2023/remote-first-development',
                'content': """Software development teams are increasingly adopting remote-first approaches, even as some companies push for returns to office. This shift represents more than just a response to the pandemic—it's becoming a competitive advantage in talent acquisition and retention.
                
Companies embracing remote-first development report benefits including access to global talent pools, increased developer productivity, and higher retention rates. However, these advantages come with challenges in communication, collaboration, and building team cohesion.
                
Successful remote-first teams are implementing asynchronous communication practices, investing in robust documentation, leveraging collaborative tools beyond video meetings, and developing new approaches to mentorship and knowledge sharing.
                
The article highlights specific practices from companies including GitLab, Zapier, and Automattic that have built successful remote development cultures.""",
                'summary': 'Software development teams are increasingly adopting remote-first approaches, even as some companies push for returns to office. This shift represents more than just a response to the pandemic—it\'s becoming a competitive advantage in talent acquisition and retention...',
                'date': datetime.now().isoformat(),
                'type': 'web',
                'category': 'technology',
                'topics': ['software development', 'remote work', 'engineering culture', 'productivity'],
                'relevance_score': 9.2 if user_interests and any(i in ['technology', 'software', 'remote work'] for i in user_interests) else 7.3
            },
            {
                'id': 1004,
                'title': 'Quantum Computing Reaches Commercial Viability Milestone',
                'source': 'Wired',
                'url': 'https://www.wired.com/quantum-computing-milestone-2023',
                'content': """Quantum computing has reached a significant milestone as researchers demonstrate the first error-corrected quantum operations that exceed the performance of classical computers for commercially relevant problems.
                
While quantum supremacy—where quantum computers outperform classical ones on specific tasks—has been achieved before, this marks the first time that quantum advantages have been demonstrated on problems with direct business applications in optimization and materials science.
                
The breakthrough comes from advances in both hardware stability and error correction algorithms, allowing quantum systems to maintain coherence long enough to solve complex problems that would take classical computers days or weeks.
                
Industry leaders including IBM, Google, and several startups are now racing to scale these systems and develop accessible programming interfaces that will allow more companies to begin exploring quantum applications.""",
                'summary': 'Quantum computing has reached a significant milestone as researchers demonstrate the first error-corrected quantum operations that exceed the performance of classical computers for commercially relevant problems...',
                'date': (datetime.now() - timedelta(days=1)).isoformat(),
                'type': 'web',
                'category': 'technology',
                'topics': ['quantum computing', 'technology breakthroughs', 'research', 'computing'],
                'relevance_score': 8.5 if user_interests and any(i in ['quantum', 'computing', 'technology'] for i in user_interests) else 6.8
            },
            {
                'id': 1005,
                'title': 'Sustainable Supply Chain Strategies for Modern Businesses',
                'source': 'Harvard Business Review',
                'url': 'https://hbr.org/2023/sustainable-supply-chains',
                'content': """Sustainability is becoming a central concern in supply chain management, driven by consumer demand, regulatory pressure, and the growing recognition of climate-related business risks.
                
This article examines how leading companies are transforming their supply chains to reduce environmental impact while maintaining operational performance. Key strategies include supplier collaboration, materials innovation, logistics optimization, and circular economy initiatives.
                
Case studies from consumer goods, manufacturing, and technology sectors demonstrate that sustainability improvements can also drive cost reductions, enhance resilience, and create brand differentiation.
                
The most advanced organizations are moving beyond incremental improvements to fundamentally reimagining their supply networks, product designs, and customer relationships through a sustainability lens.""",
                'summary': 'Sustainability is becoming a central concern in supply chain management, driven by consumer demand, regulatory pressure, and the growing recognition of climate-related business risks...',
                'date': (datetime.now() - timedelta(days=5)).isoformat(),
                'type': 'web',
                'category': 'business',
                'topics': ['sustainability', 'supply chain', 'operations', 'environment'],
                'relevance_score': 7.9 if user_interests and any(i in ['sustainability', 'business', 'operations'] for i in user_interests) else 6.2
            }
        ]
        
        # Filter by user interests if provided
        if user_interests:
            filtered_articles = []
            for article in mock_articles:
                # Calculate simple relevance based on matching topics
                topic_matches = sum(topic.lower() in [i.lower() for i in user_interests] for topic in article['topics'])
                if topic_matches > 0 or article['relevance_score'] > 7.0:
                    filtered_articles.append(article)
            return filtered_articles if filtered_articles else mock_articles[:3]
        
        return mock_articles
        
    def fetch_content(self, user_interests=None):
        """
        Fetch content from monitored sources, optionally filtered by user interests.
        
        Args:
            user_interests (list): List of interests to filter content
            
        Returns:
            list: Relevant content from monitored sources
        """
        # Use mock data if in mock mode
        if self.mock_mode:
            return self._get_mock_content(user_interests)
        
        results = []
        
        for source in self.sources:
            if source.get('active', True) and self.should_check(source):
                if 'rss_url' in source and source['rss_url']:
                    # Process RSS feed
                    items = self.parse_rss_feed(source)
                    if items:
                        results.extend(items)
                else:
                    # Process regular website
                    content = self.scrape_website(source)
                    if content:
                        results.append(content)
                        
                # Update last check time
                self.last_check[source['url']] = datetime.now()
                
                # Cache the results for this source
                self.content_cache[source['url']] = [item for item in results if item.get('source') == source['name']]
                
        # Sort by relevance
        results.sort(key=lambda x: x.get('relevance', 0), reverse=True)
        
        return results[:20]  # Return top 20 most relevant items
