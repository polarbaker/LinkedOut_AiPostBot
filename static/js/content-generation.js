/**
 * Enhanced Content Generation Module
 * Handles article selection, post creation, and content generation
 */
class ContentGenerationManager {
  constructor(apiConnector) {
    this.apiConnector = apiConnector;
    this.selectedArticle = null;
    this.articles = [];
    this.postFormats = {
      insight: { label: "Professional Insight", description: "Share professional analysis on the article topic" },
      question: { label: "Thought-Provoking Question", description: "Pose an engaging question related to the article" },
      story: { label: "Personal Story", description: "Connect the article to a relevant personal experience" },
      tips: { label: "Practical Tips", description: "Provide actionable advice based on article content" },
      news: { label: "Breaking News", description: "Announce the news with your expert commentary" }
    };
    this.tones = {
      professional: "Maintains a formal, knowledgeable tone",
      conversational: "Friendly and approachable language",
      enthusiastic: "Energetic and passionate perspective",
      thoughtful: "Reflective and contemplative style",
      authoritative: "Confident and expert positioning"
    };
    
    this.initElements();
    this.setupEventListeners();
  }
  
  initElements() {
    // Article selection elements
    this.articlesListElement = document.getElementById('contentArticlesList');
    this.sourceFilterElement = document.getElementById('sourceFilter');
    this.categoryFilterElement = document.getElementById('categoryContentFilter');
    this.searchInputElement = document.getElementById('contentSearch');
    this.refreshButtonElement = document.getElementById('refreshContentSources');
    
    // Selected article elements
    this.selectedArticlePreviewElement = document.getElementById('selectedArticlePreview');
    
    // Post creation elements
    this.postFormatSelectElement = document.getElementById('postFormatSelect');
    this.postToneSelectElement = document.getElementById('postToneSelect');
    this.keyPointsInputElement = document.getElementById('keyPointsInput');
    this.postContentElement = document.getElementById('postContent');
    this.currentCharsElement = document.getElementById('currentChars');
    this.maxCharsElement = document.getElementById('maxChars');
    this.hashtagCountElement = document.getElementById('hashtagCount');
    this.generatePostBtnElement = document.getElementById('generatePostBtn');
    this.regenerateBtnElement = document.getElementById('regenerateBtn');
    this.saveAsDraftBtnElement = document.getElementById('saveAsDraftBtn');
    this.addToQueueBtnElement = document.getElementById('addToQueueBtn');
    
    // Engagement score elements
    this.engagementMeterElement = document.querySelector('.meter-fill');
    this.engagementValueElement = document.querySelector('.meter-value');
  }
  
  setupEventListeners() {
    // Article selection listeners
    this.refreshButtonElement.addEventListener('click', () => this.fetchArticles());
    this.sourceFilterElement.addEventListener('change', () => this.filterArticles());
    this.categoryFilterElement.addEventListener('change', () => this.filterArticles());
    this.searchInputElement.addEventListener('input', debounce(() => this.filterArticles(), 300));
    
    // Post creation listeners
    this.postContentElement.addEventListener('input', () => this.updatePostStats());
    this.generatePostBtnElement.addEventListener('click', () => this.generatePost());
    this.regenerateBtnElement.addEventListener('click', () => this.regeneratePost());
    this.saveAsDraftBtnElement.addEventListener('click', () => this.saveAsDraft());
    this.addToQueueBtnElement.addEventListener('click', () => this.addToQueue());
  }
  
  async fetchArticles() {
    this.showLoadingState();
    try {
      // Get selected filters
      const category = this.categoryFilterElement.value;
      const maxArticles = 30; // Configurable
      const forceRefresh = true; // Can be changed to false if needed
      
      // Get user interests from somewhere in your application
      const userInterests = this.getUserInterests();
      
      // Fetch articles using APIConnector
      this.articles = await this.apiConnector.fetchContent({
        interests: userInterests,
        forceRefresh,
        category: category !== 'all' ? category : null,
        maxArticles
      });
      
      this.populateSourceFilter();
      this.renderArticlesList();
      this.hideLoadingState();
    } catch (error) {
      console.error('Error fetching articles:', error);
      this.showError('Failed to fetch articles. Please try again.');
      this.hideLoadingState();
    }
  }
  
  getUserInterests() {
    // This should retrieve interests from wherever they are stored in your app
    // For now, returning some defaults
    return ['technology', 'leadership', 'innovation', 'AI'];
  }
  
