/**
 * UXIntegrationManager
 * Connects all enhanced UI components and features into a cohesive experience
 */

class UXIntegrationManager {
  constructor() {
    // Component references
    this.enhancedUI = null;
    this.onboardingManager = null;
    this.notificationSystem = null;
    this.progressiveDisclosure = null;
    this.accessibilityManager = null;
    this.contentGenerationManager = null;
    
    // Original app state references
    this.appState = window.appState;
    this.apiConnector = window.apiConnector;
    
    // User tracking data for progressive features
    this.userMetrics = {
      appLaunchCount: this._getFromStorage('appLaunchCount', 0),
      tabViews: this._getFromStorage('tabViews', {}),
      actionsPerformed: this._getFromStorage('actionsPerformed', 0),
      featuresDiscovered: this._getFromStorage('featuresDiscovered', [])
    };
    
    // Initialize immediately
    this.initialize();
  }
  
  async initialize() {
    console.log('UXIntegrationManager: Initializing all enhanced UI components');
    
    // Fix tab navigation priority
    this._fixTabNavigation();
    
    // Wait for DOM to be fully loaded
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => this.initializeComponents());
    } else {
      this.initializeComponents();
    }
  }
  
  _fixTabNavigation() {
    // Let scripts.js handle the initial tab setup
    // Wait for DOM to be ready to ensure scripts.js has already initialized tabs
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this._ensureTabNavigation();
      });
    } else {
      // DOM already loaded, fix tabs now
      this._ensureTabNavigation();
    }
  }
  
  _ensureTabNavigation() {
    console.log('UXIntegrationManager: Ensuring tab navigation works properly');
    const tabButtons = document.querySelectorAll('.nav-tab');
    
    // Check if scripts.js has already set up the tabs
    if (tabButtons.length > 0 && !window.currentTab) {
      console.log('UXIntegrationManager: Tab navigation needs fixing');
      
      // Initialize tab functionality if not already done
      if (typeof window.initTabNavigation === 'function') {
        window.initTabNavigation();
      } else {
        // If scripts.js hasn't loaded yet, use our own tab navigation
        this._implementTabNavigation();
      }
    }
    
    // Register for tab change events
    document.addEventListener('tabChange', (event) => {
      console.log('UXIntegrationManager: Tab changed to', event.detail?.tabId);
      if (this.progressiveDisclosure) {
        this.progressiveDisclosure.revealElementsForContext(event.detail?.tabId);
      }
    });
  }
  
  _implementTabNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', (event) => {
        const targetTab = button.getAttribute('data-tab');
        if (!targetTab) return;
        
        // Update active tab button
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show target tab content, hide others
        tabContents.forEach(content => {
          if (content.id === targetTab) {
            content.classList.add('active');
            window.currentTab = targetTab;
            
            // Dispatch event for other components
            const tabChangeEvent = new CustomEvent('tabChange', {
              bubbles: true,
              detail: { tabId: targetTab }
            });
            content.dispatchEvent(tabChangeEvent);
          } else {
            content.classList.remove('active');
          }
        });
        
        // Save preference
        localStorage.setItem('currentTab', targetTab);
      });
    });
    
    // Activate the saved tab or default to first
    const savedTab = localStorage.getItem('currentTab');
    if (savedTab) {
      const savedTabButton = Array.from(tabButtons).find(btn => 
        btn.getAttribute('data-tab') === savedTab
      );
      if (savedTabButton) {
        savedTabButton.click();
      } else {
        tabButtons[0]?.click();
      }
    } else {
      tabButtons[0]?.click();
    }
  }
  
  initializeComponents() {
    console.log('Initializing enhanced UI integration...');
    
    // Track app launch
    this._incrementAppLaunchCount();
    
    // Enhanced UI components initialization in the correct order
    this._initEnhancedUI();
    this._initAccessibilityManager();
    this._initProgressiveDisclosure();
    this._initOnboardingSystem();
    this._initNotificationSystem();
    this._initContentGeneration();
    
    // Setup cross-component communication
    this._setupComponentCommunication();
    
    // Legacy integrations with existing code
    this._setupLegacyIntegrations();
    
    // Start tracking user metrics
    this.trackAppUsage();
    
    // Dispatch ready event
    this._dispatchReadyEvent();
    
    console.log('Enhanced UI integration complete');
  }
  
  _initEnhancedUI() {
    if (window.EnhancedUI) {
      this.enhancedUI = new window.EnhancedUI();
      console.log('Enhanced UI initialized');
    }
  }
  
  _initAccessibilityManager() {
    if (window.AccessibilityManager) {
      this.accessibilityManager = new window.AccessibilityManager();
      this.accessibilityManager.initialize();
      console.log('Accessibility Manager initialized');
    }
  }
  
  _initProgressiveDisclosure() {
    if (window.ProgressiveDisclosure) {
      this.progressiveDisclosure = new window.ProgressiveDisclosure({
        userExperienceLevel: this._calculateUserExperienceLevel(),
        currentContext: window.currentTab || document.querySelector('.nav-tab.active')?.getAttribute('data-tab') || 'default'
      });
      this.progressiveDisclosure.initialize();
      console.log('Progressive Disclosure initialized');
    }
  }
  
  _initOnboardingSystem() {
    if (window.OnboardingManager) {
      this.onboardingManager = new window.OnboardingManager({
        isFirstVisit: this.userMetrics.appLaunchCount <= 1,
        userPreferences: this._getFromStorage('userPreferences', {})
      });
      
      // Connect onboarding completion to progressive disclosure
      if (this.onboardingManager && this.progressiveDisclosure) {
        this.onboardingManager.addEventListener('onboardingComplete', () => {
          this.progressiveDisclosure.incrementUserExperienceLevel();
        });
      }
      
      console.log('Onboarding Manager initialized');
    }
  }
  
  _initNotificationSystem() {
    if (window.NotificationSystem) {
      this.notificationSystem = new window.NotificationSystem();
      console.log('Notification System initialized');
    }
  }
  
  _initContentGeneration() {
    if (window.ContentGenerationManager) {
      this.contentGenerationManager = new window.ContentGenerationManager(this.apiConnector);
      console.log('Content Generation Manager initialized');
    }
  }
  
  _setupComponentCommunication() {
    // Connect notification system to other components
    if (this.notificationSystem) {
      // Relay notifications from API to UI
      if (this.apiConnector) {
        const originalHandleError = this.apiConnector.handleError;
        this.apiConnector.handleError = (error) => {
          if (originalHandleError) originalHandleError(error);
          this.notificationSystem.showError(error.message || 'API Error');
          
          // Also announce errors to screen readers
          if (this.accessibilityManager) {
            this.accessibilityManager.announceToScreenReader(error.message || 'API Error', 'assertive');
          }
        };
      }
      
      // Connect with the form validation system
      if (window.showInlineError) {
        const originalShowInlineError = window.showInlineError;
        window.showInlineError = (elementId, message) => {
          // Call original function
          if (typeof originalShowInlineError === 'function') {
            originalShowInlineError(elementId, message);
          }
          
          // Also announce errors to screen readers
          if (this.accessibilityManager) {
            this.accessibilityManager.announceToScreenReader(message, 'assertive');
          }
        };
      }
    }
    
    // Connect onboarding preferences to app state
    if (this.onboardingManager && this.appState) {
      this.onboardingManager.addEventListener('preferenceSet', (event) => {
        const { key, value } = event.detail;
        
        switch (key) {
          case 'contentType':
            // Update content type preference in app
            if (this.appState.userStyleProfile) {
              this.appState.userStyleProfile.preferredContentType = value;
              this.appState.saveToStorage();
            }
            break;
          case 'postFrequency':
            // Update scheduling preferences
            if (this.appState.userPreferences) {
              this.appState.userPreferences.postFrequency = value;
              this.appState.saveToStorage();
            }
            break;
          default:
            // Store other preferences
            const userPreferences = this._getFromStorage('userPreferences', {});
            userPreferences[key] = value;
            localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
        }
      });
    }
    
    // Connect progressive disclosure to user actions
    if (this.progressiveDisclosure) {
      // Listen for specific actions that should trigger feature reveals
      document.addEventListener('postGenerated', () => {
        this.progressiveDisclosure.revealFeature('advanced-generation-options');
      });
      
      document.addEventListener('postQueued', () => {
        this.progressiveDisclosure.revealFeature('analytics-insights');
      });
    }
  }
  
  _setupLegacyIntegrations() {
    if (document.querySelector('.nav-tab')) {
      console.log('Setting up legacy component integrations');
      
      // Connect to existing tab navigation for backward compatibility
      const tabButtons = document.querySelectorAll('.nav-tab');
      if (tabButtons.length > 0) {
        tabButtons.forEach(button => {
          button.addEventListener('click', this._handleTabNavigation.bind(this));
        });
      }
    }
  }
  
  _handleTabNavigation(e) {
    const targetTab = e.currentTarget.getAttribute('data-tab');
    if (!targetTab) return;
    
    // Track tab views for user metrics
    this._incrementTabView(targetTab);
    
    // Track for progressive disclosure
    if (this.progressiveDisclosure) {
      this.progressiveDisclosure.setContext(targetTab);
    }
  }
  
  trackAppUsage() {
    // Listen for key user actions to track app usage
    document.addEventListener('click', (e) => {
      // Track functional buttons, not navigation
      if (e.target.classList.contains('btn') && 
          !e.target.classList.contains('nav-tab')) {
        this._incrementActionsPerformed();
      }
      
      // Track new feature discoveries
      if (e.target.hasAttribute('data-feature-id')) {
        const featureId = e.target.getAttribute('data-feature-id');
        this._trackFeatureDiscovered(featureId);
      }
    });
  }
  
  _incrementAppLaunchCount() {
    this.userMetrics.appLaunchCount++;
    localStorage.setItem('appLaunchCount', this.userMetrics.appLaunchCount);
  }
  
  _incrementTabView(tabId) {
    if (!tabId) return;
    
    if (!this.userMetrics.tabViews[tabId]) {
      this.userMetrics.tabViews[tabId] = 0;
    }
    
    this.userMetrics.tabViews[tabId]++;
    localStorage.setItem('tabViews', JSON.stringify(this.userMetrics.tabViews));
  }
  
  _incrementActionsPerformed() {
    this.userMetrics.actionsPerformed++;
    localStorage.setItem('actionsPerformed', this.userMetrics.actionsPerformed);
    
    // Also update experience level when significant actions are performed
    if (this.progressiveDisclosure && this.userMetrics.actionsPerformed % 10 === 0) {
      this.progressiveDisclosure.incrementUserExperienceLevel();
    }
  }
  
  _trackFeatureDiscovered(featureId) {
    if (!featureId || this.userMetrics.featuresDiscovered.includes(featureId)) {
      return;
    }
    
    this.userMetrics.featuresDiscovered.push(featureId);
    localStorage.setItem(
      'featuresDiscovered', 
      JSON.stringify(this.userMetrics.featuresDiscovered)
    );
    
    // Potentially increment experience level on new discoveries
    if (this.progressiveDisclosure && this.userMetrics.featuresDiscovered.length % 3 === 0) {
      this.progressiveDisclosure.incrementUserExperienceLevel();
    }
  }
  
  _calculateUserExperienceLevel() {
    // Simple algorithm to determine user experience level
    const launches = this.userMetrics.appLaunchCount;
    const actions = this.userMetrics.actionsPerformed;
    const features = this.userMetrics.featuresDiscovered.length;
    const tabCount = Object.keys(this.userMetrics.tabViews).length;
    
    // Calculate based on user activities
    let level = 1; // Beginner by default
    
    if (launches > 5 || actions > 20 || features > 5) level = 2; // Intermediate
    if (launches > 10 || actions > 50 || features > 10) level = 3; // Advanced
    if (launches > 20 || actions > 100 || features > 20) level = 4; // Power user
    
    // Consider tab exploration - if user has explored all tabs
    if (tabCount >= 4) level = Math.max(level, 2);
    
    return level;
  }
  
  _getFromStorage(key, defaultValue) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error(`Error retrieving ${key} from storage`, e);
      return defaultValue;
    }
  }
  
  _dispatchReadyEvent() {
    const event = new CustomEvent('enhancedUIReady', {
      bubbles: true,
      detail: {
        manager: this
      }
    });
    document.dispatchEvent(event);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Create global instance of the integration manager
  window.uxIntegrationManager = new UXIntegrationManager();
});
