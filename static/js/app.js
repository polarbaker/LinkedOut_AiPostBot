// Application Data
// Note: The API object should be defined in api-connector.js and loaded via script tag before this file

// ===== DATA MODELS & STATE =====

/**
 * @typedef {Object} WebsiteSource
 * @property {string} id - Unique identifier
 * @property {string} name - Website name
 * @property {string} url - Website URL
 * @property {string} rssUrl - RSS feed URL
 * @property {string} category - Content category
 * @property {string} frequency - Check frequency
 * @property {Date} lastChecked - Last time the source was checked
 * @property {boolean} active - Whether the source is active
 * @property {number} postsFound - Number of posts found in latest check
 */

/**
 * Application state - centralized data store
 */
const appState = {
  // Website monitoring
  websiteSources: [],
  isSourceFormValid: false,
  currentAction: 'add', // 'add' or 'edit'
  currentEditId: null,
  
  // Content generation and approvals
  approvalQueue: [],
  
  // User related data
  userStyleProfile: null,
  
  // Initialize the application state
  init() {
    // Load website sources from localStorage
    const savedSources = localStorage.getItem('websiteSources');
    if (savedSources) {
      try {
        this.websiteSources = JSON.parse(savedSources);
      } catch (e) {
        console.error('Error loading website sources from localStorage:', e);
        this.websiteSources = [];
      }
    }
    
    // Load user style profile if exists
    const savedProfile = localStorage.getItem('userStyleProfile');
    if (savedProfile) {
      try {
        this.userStyleProfile = JSON.parse(savedProfile);
      } catch (e) {
        console.error('Error loading user style profile from localStorage:', e);
      }
    }
  },
  
  // Save state to localStorage
  saveToStorage() {
    localStorage.setItem('websiteSources', JSON.stringify(this.websiteSources));
    if (this.userStyleProfile) {
      localStorage.setItem('userStyleProfile', JSON.stringify(this.userStyleProfile));
    }
  },
  
  // ===== Website Monitoring Operations =====
  
  /**
   * Add a new website source
   * @param {Object} sourceData - Form data for the new source
   * @returns {string} - ID of the new source
   */
  addWebsiteSource(sourceData) {
    const newSource = {
      id: 'src_' + Date.now(),
      name: sourceData.name,
      url: sourceData.url,
      rssUrl: sourceData.rssUrl,
      category: sourceData.category,
      frequency: sourceData.frequency,
      lastChecked: null,
      active: true,
      postsFound: 0,
      createdAt: new Date().toISOString()
    };
    
    this.websiteSources.push(newSource);
    this.saveToStorage();
    return newSource.id;
  },
  
  /**
   * Update an existing website source
   * @param {string} id - Source ID to update
   * @param {Object} sourceData - New data for the source
   * @returns {boolean} - Success status
   */
  updateWebsiteSource(id, sourceData) {
    const index = this.websiteSources.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.websiteSources[index] = {
      ...this.websiteSources[index],
      name: sourceData.name,
      url: sourceData.url,
      rssUrl: sourceData.rssUrl,
      category: sourceData.category,
      frequency: sourceData.frequency,
      updatedAt: new Date().toISOString()
    };
    
    this.saveToStorage();
    return true;
  },
  
  /**
   * Delete a website source
   * @param {string} id - Source ID to delete
   * @returns {boolean} - Success status
   */
  deleteWebsiteSource(id) {
    const index = this.websiteSources.findIndex(s => s.id === id);
    if (index === -1) return false;
    
    this.websiteSources.splice(index, 1);
    this.saveToStorage();
    return true;
  },
  
  /**
   * Toggle active status of a website source
   * @param {string} id - Source ID to toggle
   * @returns {boolean} - New active status
   */
  toggleWebsiteSourceStatus(id) {
    const index = this.websiteSources.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    this.websiteSources[index].active = !this.websiteSources[index].active;
    this.saveToStorage();
    return this.websiteSources[index].active;
  },
  
  // ===== Content Generation Operations =====
  
  /**
   * Save a generated post to the approval queue
   * @param {Object} post - Generated post data
   * @returns {string} - ID of the new post
   */
  addToApprovalQueue(post) {
    if (!this.approvalQueue) {
      this.approvalQueue = [];
    }
    
    const newPost = {
      id: 'post_' + Date.now(),
      content: post.content,
      source: post.source || 'Manual Input',
      url: post.url || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      engagementScore: post.engagementScore || Math.random() * 10,
      sourceCategory: post.sourceCategory || 'Uncategorized',
      scheduleDate: null,
      format: post.format || 'Standard',
      hashtags: post.hashtags || []
    };
    
    this.approvalQueue.push(newPost);
    this.saveToStorage();
    return newPost.id;
  },
  
  /**
   * Remove a post from the approval queue
   * @param {string} postId - ID of the post to remove
   */
  removeFromQueue(postId) {
    if (!this.approvalQueue) return false;
    
    const index = this.approvalQueue.findIndex(p => p.id === postId);
    if (index === -1) return false;
    
    this.approvalQueue.splice(index, 1);
    this.saveToStorage();
    return true;
  },
  
  /**
   * Update the status of a post in the queue
   * @param {string} postId - ID of the post to update
   * @param {string} status - New status ('approved', 'pending', 'rejected', 'scheduled')
   */
  updatePostStatus(postId, status) {
    if (!this.approvalQueue) return false;
    
    const index = this.approvalQueue.findIndex(p => p.id === postId);
    if (index === -1) return false;
    
    this.approvalQueue[index].status = status;
    if (status === 'scheduled') {
      this.approvalQueue[index].scheduleDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
    
    this.saveToStorage();
    return true;
  },
  
  /**
   * Update a post's content
   * @param {string} postId - ID of the post to update
   * @param {string} content - New content for the post
   */
  updatePostContent(postId, content) {
    if (!this.approvalQueue) return false;
    
    const index = this.approvalQueue.findIndex(p => p.id === postId);
    if (index === -1) return false;
    
    this.approvalQueue[index].content = content;
    this.approvalQueue[index].updatedAt = new Date().toISOString();
    
    this.saveToStorage();
    return true;
  }
}

// ===== Utility Functions for UI Feedback =====

/**
 * Show an inline error message in a given element
 * @param {string} elementId - The ID of the element to display the error in
 * @param {string} message - The error message
 */
function showInlineError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
    el.classList.add('error-message');
  }
}

