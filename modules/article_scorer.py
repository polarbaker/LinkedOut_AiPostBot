"""
Article Scoring Module for Enhanced LinkedIn Post Generator
This module handles relevance scoring and filtering of scraped articles.

Updated: June 6, 2025
"""
import re
from datetime import datetime
from typing import Dict, Any, List, Optional

from .config import DEFAULT_ARTICLE_SCORER_CONFIG, _apply_env_overrides

class ArticleScorer:
    """
    A utility class that handles article relevance scoring and filtering
    to prioritize the most relevant content for users.
    """
    
    def __init__(self, config=None):
        """Initialize the article scorer with configuration
        
        Args:
            config (dict, optional): Configuration override
        """
        # Default configuration from central config
        self.config = DEFAULT_ARTICLE_SCORER_CONFIG.copy()
        # Apply environment variable overrides
        self.config = _apply_env_overrides(self.config, "SCORER")
        
        # Override with provided config
        if config:
            self.config.update(config)
    
    def process_articles(self, articles: List[Dict[str, Any]], source_category: str = '') -> List[Dict[str, Any]]:
        """Process articles: filter, score, rank, and limit
        
        Args:
            articles (list): Raw articles to process
            source_category (str): Category of the source
            
        Returns:
            list: Processed and ranked articles
        """
        if not articles:
            return []
            
        processed = []
        now = datetime.now()
        
        for article in articles:
            # Skip if article has no content or title
            if not article.get('title') or not article.get('content'):
                continue
                
            # Check publication date
            try:
                pub_date = datetime.fromisoformat(article.get('pub_date', now.isoformat()))
                age_days = (now - pub_date).days
                if age_days > self.config['max_article_age']:
                    continue
            except (ValueError, TypeError):
                # Default to current time if date parsing fails
                article['pub_date'] = now.isoformat()
                
            # Filter by excluded terms
            if self.config['excluded_terms']:
                content = (article['title'] + ' ' + article.get('summary', '')).lower()
                if any(term.lower() in content for term in self.config['excluded_terms']):
                    continue
                    
            # Filter by required terms (if any)
            if self.config['required_terms']:
                content = (article['title'] + ' ' + article.get('summary', '')).lower()
                if not any(term.lower() in content for term in self.config['required_terms']):
                    continue
            
            # Calculate relevance score
            relevance_score = self.calculate_relevance_score(article, source_category)
            if relevance_score < self.config['relevance_threshold']:
                continue
                
            # Add relevance score to article
            article['relevance_score'] = relevance_score
            
            # Add to processed articles
            processed.append(article)
            
        # Sort by relevance score (descending)
        processed.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Limit to max articles
        return processed[:self.config['max_articles_per_source']]
    
    def calculate_relevance_score(self, article: Dict[str, Any], category: str) -> float:
        """Calculate relevance score for an article
        
        Args:
            article (dict): Article to score
            category (str): Source category
            
        Returns:
            float: Relevance score (0-1)
        """
        # Start with base score
        score = 0.5
        
        # Scoring factors
        factors = {}
        
        # 1. Recency factor (newer articles score higher)
        try:
            pub_date = datetime.fromisoformat(article.get('pub_date', ''))
            now = datetime.now()
            age_hours = (now - pub_date).total_seconds() / 3600
            age_factor = max(0, 1 - (age_hours / (24 * self.config['max_article_age'])))
            factors['recency'] = age_factor
        except (ValueError, TypeError):
            factors['recency'] = 0.5
            
        # 2. Content length factor
        content = article.get('content', '')
        content_length = len(content)
        ideal_length = 3000  # characters
        length_factor = min(1, content_length / ideal_length)
        factors['content_length'] = length_factor
        
        # 3. Category relevance factor
        if category:
            cat_terms = category.lower().split(',')
            cat_terms = [term.strip() for term in cat_terms if len(term.strip()) > 3]  # Skip short terms
            if cat_terms:
                # Get text to search in
                text = (article.get('title', '') + ' ' + article.get('summary', '')).lower()
                
                # Count matching terms
                matches = sum(1 for term in cat_terms if term in text)
                cat_factor = min(1, matches / len(cat_terms)) if matches > 0 else 0.3
                factors['category_match'] = cat_factor
            else:
                factors['category_match'] = 0.5
        else:
            factors['category_match'] = 0.5
            
        # 4. Title quality factor (penalize clickbait)
        title = article.get('title', '')
        if title:
            # Penalize all-caps titles
            if title == title.upper() and len(title) > 10:
                factors['title_quality'] = 0.3
            # Penalize excessive punctuation
            elif len(re.findall(r'[!?]', title)) > 2:
                factors['title_quality'] = 0.4
            # Penalize very short titles
            elif len(title) < 20:
                factors['title_quality'] = 0.6
            else:
                factors['title_quality'] = 0.9
        else:
            factors['title_quality'] = 0.5
            
        # 5. Boost terms factor
        if self.config['boost_terms']:
            text = (article.get('title', '') + ' ' + article.get('summary', '')).lower()
            boost_matches = sum(1 for term in self.config['boost_terms'] if term.lower() in text)
            if boost_matches > 0:
                factors['boost_terms'] = min(1, 0.5 + (0.1 * boost_matches))
                
        # Calculate weighted average
        weights = self.config['weights']
        
        weighted_sum = 0
        total_weight = 0
        
        for factor, weight in weights.items():
            if factor in factors:
                weighted_sum += factors[factor] * weight
                total_weight += weight
                
        # Normalize
        if total_weight > 0:
            score = weighted_sum / total_weight
            
        return score
    
    def order_articles_by_relevance(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Order articles by relevance score, handling duplicates
        
        Args:
            articles (list): Articles to order
            
        Returns:
            list: Ordered articles with duplicates removed
        """
        if not articles:
            return []
        
        # First, deduplicate articles by URL
        unique_urls = {}
        for article in articles:
            url = article.get('url', '')
            if url:
                # If we have this URL already, keep the one with higher relevance
                if url in unique_urls:
                    if article.get('relevance_score', 0) > unique_urls[url].get('relevance_score', 0):
                        unique_urls[url] = article
                else:
                    unique_urls[url] = article
        
        # Get unique articles
        unique_articles = list(unique_urls.values())
        
        # Sort by relevance score (primary) and date (secondary)
        unique_articles.sort(
            key=lambda x: (
                x.get('relevance_score', 0),
                x.get('pub_date', '2000-01-01')
            ),
            reverse=True
        )
        
        return unique_articles
