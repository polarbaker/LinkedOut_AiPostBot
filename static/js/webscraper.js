/**
 * Enhanced Web Scraper for LinkedIn Post Generator
 * This module handles web scraping of articles from monitored sources
 */

class WebScraper {
  constructor() {
    // Cache to store scraped content
    this.cache = {
      articles: {},
      lastScraped: {}
    };
    
    // Cache duration in milliseconds (default: 30 minutes)
    this.cacheDuration = 30 * 60 * 1000;
    
    // User preference settings
    this.settings = {
      maxArticlesPerSource: 5,
      minArticleLength: 300,
      relevanceThreshold: 0.5,
      excludedTerms: [],
      requiredTerms: [],
      maxAgeDays: 7
    };
    
    // Load settings from localStorage if available
    this.loadSettings();
  }
  
  /**
   * Load user settings from localStorage
   */
  loadSettings() {
    const savedSettings = localStorage.getItem('scraperSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.settings = { ...this.settings, ...parsed };
      } catch (e) {
        console.error('Error loading scraper settings:', e);
      }
    }
  }
  
  /**
   * Save user settings to localStorage
   */
  saveSettings() {
    localStorage.setItem('scraperSettings', JSON.stringify(this.settings));
  }
  
  /**
   * Update scraper settings
   * @param {Object} newSettings - New settings to apply
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }
  
  /**
   * Fetch articles from a source
   * @param {Object} source - The source to fetch articles from
   * @param {boolean} forceRefresh - Whether to bypass cache
   * @returns {Promise<Array>} - Array of articles
   */
  async fetchArticles(source, forceRefresh = false) {
    const { id, rssUrl, url, name, category } = source;
    
    // Check cache if not forcing refresh
    if (!forceRefresh && this.isCacheValid(id)) {
      console.log(`Using cached content for ${name}`);
      return this.cache.articles[id];
    }
    
    try {
      console.log(`Fetching fresh content from ${name}`);
      let articles = [];
      
      // Try RSS feed first as it's more structured and efficient
      if (rssUrl) {
        articles = await this.fetchFromRSS(rssUrl);
      }
      
      // If RSS failed or returned no results, try direct web scraping
      if (!articles || articles.length === 0) {
        articles = await this.scrapeWebsite(url);
      }
      
      // Process and filter articles
      const processedArticles = this.processArticles(articles, source);
      
      // Update cache
      this.cache.articles[id] = processedArticles;
      this.cache.lastScraped[id] = Date.now();
      
      return processedArticles;
    } catch (error) {
      console.error(`Error fetching articles from ${name}:`, error);
      throw error;
    }
  }
  
  /**
   * Check if cached content is still valid
   * @param {string} sourceId - ID of the source
   * @returns {boolean} - Whether cache is valid
   */
  isCacheValid(sourceId) {
    const lastScraped = this.cache.lastScraped[sourceId];
    if (!lastScraped) return false;
    
    const now = Date.now();
    return (now - lastScraped) < this.cacheDuration;
  }
  
  /**
   * Fetch articles from RSS feed
   * @param {string} rssUrl - URL of the RSS feed
   * @returns {Promise<Array>} - Array of articles
   */
  async fetchFromRSS(rssUrl) {
    try {
      const response = await fetch(`/api/proxy-rss?url=${encodeURIComponent(rssUrl)}`);
      if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
      
      const data = await response.json();
      
      // Convert RSS items to our article format
      return data.items.map(item => ({
        title: item.title,
        link: item.link,
        content: item.content || item.contentSnippet || '',
        summary: item.contentSnippet || '',
        image: this.extractImageFromItem(item),
        pubDate: new Date(item.pubDate || Date.now()),
        author: item.creator || item.author || 'Unknown'
      }));
    } catch (error) {
      console.error('Error fetching from RSS:', error);
      return [];
    }
  }
  
  /**
   * Extract image URL from RSS item
   * @param {Object} item - RSS item
   * @returns {string|null} - Image URL or null
   */
  extractImageFromItem(item) {
    // Check for media:content
    if (item.media && item.media.content && item.media.content.url) {
      return item.media.content.url;
    }
    
    // Check for enclosures
    if (item.enclosures && item.enclosures.length > 0) {
      const imageEnclosure = item.enclosures.find(e => e.type && e.type.startsWith('image/'));
      if (imageEnclosure) return imageEnclosure.url;
    }
    
    // Try to extract from content
    if (item.content) {
      const imgMatch = /<img[^>]+src="([^">]+)"/.exec(item.content);
      if (imgMatch && imgMatch[1]) return imgMatch[1];
    }
    
    return null;
  }
  
  /**
   * Scrape articles directly from a website
   * @param {string} url - URL of the website
   * @returns {Promise<Array>} - Array of articles
   */
  async scrapeWebsite(url) {
    try {
      const response = await fetch(`/api/scrape-site?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`Website scrape failed: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error scraping website:', error);
      return [];
    }
  }
  
  /**
   * Process and filter articles based on relevance
   * @param {Array} articles - Raw articles
   * @param {Object} source - Source information
   * @returns {Array} - Processed articles
   */
  processArticles(articles, source) {
    const { category } = source;
    const { maxArticlesPerSource, minArticleLength, relevanceThreshold, excludedTerms, requiredTerms, maxAgeDays } = this.settings;
    
    return articles
      // Filter by content length
      .filter(article => !article.content || article.content.length >= minArticleLength)
      
      // Filter by age
      .filter(article => {
        const pubDate = new Date(article.pubDate);
        const now = new Date();
        const diffTime = Math.abs(now - pubDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= maxAgeDays;
      })
      
      // Filter by excluded terms
      .filter(article => {
        if (excludedTerms.length === 0) return true;
        const content = (article.title + ' ' + article.summary).toLowerCase();
        return !excludedTerms.some(term => content.includes(term.toLowerCase()));
      })
      
      // Filter by required terms
      .filter(article => {
        if (requiredTerms.length === 0) return true;
        const content = (article.title + ' ' + article.summary).toLowerCase();
        return requiredTerms.some(term => content.includes(term.toLowerCase()));
      })
      
      // Calculate relevance score
      .map(article => ({
        ...article,
        relevanceScore: this.calculateRelevanceScore(article, category),
        sourceCategory: category
      }))
      
      // Filter by relevance threshold
      .filter(article => article.relevanceScore >= relevanceThreshold)
      
      // Sort by relevance score (descending)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      
      // Limit number of articles
      .slice(0, maxArticlesPerSource);
  }
  
  /**
   * Calculate relevance score for an article
   * @param {Object} article - The article
   * @param {string} category - The source category
   * @returns {number} - Relevance score (0-1)
   */
  calculateRelevanceScore(article, category) {
    // Start with base score
    let score = 0.5;
    
    // Factors to consider for relevance scoring
    const factors = {
      // More recent articles get higher score
      recency: () => {
        const pubDate = new Date(article.pubDate);
        const now = new Date();
        const diffHours = Math.abs(now - pubDate) / (1000 * 60 * 60);
        return Math.max(0, 1 - (diffHours / (24 * this.settings.maxAgeDays)));
      },
      
      // Longer articles might be more substantial
      contentLength: () => {
        const length = article.content ? article.content.length : 0;
        const idealLength = 3000; // Characters
        return Math.min(1, length / idealLength);
      },
      
      // Category relevance
      categoryMatch: () => {
        if (!category) return 0.5;
        
        const categoryTerms = category.toLowerCase().split(/[,\s]+/);
        const content = (article.title + ' ' + article.summary).toLowerCase();
        
        // Count category term occurrences
        let matches = 0;
        categoryTerms.forEach(term => {
          if (term.length > 3 && content.includes(term)) {
            matches++;
          }
        });
        
        return Math.min(1, matches / categoryTerms.length);
      },
      
      // Title quality (avoid clickbait)
      titleQuality: () => {
        const title = article.title || '';
        
        // Penalize all-caps titles
        if (title === title.toUpperCase()) return 0.3;
        
        // Penalize titles with excessive punctuation
        const excessivePunctuation = (title.match(/[!?]/g) || []).length > 2;
        if (excessivePunctuation) return 0.5;
        
        return 0.8;
      }
    };
    
    // Calculate weighted score
    const weights = {
      recency: 0.4,
      contentLength: 0.2,
      categoryMatch: 0.3,
      titleQuality: 0.1
    };
    
    let totalWeight = 0;
    let weightedScore = 0;
    
    for (const [factor, weight] of Object.entries(weights)) {
      if (factors[factor]) {
        const factorScore = factors[factor]();
        weightedScore += factorScore * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? weightedScore / totalWeight : 0.5;
  }
  
  /**
   * Get all articles from monitored sources
   * @param {Array} sources - List of monitored sources
   * @param {boolean} forceRefresh - Whether to bypass cache
   * @returns {Promise<Array>} - Combined articles
   */
  async getAllArticles(sources, forceRefresh = false) {
    const activeSourcesOnly = sources.filter(source => source.active !== false);
    
    // Fetch articles from all sources in parallel
    const articlesPromises = activeSourcesOnly.map(source => 
      this.fetchArticles(source, forceRefresh)
        .catch(error => {
          console.error(`Error fetching from ${source.name}:`, error);
          return []; // Return empty array on error
        })
    );
    
    const articlesArrays = await Promise.all(articlesPromises);
    
    // Flatten and combine all articles
    return articlesArrays
      .flat()
      // Filter duplicate articles by URL
      .filter((article, index, self) => 
        index === self.findIndex(a => a.link === article.link)
      )
      // Sort by relevance score (descending)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  /**
   * Create a scraper settings UI
   * @param {HTMLElement} container - Container element
   */
  createSettingsUI(container) {
    const settings = this.settings;
    
    // Create form
    const form = document.createElement('form');
    form.className = 'settings-form';
    form.innerHTML = `
      <h3>Web Scraper Settings</h3>
      <div class="form-group">
        <label for="maxArticlesPerSource">Max Articles Per Source</label>
        <input type="number" id="maxArticlesPerSource" min="1" max="20" value="${settings.maxArticlesPerSource}">
      </div>
      <div class="form-group">
        <label for="minArticleLength">Min Article Length (chars)</label>
        <input type="number" id="minArticleLength" min="100" max="1000" step="50" value="${settings.minArticleLength}">
      </div>
      <div class="form-group">
        <label for="relevanceThreshold">Relevance Threshold (0-1)</label>
        <input type="range" id="relevanceThreshold" min="0" max="1" step="0.1" value="${settings.relevanceThreshold}">
        <span id="relevanceValue">${settings.relevanceThreshold}</span>
      </div>
      <div class="form-group">
        <label for="maxAgeDays">Max Article Age (days)</label>
        <input type="number" id="maxAgeDays" min="1" max="30" value="${settings.maxAgeDays}">
      </div>
      <div class="form-group">
        <label for="excludedTerms">Excluded Terms (comma separated)</label>
        <input type="text" id="excludedTerms" value="${settings.excludedTerms.join(', ')}">
      </div>
      <div class="form-group">
        <label for="requiredTerms">Required Terms (comma separated)</label>
        <input type="text" id="requiredTerms" value="${settings.requiredTerms.join(', ')}">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn--primary">Save Settings</button>
      </div>
    `;
    
    // Add event listeners
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Update settings
      this.updateSettings({
        maxArticlesPerSource: parseInt(form.querySelector('#maxArticlesPerSource').value, 10),
        minArticleLength: parseInt(form.querySelector('#minArticleLength').value, 10),
        relevanceThreshold: parseFloat(form.querySelector('#relevanceThreshold').value),
        maxAgeDays: parseInt(form.querySelector('#maxAgeDays').value, 10),
        excludedTerms: form.querySelector('#excludedTerms').value.split(',').map(t => t.trim()).filter(Boolean),
        requiredTerms: form.querySelector('#requiredTerms').value.split(',').map(t => t.trim()).filter(Boolean)
      });
      
      // Show success message
      const message = document.createElement('div');
      message.className = 'success-message';
      message.textContent = 'Settings saved!';
      form.appendChild(message);
      
      // Remove message after a while
      setTimeout(() => message.remove(), 3000);
    });
    
    // Update relevance value display
    const relevanceSlider = form.querySelector('#relevanceThreshold');
    const relevanceValue = form.querySelector('#relevanceValue');
    relevanceSlider.addEventListener('input', () => {
      relevanceValue.textContent = relevanceSlider.value;
    });
    
    // Add form to container
    container.appendChild(form);
  }
}

// Export WebScraper class
window.WebScraper = WebScraper;