/**
 * Hide inline error message
 * @param {string} elementId
 */
function hideInlineError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
    el.classList.remove('error-message');
  }
}

/**
 * Show a temporary success notification
 * @param {string} message
 */
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification success';
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = 9999;
  notification.style.background = '#d4edda';
  notification.style.color = '#155724';
  notification.style.padding = '12px 24px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)';
  document.body.appendChild(notification);
  setTimeout(() => { notification.remove(); }, 3000);
}

/**
 * Set loading state for a button
 * @param {string} buttonId
 * @param {boolean} isLoading
 * @param {string} loadingText
 * @param {string} defaultText
 */
function setLoadingState(buttonId, isLoading, loadingText = 'Loading...', defaultText = 'Submit') {
  const btn = document.getElementById(buttonId);
  if (btn) {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? loadingText : defaultText;
  }
}

const appData = {
  sampleStyleProfiles: [],
  sampleArticles: [
    {
      id: 1,
      title: "OpenAI Releases GPT-4o with Enhanced Multimodal Capabilities",
      source: "TechCrunch",
      url: "https://techcrunch.com/gpt4o-release",
      summary: "OpenAI's latest model GPT-4o introduces revolutionary multimodal capabilities, allowing seamless integration of text, image, and audio processing in a single model.",
      relevanceScore: 9,
      topics: ["AI", "Machine Learning", "Technology"],
      publishedAt: "2025-06-04T10:30:00Z"
    },
    {
      id: 2,
      title: "The Future of Remote Work: AI-Powered Collaboration Tools",
      source: "Harvard Business Review",
      url: "https://hbr.org/remote-work-ai",
      summary: "New AI-powered collaboration tools are transforming how remote teams work together, offering intelligent meeting summaries, automated task distribution, and predictive project management.",
      relevanceScore: 8,
      topics: ["Remote Work", "AI", "Productivity"],
      publishedAt: "2025-06-04T08:15:00Z"
    },
    {
      id: 3,
      title: "Breakthrough in Quantum Computing Brings Practical Applications Closer",
      source: "MIT Technology Review",
      url: "https://technologyreview.com/quantum-breakthrough",
      summary: "Researchers have achieved a significant milestone in quantum error correction, bringing quantum computers closer to solving real-world problems in cryptography and drug discovery.",
      relevanceScore: 7,
      topics: ["Quantum Computing", "Technology", "Research"],
      publishedAt: "2025-06-04T06:45:00Z"
    },
    {
      id: 4,
      title: "Sustainable AI: Reducing the Carbon Footprint of Machine Learning",
      source: "Nature",
      url: "https://nature.com/sustainable-ai",
      summary: "Scientists propose new methods to significantly reduce the energy consumption of AI model training while maintaining performance, addressing growing concerns about AI's environmental impact.",
      relevanceScore: 8,
      topics: ["Sustainability", "AI", "Environment"],
      publishedAt: "2025-06-03T14:20:00Z"
    },
    {
      id: 5,
      title: "LinkedIn Introduces New Creator Tools for Professional Content",
      source: "Social Media Today",
      url: "https://socialmediatoday.com/linkedin-creator-tools",
      summary: "LinkedIn rolls out enhanced creator tools including AI-powered content suggestions, advanced analytics, and new video editing capabilities for professional content creators.",
      relevanceScore: 10,
      topics: ["LinkedIn", "Social Media", "Content Creation"],
      publishedAt: "2025-06-03T12:00:00Z"
    }
  ],
  monitoredWebsites: [
    {
      name: "TechCrunch",
      url: "https://techcrunch.com",
      rssUrl: "https://techcrunch.com/feed/",
      category: "Technology News",
      checkFrequency: "Every 2 hours",
      active: true
    },
    {
      name: "Harvard Business Review",
      url: "https://hbr.org",
      rssUrl: "https://hbr.org/feed",
      category: "Business Strategy",
      checkFrequency: "Daily",
      active: true
    },
    {
      name: "MIT Technology Review",
      url: "https://technologyreview.com",
      rssUrl: "https://technologyreview.com/feed/",
      category: "Technology Research",
      checkFrequency: "Daily",
      active: true
    }
  ],
  generatedPosts: [],
  approvalQueue: [],
  analytics: {
    postsGenerated: 47,
    averageEngagement: 8.3,
    styleConsistency: 92,
    topPerformingFormat: "Question Starter",
    bestPostingTime: "9:00 AM",
    sourcePerformance: {
      "TechCrunch": 8.7,
      "Harvard Business Review": 9.1,
      "MIT Technology Review": 7.8
    }
  }
};