  populateSourceFilter() {
    // Clear existing options except the first one (All Sources)
    while (this.sourceFilterElement.options.length > 1) {
      this.sourceFilterElement.options.remove(1);
    }
    
    // Get unique sources from articles
    const sources = [...new Set(this.articles.map(article => article.source))];
    
    // Add options for each source
    sources.forEach(source => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      this.sourceFilterElement.appendChild(option);
    });
  }
  
  filterArticles() {
    const sourceFilter = this.sourceFilterElement.value;
    const categoryFilter = this.categoryFilterElement.value;
    const searchTerm = this.searchInputElement.value.toLowerCase().trim();
    
    // Apply filters
    const filteredArticles = this.articles.filter(article => {
      const matchesSource = sourceFilter === 'all' || article.source === sourceFilter;
      const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
      const matchesSearch = !searchTerm || 
        article.title.toLowerCase().includes(searchTerm) || 
        article.summary.toLowerCase().includes(searchTerm);
      
      return matchesSource && matchesCategory && matchesSearch;
    });
    
    this.renderArticlesList(filteredArticles);
  }
  
  renderArticlesList(articles = this.articles) {
    // Clear existing articles
    this.articlesListElement.innerHTML = '';
    
    if (articles.length === 0) {
      this.articlesListElement.innerHTML = `
        <div class="empty-state">
          <p>No articles found matching your filters</p>
          <button class="btn btn--outline btn--sm" id="resetFiltersBtn">Reset Filters</button>
        </div>
      `;
      document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        this.sourceFilterElement.value = 'all';
        this.categoryFilterElement.value = 'all';
        this.searchInputElement.value = '';
        this.filterArticles();
      });
      return;
    }
    
    // Render each article
    articles.forEach(article => {
      const articleElement = document.createElement('div');
      articleElement.className = 'article-list-item';
      if (this.selectedArticle && this.selectedArticle.id === article.id) {
        articleElement.classList.add('selected');
      }
      
      articleElement.innerHTML = `
        <div class="article-list-title">${article.title}</div>
        <div class="article-list-meta">
          <span>${article.source}</span>
          <span>${this.formatDate(article.date)}</span>
        </div>
      `;
      
      articleElement.addEventListener('click', () => this.selectArticle(article));
      this.articlesListElement.appendChild(articleElement);
    });
  }
  
  selectArticle(article) {
    this.selectedArticle = article;
    
    // Update UI to show selected article in the list
    const articleItems = this.articlesListElement.querySelectorAll('.article-list-item');
    articleItems.forEach(item => item.classList.remove('selected'));
    
    const selectedItem = Array.from(articleItems).find(
      item => item.querySelector('.article-list-title').textContent === article.title
    );
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
    
    // Update the article preview
    this.selectedArticlePreviewElement.innerHTML = `
      <div class="selected-article-title">${article.title}</div>
      <div class="selected-article-source">
        <strong>Source:</strong> ${article.source} | 
        <strong>Published:</strong> ${this.formatDate(article.date)}
      </div>
      <div class="selected-article-summary">${article.summary}</div>
      <div class="article-keywords">
        <strong>Keywords:</strong> ${article.keywords?.join(', ') || 'Not available'}
      </div>
    `;
    
    // Calculate and update engagement score based on article relevance
    this.updateEngagementScore(article.relevance || 5);
    
    // Clear any existing generated post
    this.postContentElement.value = '';
    this.updatePostStats();
    
    // Enable the generate button
    this.generatePostBtnElement.disabled = false;
  }
  
  updateEngagementScore(relevance) {
    // Map relevance score (typically 0-10) to engagement score
    const engagementScore = Math.min(Math.max(relevance, 0), 10) / 10 * 100;
    
    // Update the UI
    this.engagementMeterElement.style.width = `${engagementScore}%`;
    this.engagementValueElement.textContent = (relevance / 10 * 10).toFixed(1);
    
    // Add color coding based on score
    this.engagementMeterElement.classList.remove('low', 'medium', 'high');
    if (relevance < 5) {
      this.engagementMeterElement.classList.add('low');
    } else if (relevance < 8) {
      this.engagementMeterElement.classList.add('medium');
    } else {
      this.engagementMeterElement.classList.add('high');
    }
  }
  
  async generatePost() {
    if (!this.selectedArticle) {
      this.showError('Please select an article first');
      return;
    }
    
    this.setGeneratingState(true);
    
    try {
      const postFormat = this.postFormatSelectElement.value;
      const postTone = this.postToneSelectElement.value;
      const keyPoints = this.keyPointsInputElement.value.trim();
      
      // Call API to generate content
      const generatedContent = await this.apiConnector.generateContent({
        articleId: this.selectedArticle.id,
        article: this.selectedArticle,
        format: postFormat,
        tone: postTone,
        keyPoints: keyPoints ? keyPoints.split(',').map(p => p.trim()) : [],
      });
      
      // Update the post content
      this.postContentElement.value = generatedContent.post || '';
      this.updatePostStats();
      
      // Scroll to post editor
      this.postContentElement.scrollIntoView({ behavior: 'smooth' });
      this.postContentElement.focus();
    } catch (error) {
      console.error('Error generating post:', error);
      this.showError('Failed to generate post. Please try again.');
    } finally {
      this.setGeneratingState(false);
    }
  }
  
  regeneratePost() {
    // Simply call the generate function again with current settings
    this.generatePost();
  }
  
  saveAsDraft() {
    const postContent = this.postContentElement.value.trim();
    if (!postContent) {
      this.showError('Cannot save empty post as draft');
      return;
    }
    
    try {
      // Logic to save as draft - this depends on your application's storage mechanism
      const draft = {
        id: Date.now(),
        content: postContent,
        article: this.selectedArticle,
        createdAt: new Date().toISOString()
      };
      
      // Store in localStorage for example
      const drafts = JSON.parse(localStorage.getItem('postDrafts') || '[]');
      drafts.push(draft);
      localStorage.setItem('postDrafts', JSON.stringify(drafts));
      
      // Show success message
      this.showSuccess('Post saved as draft');
    } catch (error) {
      console.error('Error saving draft:', error);
      this.showError('Failed to save draft');
    }
  }
  
  addToQueue() {
    const postContent = this.postContentElement.value.trim();
    if (!postContent) {
      this.showError('Cannot schedule empty post');
      return;
    }
    
    // This would typically open a scheduling modal/dialog
    // For now, we'll just log it as a demonstration
    console.log('Post added to scheduling queue:', {
      content: postContent,
      article: this.selectedArticle,
      scheduledAt: null // Would be set by user in a real implementation
    });
    
    this.showSuccess('Post added to scheduling queue');
  }
  
  updatePostStats() {
    const content = this.postContentElement.value;
    
    // Update character count
    const charCount = content.length;
    this.currentCharsElement.textContent = charCount;
    
    // Highlight if over limit
    const maxChars = parseInt(this.maxCharsElement.textContent);
    if (charCount > maxChars) {
      this.currentCharsElement.classList.add('over-limit');
    } else {
      this.currentCharsElement.classList.remove('over-limit');
    }
    
    // Count hashtags
    const hashtagCount = (content.match(/#[a-zA-Z0-9_]+/g) || []).length;
    this.hashtagCountElement.textContent = hashtagCount;
  }
  
  setGeneratingState(isGenerating) {
    if (isGenerating) {
      this.generatePostBtnElement.disabled = true;
      this.generatePostBtnElement.innerHTML = '<span class="spinner"></span> Generating...';
    } else {
      this.generatePostBtnElement.disabled = false;
      this.generatePostBtnElement.innerHTML = '<span class="icon">✨</span> Generate Post';
    }
  }
  
  showLoadingState() {
    this.articlesListElement.innerHTML = `
      <div class="article-list-item article-skeleton" aria-hidden="true">
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
      </div>
      <div class="article-list-item article-skeleton" aria-hidden="true">
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
      </div>
      <div class="article-list-item article-skeleton" aria-hidden="true">
        <div class="skeleton-title"></div>
        <div class="skeleton-subtitle"></div>
      </div>
    `;
    this.refreshButtonElement.disabled = true;
  }
  
  hideLoadingState() {
    this.refreshButtonElement.disabled = false;
  }
  
  showError(message) {
    // Implement error notification
    console.error(message);
    // This would typically use a toast or notification system
    alert(message); // Simple fallback
  }
  
  showSuccess(message) {
    // Implement success notification
    console.log(message);
    // This would typically use a toast or notification system
    alert(message); // Simple fallback
  }
  
  formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

// Helper function for debouncing
function debounce(func, delay) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// Initialize the module when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get API connector instance
  const api = window.API || new APIConnector();
  
  // Initialize content generation manager
  const contentManager = new ContentGenerationManager(api);
  
  // Fetch initial articles (or wait for user to click refresh)
  // contentManager.fetchArticles();
  
  // Store in global scope for debugging
  window.contentManager = contentManager;
});