// Application State
let currentTab = 'voice-analysis';
let selectedStyleProfile = null;
let currentArticle = null;
let userStyleProfile = null;

// ===== Website Monitoring UI Functions =====

/**
 * Display voice analysis results in the UI
 */
function displayVoiceAnalysis(profile) {
  const analysisResultElement = document.getElementById('analysisResult');
  if (analysisResultElement) {
    let result = `<strong>Voice Analysis Complete</strong><br>`;
    result += `<div class="analysis-detail"><strong>Tone:</strong> ${profile.tone}</div>`;
    result += `<div class="analysis-detail"><strong>Style:</strong> ${profile.style}</div>`;
    result += `<div class="analysis-detail"><strong>Average Length:</strong> ${profile.averageLength} characters</div>`;
    result += `<div class="analysis-detail"><strong>Unique Words:</strong> ${profile.uniqueWords}</div>`;
    analysisResultElement.innerHTML = result;
  }
}

/**
 * Render all available articles in the content generation tab
 */
function renderArticles() {
  const articlesContainer = document.getElementById('articlesList');
  if (!articlesContainer) return;
  
  if (!appData.articles || appData.articles.length === 0) {
    articlesContainer.innerHTML = `
      <div class="empty-state">
        <p>No articles available. Monitor websites to gather content or add articles manually.</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  appData.articles.forEach(article => {
    const sourceInfo = appState.websiteSources.find(s => s.id === article.sourceId);
    const sourceName = sourceInfo ? sourceInfo.name : article.source || 'Unknown Source';
    
    html += `
      <div class="table-row" data-id="${source.id}">
        <div class="col-name">
          <div class="source-title">${escapeHtml(source.name)}</div>
          <div class="source-url">${escapeHtml(source.url)}</div>
        </div>
        <div class="col-category">${escapeHtml(source.category)}</div>
        <div class="col-frequency">${escapeHtml(source.frequency)}</div>
        <div class="col-status">
          <span class="status-badge ${source.active ? 'active' : 'inactive'}">
            ${source.active ? 'Active' : 'Paused'}
          </span>
        </div>
        <div class="col-actions">
          <button class="btn-icon edit-source" title="Edit source">
            ✏️
          </button>
          <button class="btn-icon toggle-source" title="${source.active ? 'Pause monitoring' : 'Resume monitoring'}">
            ${source.active ? '⏸️' : '▶️'}
          </button>
          <button class="btn-icon delete-source" title="Delete source">
            🗑️
          </button>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  sourcesList.innerHTML = html;
  
  // Add event listeners to action buttons
  sourcesList.querySelectorAll('.edit-source').forEach(btn => {
    btn.addEventListener('click', handleEditSource);
  });
  
  sourcesList.querySelectorAll('.toggle-source').forEach(btn => {
    btn.addEventListener('click', handleToggleSource);
  });
  
  sourcesList.querySelectorAll('.delete-source').forEach(btn => {
    btn.addEventListener('click', handleDeleteSource);
  });
  
  // Save to localStorage
  appState.saveToStorage();
}

/**
 * Reset the source form to its initial state
 */
function resetSourceForm() {
  const form = document.getElementById('addSourceForm');
  if (!form) return;
  
  form.reset();
  appState.currentAction = 'add';
  appState.currentEditId = null;
  appState.isSourceFormValid = false;
  
  // Update submit button text
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = '➕ Add Source';
  }
  
  // Hide any error messages
  hideInlineError('sourceFormError');
}

/**
 * Validate the source form
 * @returns {boolean} - Whether the form is valid
 */
function validateSourceForm() {
  const name = document.getElementById('websiteName')?.value.trim();
  const websiteUrl = document.getElementById('websiteUrl')?.value.trim();
  const rssUrl = document.getElementById('rssUrl')?.value.trim();
  
  if (!name || !websiteUrl) {
    showInlineError('sourceFormError', 'Website name and URL are required.');
    appState.isSourceFormValid = false;
    return false;
  }
  
  // Basic URL validation
  try {
    new URL(websiteUrl);
    if (rssUrl) new URL(rssUrl);
  } catch (e) {
    showInlineError('sourceFormError', 'Please enter valid URLs.');
    appState.isSourceFormValid = false;
    return false;
  }
  
  hideInlineError('sourceFormError');
  appState.isSourceFormValid = true;
  return true;
}

/**
 * Populate the source form with data for editing
 * @param {string} sourceId - ID of the source to edit
 */
function populateSourceForm(sourceId) {
  const source = appState.websiteSources.find(s => s.id === sourceId);
  if (!source) return;
  
  document.getElementById('websiteName').value = source.name;
  document.getElementById('websiteUrl').value = source.url;
  document.getElementById('rssUrl').value = source.rssUrl;
  document.getElementById('category').value = source.category;
  document.getElementById('frequency').value = source.frequency;
  
  appState.currentAction = 'edit';
  appState.currentEditId = sourceId;
  
  // Update submit button text
  const submitBtn = document.querySelector('#addSourceForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.textContent = '💾 Update Source';
  }
}

// ===== Website Monitoring Event Handlers =====

/**
 * Handle form submission for adding/editing sources
 * @param {Event} e - Form submit event
 */
function handleSourceFormSubmit(e) {
  e.preventDefault();
  
  if (!validateSourceForm()) return;
  
  // Collect form data
  const sourceData = {
    name: document.getElementById('websiteName').value.trim(),
    url: document.getElementById('websiteUrl').value.trim(),
    rssUrl: document.getElementById('rssUrl').value.trim(),
    category: document.getElementById('category').value,
    frequency: document.getElementById('frequency').value
  };
  
  try {
    if (appState.currentAction === 'add') {
      appState.addWebsiteSource(sourceData);
      showSuccessNotification('New monitoring source added successfully!');
    } else {
      if (appState.updateWebsiteSource(appState.currentEditId, sourceData)) {
        showSuccessNotification('Source updated successfully!');
      }
    }
    
    resetSourceForm();
    renderMonitoredSources();
  } catch (error) {
    showInlineError('sourceFormError', `Error: ${error.message || 'Could not save source'}`); 
  }
}

/**
 * Handle edit button click
 * @param {Event} e - Click event
 */
function handleEditSource(e) {
  const row = e.target.closest('.table-row');
  const sourceId = row.dataset.id;
  
  populateSourceForm(sourceId);
  
  // Scroll to form
  document.querySelector('.add-source-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Handle toggle source status button click
 * @param {Event} e - Click event
 */
function handleToggleSource(e) {
  const row = e.target.closest('.table-row');
  const sourceId = row.dataset.id;
  
  const newStatus = appState.toggleWebsiteSourceStatus(sourceId);
  if (newStatus !== null) {
    renderMonitoredSources();
    showSuccessNotification(`Source ${newStatus ? 'activated' : 'paused'} successfully!`);
  }
}

/**
 * Handle delete source button click
 * @param {Event} e - Click event
 */
function handleDeleteSource(e) {
  const row = e.target.closest('.table-row');
  const sourceId = row.dataset.id;
  const sourceName = appState.websiteSources.find(s => s.id === sourceId)?.name || 'Source';
  
  if (confirm(`Are you sure you want to delete "${sourceName}"?`)) {
    if (appState.deleteWebsiteSource(sourceId)) {
      renderMonitoredSources();
      showSuccessNotification('Source deleted successfully!');
      
      // If we were editing this source, reset the form
      if (appState.currentEditId === sourceId) {
        resetSourceForm();
      }
    }
  }
}

/**
 * Utility function to escape HTML to prevent XSS
 * @param {string} unsafeText - Text that may contain HTML
 * @returns {string} - Escaped HTML
 */
function escapeHtml(unsafeText) {
  if (!unsafeText) return '';
  const div = document.createElement('div');
  div.textContent = unsafeText;
  return div.innerHTML;
}

// DOM Elements
const tabButtons = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const themeToggle = document.getElementById('themeToggle');
const modal = document.getElementById('postGenerationModal');
const modalOverlay = document.getElementById('modalOverlay');

function initializeApp() {
  // Set initial theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-color-scheme', savedTheme);
  updateThemeIcon(savedTheme);
  
  // Initialize analytics
  updateAnalyticsDisplay();
}

function setupEventListeners() {
  // Tab navigation
  const tabButtons = document.querySelectorAll('.nav-tab');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Voice analysis button
  const analyzeStyleBtn = document.getElementById('voiceAnalysisBtn');
  if (analyzeStyleBtn) {
    analyzeStyleBtn.addEventListener('click', analyzeVoice);
  }

  // Website monitoring
  const addSourceForm = document.getElementById('addSourceForm');
  if (addSourceForm) {
    addSourceForm.addEventListener('submit', handleSourceFormSubmit);

    // Add input validation
    const websiteNameInput = document.getElementById('websiteName');
    const websiteUrlInput = document.getElementById('websiteUrl');
    const rssUrlInput = document.getElementById('rssUrl');
    
    if (websiteNameInput) websiteNameInput.addEventListener('blur', validateSourceForm);
    if (websiteUrlInput) websiteUrlInput.addEventListener('blur', validateSourceForm);
    if (rssUrlInput) rssUrlInput.addEventListener('blur', validateSourceForm);
  }

  // Content generation elements
  const sourceFilter = document.getElementById('sourceFilter');
  if (sourceFilter) {
    sourceFilter.addEventListener('change', filterArticles);
  }

  const relevanceFilter = document.getElementById('relevanceFilter');
  if (relevanceFilter) {
    relevanceFilter.addEventListener('change', filterArticles);
  }

  const refreshArticlesBtn = document.getElementById('refreshArticles');
  if (refreshArticlesBtn) {
    refreshArticlesBtn.addEventListener('click', renderArticles);
  }

  const regeneratePostBtn = document.getElementById('regeneratePost');
  if (regeneratePostBtn) {
    regeneratePostBtn.addEventListener('click', regeneratePost);
  }

  const saveToQueueBtn = document.getElementById('saveToQueue');
  if (saveToQueueBtn) {
    saveToQueueBtn.addEventListener('click', savePostToQueue);
  }

  // Post content textarea for character counting
  const postContentArea = document.getElementById('generatedPostContent');
  if (postContentArea) {
    postContentArea.addEventListener('input', updateCharCount);
  }

  // Modal controls
  const closeModalBtn = document.getElementById('closeModal');
  const modalOverlay = document.getElementById('modalOverlay');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closePostEditModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', closePostEditModal);
  }

  // Modal save button
  const saveEditBtn = document.getElementById('saveEditedPost');
  if (saveEditBtn) {
    saveEditBtn.addEventListener('click', saveEditedPost);
  }
}

function switchTab(tabId) {
  // Update navigation
  const tabButtons = document.querySelectorAll('.nav-tab');
  tabButtons.forEach(btn => btn.classList.remove('active'));
  
  const activeTabButton = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeTabButton) {
    activeTabButton.classList.add('active');
  }

  // Update content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => content.classList.remove('active'));
  
  const activeContent = document.getElementById(tabId);
  if (activeContent) {
    activeContent.classList.add('active');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-color-scheme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-color-scheme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (theme === 'dark') {
    icon.textContent = '☀️';
    icon.setAttribute('title', 'Switch to Light Mode');
  } else {
    icon.textContent = '🌙';
    icon.setAttribute('title', 'Switch to Dark Mode');
  }
}

async function analyzeVoice() {
  const previousPosts = document.getElementById('previousPosts').value.trim();
  hideInlineError('analysisError');
  if (!previousPosts) {
    showInlineError('analysisError', 'Please provide your previous LinkedIn posts for analysis.');
    return;
  }
  setLoadingState('voiceAnalysisBtn', true, '⏳ Analyzing...', 'Analyze Voice');
  document.getElementById('analysisLoading').style.display = 'block';
  document.getElementById('analysisResults').style.display = 'none';
  try {
    const profile = await API.analyzeVoice(previousPosts);
    userStyleProfile = profile;
    displayVoiceAnalysis(profile);
    appData.sampleStyleProfiles.push(profile);
    renderStyleProfiles();
    document.querySelector('[data-tab="content-generation"]').classList.remove('nav-tab--disabled');
    showSuccessNotification('Style profile analyzed successfully!');
  } catch (error) {
    console.error('Error analyzing voice:', error);
    showInlineError('analysisError', `Error: ${error.message || 'Please try again later.'}`);
  } finally {
    setLoadingState('voiceAnalysisBtn', false, '⏳ Analyzing...', 'Analyze Voice');
    document.getElementById('analysisLoading').style.display = 'none';
    document.getElementById('analysisResults').style.display = 'block';
  }
}

async function generatePostContent() {
  const format = document.getElementById('postFormat').value;
  const styleProfile = document.getElementById('styleProfileSelect').value;
  hideInlineError('postGenError');
  setLoadingState('regeneratePost', true, '⏳ Generating...', '🔄 Regenerate');
  
  try {
    const profileData = styleProfile === 'Custom Profile' ? userStyleProfile : appState.sampleStyleProfiles.find(p => p.name === styleProfile) || userStyleProfile;
    const result = await API.generateContent(profileData, currentArticle, format);
    
    if (result && result.content) {
      document.getElementById('generatedPostContent').value = result.content;
      if (result.engagement_score) {
        document.getElementById('engagementPredict').textContent = result.engagement_score.toFixed(1);
      } else {
        updateEngagementScore();
      }
      showSuccessNotification('Post generated successfully!');
    } else {
      const generatedContent = getGeneratedPostContent(currentArticle, format, styleProfile);
      document.getElementById('generatedPostContent').value = generatedContent;
      updateEngagementScore();
      showInlineError('postGenError', 'Could not generate post from API, using fallback.');
    }
  } catch (error) {
    console.error('Error generating content:', error);
    const generatedContent = getGeneratedPostContent(currentArticle, format, styleProfile);
    document.getElementById('generatedPostContent').value = generatedContent;
    updateEngagementScore();
    showInlineError('postGenError', `Error: ${error.message || 'Please try again.'}`);
  } finally {
    setLoadingState('regeneratePost', false, '⏳ Generating...', '🔄 Regenerate');
    updateCharCount();
  }
}

async function regeneratePost() {
  setLoadingState('regeneratePost', true, '⏳ Regenerating...', '🔄 Regenerate');
  hideInlineError('postGenError');
  try {
    await generatePostContent();
    showSuccessNotification('Post regenerated successfully!');
  } catch (error) {
    console.error('Error regenerating post:', error);
    showInlineError('postGenError', 'There was a problem regenerating your post. Please try again.');
  } finally {
    setLoadingState('regeneratePost', false, '⏳ Regenerating...', '🔄 Regenerate');
  }
}

function saveAsDraft() {
  const postData = {
    id: Date.now(),
    articleId: currentArticle.id,
    content: document.getElementById('generatedPostContent').value,
    format: document.getElementById('postFormat').value,
    styleProfile: document.getElementById('styleProfileSelect').value,
    status: 'draft',
    createdAt: new Date().toISOString()
  };
  appData.generatedPosts.push(postData);
  closeModal();
  showSuccessNotification('Post saved as draft!');
}

function addToQueue() {
  const postData = {
    id: Date.now(),
    articleId: currentArticle.id,
    articleTitle: currentArticle.title,
    content: document.getElementById('generatedPostContent').value,
    format: document.getElementById('postFormat').value,
    styleProfile: document.getElementById('styleProfileSelect').value,
    status: 'pending',
    createdAt: new Date().toISOString(),
    engagementScore: parseFloat(document.getElementById('engagementPredict').textContent)
  };
  
  appData.approvalQueue.push(postData);
  renderApprovalQueue();
  closeModal();
  
  // Update queue stats
  updateQueueStats();
  
  alert('Post added to approval queue!');
}

function closeModal() {
  modal.classList.remove('active');
  modalOverlay.classList.remove('active');
}

function renderApprovalQueue() {
  const container = document.getElementById('approvalQueue');
  
  if (appData.approvalQueue.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>No posts in queue. Generate some content to get started!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = appData.approvalQueue.map(post => `
    <div class="approval-item">
      <div class="approval-header">
        <div class="approval-meta">
          <span class="approval-format">${post.format}</span>
          <span>Style: ${post.styleProfile}</span>
          <span>Score: ${post.engagementScore}/10</span>
        </div>
        <div>
          <button class="btn btn--sm btn--outline" onclick="removeFromQueue(${post.id})">Remove</button>
        </div>
      </div>
      <div class="approval-body">
        <div class="original-content">
          <div class="content-label">Original Article</div>
          <div style="font-weight: 500; margin-bottom: 8px;">${post.articleTitle}</div>
        </div>
        <div class="generated-content">
          <div class="content-label">Generated Post</div>
          <textarea class="post-content" rows="8">${post.content}</textarea>
          <div class="post-metrics">
            <span>${post.content.length} characters</span>
            <span>Engagement: ${post.engagementScore}/10</span>
          </div>
        </div>
      </div>
      <div class="approval-actions">
        <button class="btn btn--outline" onclick="requestModification(${post.id})">Request Changes</button>
        <button class="btn btn--secondary" onclick="schedulePost(${post.id})">Schedule</button>
        <button class="btn btn--primary" onclick="approvePost(${post.id})">Approve & Post</button>
      </div>
    </div>
  `).join('');
}

function updateQueueStats() {
  const pendingCount = appData.approvalQueue.filter(p => p.status === 'pending').length;
  const approvedCount = appData.generatedPosts.filter(p => p.status === 'approved').length;
  const avgEngagement = appData.approvalQueue.length > 0 
    ? (appData.approvalQueue.reduce((sum, p) => sum + p.engagementScore, 0) / appData.approvalQueue.length).toFixed(1)
    : '0';

  document.getElementById('pendingCount').textContent = pendingCount;
  document.getElementById('approvedCount').textContent = approvedCount;
  document.getElementById('avgEngagement').textContent = avgEngagement;
}

function removeFromQueue(postId) {
  appData.approvalQueue = appData.approvalQueue.filter(p => p.id !== postId);
  renderApprovalQueue();
  updateQueueStats();
}

function requestModification(postId) {
  alert('Modification request sent! The post will be regenerated with improvements.');
  // In a real app, this would trigger AI regeneration
}

function schedulePost(postId) {
  const post = appData.approvalQueue.find(p => p.id === postId);
  if (post) {
    post.status = 'scheduled';
    alert('Post scheduled for optimal posting time (9:00 AM tomorrow)');
  }
}

function approvePost(postId) {
  const post = appData.approvalQueue.find(p => p.id === postId);
  if (post) {
    post.status = 'approved';
    appData.generatedPosts.push(post);
    appData.approvalQueue = appData.approvalQueue.filter(p => p.id !== postId);
    renderApprovalQueue();
    updateQueueStats();
    updateAnalyticsDisplay();
    alert('Post approved and published to LinkedIn!');
  }
}

function renderAnalytics() {
  renderSourcePerformance();
  updateAnalyticsDisplay();
}

function updateAnalyticsDisplay() {
  document.getElementById('totalPosts').textContent = appData.analytics.postsGenerated;
  document.getElementById('avgEngagementScore').textContent = appData.analytics.averageEngagement;
  document.getElementById('styleConsistency').textContent = appData.analytics.styleConsistency + '%';
  document.getElementById('topFormat').textContent = appData.analytics.topPerformingFormat;
}

function renderSourcePerformance() {
  const container = document.getElementById('sourcePerformanceChart');
  
  container.innerHTML = Object.entries(appData.analytics.sourcePerformance)
    .map(([source, score]) => `
      <div class="performance-item">
        <div style="min-width: 150px; font-weight: 500;">${source}</div>
        <div class="performance-bar">
          <div class="performance-fill" style="width: ${(score / 10) * 100}%"></div>
        </div>
        <div class="performance-score">${score}</div>
      </div>
    `).join('');
}

// Initialize on page load
// Direct News Generation function that uses our new API endpoint
async function directGenerateNewsPost() {
  const previousPosts = document.getElementById('previousPosts') ? document.getElementById('previousPosts').value : '';
  const newsContent = document.getElementById('newsContent') ? document.getElementById('newsContent').value : '';
  const summaryLength = document.getElementById('summaryLength') ? document.getElementById('summaryLength').value : 'medium';
  hideInlineError('directGenError');
  if (!previousPosts.trim()) {
    showInlineError('directGenError', 'Please provide your previous LinkedIn posts for analysis.');
    return null;
  }
  if (!newsContent.trim()) {
    showInlineError('directGenError', 'Please provide news content to summarize.');
    return null;
  }
  setLoadingState('directGenerateBtn', true, '⏳ Generating...', '✅ Generate LinkedIn Post');
  try {
    // Call our new direct generation endpoint
    const result = await API.analyzeGenerateNews(previousPosts, newsContent, summaryLength);
    setLoadingState('directGenerateBtn', false, '⏳ Generating...', '✅ Generate LinkedIn Post');
    showSuccessNotification('LinkedIn post generated!');
    return result;
  } catch (error) {
    console.error('Error in direct news generation:', error);
    showInlineError('directGenError', 'Generation failed: ' + (error.message || 'Unknown error. Please try again.'));
    setLoadingState('directGenerateBtn', false, '⏳ Generating...', '✅ Generate LinkedIn Post');
    return null;
  }
}

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Enhanced LinkedIn Generator...');
  
  // Initialize global variables
  window.currentTab = 'voice-analysis';
  window.currentArticle = null;
  window.userStyleProfile = null;
  
  // Initialize app state
  window.appState = new AppState();
  appState.loadFromStorage();

  // Initialize API connector
  window.API = new APIConnector();
  
  // Set theme on initial load
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
  
  // Initialize UI components and render initial content
  renderStyleProfiles();
  renderMonitoredSources();
  renderArticles();
  renderApprovalQueue();
  renderAnalytics();
  
  // Set up event listeners for post format and style changes
  const postFormatEl = document.getElementById('postFormat');
  if (postFormatEl) {
    postFormatEl.addEventListener('change', generatePostContent);
  }
  const styleProfileEl = document.getElementById('styleProfileSelect');
  if (styleProfileEl) {
    styleProfileEl.addEventListener('change', generatePostContent);
  }
  
  // Set up website monitoring tab event listeners
  const addSourceForm = document.getElementById('addSourceForm');
  if (addSourceForm) {
    addSourceForm.addEventListener('submit', handleSourceFormSubmit);
    
    // Add input validation
    const websiteNameInput = document.getElementById('websiteName');
    const websiteUrlInput = document.getElementById('websiteUrl');
    const rssUrlInput = document.getElementById('rssUrl');
    
    if (websiteNameInput) websiteNameInput.addEventListener('blur', validateSourceForm);
    if (websiteUrlInput) websiteUrlInput.addEventListener('blur', validateSourceForm);
    if (rssUrlInput) rssUrlInput.addEventListener('blur', validateSourceForm);
  }
  
  // Render website monitoring sources if on that tab
  renderMonitoredSources();
  
  // Initialize queue stats
  updateQueueStats();
  
  // Set up direct generation button if it exists
  const directGenBtn = document.getElementById('directGenerateBtn');
  if (directGenBtn) {
    directGenBtn.addEventListener('click', async () => {
      const result = await directGenerateNewsPost();
      if (result) {
        // Update UI with result
        const styleProfileEl = document.getElementById('styleProfile');
        const generatedPostEl = document.getElementById('generatedPost');
        const hashtagsEl = document.getElementById('hashtags');
        const statsEl = document.getElementById('postStats');
        
        if (styleProfileEl) styleProfileEl.textContent = JSON.stringify(result.style_profile, null, 2);
        if (generatedPostEl) generatedPostEl.textContent = result.generated_post;
        if (hashtagsEl) hashtagsEl.textContent = result.hashtags.join(' ');
        if (statsEl) {
          const wordCount = result.generated_post.split(/\s+/).length;
          statsEl.textContent = 'Characters: ' + result.generated_post.length + ' | Words: ' + wordCount;
        }
      }
    });
  }
  
  // Auto-switch to content generation tab for demo purposes
  setTimeout(() => {
    renderApprovalQueue();
    
    // Add a sample website source for demo purposes if none exist
    if (appState.websiteSources.length === 0) {
      appState.addWebsiteSource({
        name: 'TechCrunch',
        url: 'https://techcrunch.com',
        rssUrl: 'https://techcrunch.com/feed/',
        category: 'Technology',
        frequency: 'daily'
      });
      renderMonitoredSources();
    }
  }, 100);
  
  // Set up all event listeners
  setupEventListeners();
  
  console.log('Enhanced LinkedIn Generator initialized successfully!');
}); // End of DOMContentLoaded handler