/**
 * Progressive Onboarding Experience
 * Guides new users through the LinkedIn Post Generator application features
 */

class OnboardingManager {
  constructor() {
    this.onboardingContainer = document.getElementById('onboardingContainer');
    this.onboardingSteps = document.querySelector('.onboarding-steps');
    this.progressSteps = document.querySelectorAll('.progress-step');
    this.currentStepElement = document.getElementById('currentStep');
    this.nextStepBtn = document.getElementById('nextStepBtn');
    this.prevStepBtn = document.getElementById('prevStepBtn');
    this.closeOnboardingBtn = document.getElementById('closeOnboarding');
    this.skipOnboardingBtn = document.getElementById('skipOnboarding');
    
    // Persona selection elements
    this.personaSelectors = document.querySelectorAll('.persona-option');
    
    // Content source elements
    this.sourceCheckboxes = document.querySelectorAll('.source-checkbox input');
    
    // Feature tour elements
    this.featureTourTargets = document.querySelectorAll('[data-tour-target]');
    
    // Current state
    this.currentStep = 0;
    this.totalSteps = this.progressSteps ? this.progressSteps.length : 0;
    this.selectedPersona = null;
    this.selectedSources = [];
    this.userPreferences = {
      persona: null,
      sources: [],
      contentTypes: [],
      frequency: 'weekly',
      notifications: true
    };
    
    // Initialize
    this.initialize();
  }
  
  initialize() {
    // Check if this is the first visit
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    
    if (!hasCompletedOnboarding && this.onboardingContainer) {
      // Show onboarding after a brief delay
      setTimeout(() => {
        this.showOnboarding();
      }, 800);
    }
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Navigation buttons
    if (this.nextStepBtn) {
      this.nextStepBtn.addEventListener('click', () => this.nextStep());
    }
    
    if (this.prevStepBtn) {
      this.prevStepBtn.addEventListener('click', () => this.prevStep());
    }
    
    // Close and skip buttons
    if (this.closeOnboardingBtn) {
      this.closeOnboardingBtn.addEventListener('click', () => this.hideOnboarding());
    }
    
    if (this.skipOnboardingBtn) {
      this.skipOnboardingBtn.addEventListener('click', () => this.completeOnboarding());
    }
    
    // Persona selection
    this.personaSelectors.forEach(selector => {
      selector.addEventListener('click', () => {
        this.selectPersona(selector.dataset.persona);
      });
    });
    
    // Source selection
    this.sourceCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateSelectedSources();
      });
    });
    
    // Listen for keypresses
    document.addEventListener('keydown', (e) => {
      if (!this.onboardingContainer || !this.onboardingContainer.classList.contains('visible')) {
        return;
      }
      
      // ESC key closes onboarding
      if (e.key === 'Escape') {
        this.hideOnboarding();
      }
      
      // Arrow keys for navigation
      if (e.key === 'ArrowRight') {
        this.nextStep();
      } else if (e.key === 'ArrowLeft') {
        this.prevStep();
      }
    });
  }
  
  // Display onboarding modal
  showOnboarding() {
    if (this.onboardingContainer) {
      document.body.classList.add('onboarding-active');
      this.onboardingContainer.classList.add('visible');
      this.goToStep(0);
    }
  }
  
  // Hide onboarding modal
  hideOnboarding() {
    if (this.onboardingContainer) {
      document.body.classList.remove('onboarding-active');
      this.onboardingContainer.classList.remove('visible');
    }
  }
  
  // Mark onboarding as complete
  completeOnboarding() {
    // Save user preferences
    this.saveUserPreferences();
    
    // Mark as completed in localStorage
    localStorage.setItem('hasCompletedOnboarding', 'true');
    localStorage.setItem('onboardingCompletedDate', new Date().toISOString());
    
    // Hide the onboarding
    this.hideOnboarding();
    
    // Show welcome toast
    if (window.enhancedUI && window.enhancedUI.showToast) {
      window.enhancedUI.showToast('Welcome! Your LinkedIn Post Generator is ready to use.', 'success');
    }
    
    // Trigger any post-onboarding actions (e.g., initialize app with preferences)
    this.triggerPostOnboardingActions();
  }
  
  // Move to the next step
  nextStep() {
    // Validate current step before proceeding
    if (!this.validateCurrentStep()) {
      return;
    }
    
    if (this.currentStep < this.totalSteps - 1) {
      this.goToStep(this.currentStep + 1);
    } else {
      this.completeOnboarding();
    }
  }
  
  // Move to the previous step
  prevStep() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }
  
  // Go to a specific step
  goToStep(stepIndex) {
    // Update current step
    this.currentStep = stepIndex;
    
    // Update progress indicator
    this.progressSteps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      if (index === stepIndex) {
        step.classList.add('active');
      } else if (index < stepIndex) {
        step.classList.add('completed');
      }
    });
    
    // Update step counter text
    if (this.currentStepElement) {
      this.currentStepElement.textContent = stepIndex + 1;
    }
    
    // Move the steps container to show the current step
    if (this.onboardingSteps) {
      this.onboardingSteps.style.transform = `translateX(-${stepIndex * 100}%)`;
    }
    
    // Update button states
    if (this.prevStepBtn) {
      this.prevStepBtn.disabled = stepIndex === 0;
    }
    
    if (this.nextStepBtn) {
      if (stepIndex === this.totalSteps - 1) {
        this.nextStepBtn.textContent = 'Get Started';
      } else {
        this.nextStepBtn.textContent = 'Next';
      }
      
      // Disable next button if current step requires selection
      const currentStepElement = this.onboardingSteps?.children[stepIndex];
      if (currentStepElement && currentStepElement.dataset.requireSelection === 'true') {
        const hasSelection = this.checkStepSelection(stepIndex);
        this.nextStepBtn.disabled = !hasSelection;
      } else {
        this.nextStepBtn.disabled = false;
      }
    }
    
    // Execute step-specific initialization
    this.initializeStep(stepIndex);
  }
  
  // Check if a step has a required selection
  checkStepSelection(stepIndex) {
    switch(stepIndex) {
      case 1: // Persona selection step
        return !!this.selectedPersona;
      case 2: // Content sources step
        return this.selectedSources.length > 0;
      default:
        return true;
    }
  }
  
  // Initialize any special functionality for a step
  initializeStep(stepIndex) {
    switch(stepIndex) {
      case 0:
        // Welcome step - nothing special to initialize
        break;
      case 1:
        // Persona selection - highlight already selected persona if any
        this.initializePersonaStep();
        break;
      case 2:
        // Content sources - check already selected sources if any
        this.initializeSourcesStep();
        break;
      case 3:
        // Feature tour - setup feature highlights
        this.initializeFeatureTourStep();
        break;
    }
  }
  
  // Initialize the persona selection step
  initializePersonaStep() {
    if (this.selectedPersona) {
      this.personaSelectors.forEach(selector => {
        if (selector.dataset.persona === this.selectedPersona) {
          selector.classList.add('selected');
        } else {
          selector.classList.remove('selected');
        }
      });
    }
  }
  
  // Initialize the content sources step
  initializeSourcesStep() {
    this.sourceCheckboxes.forEach(checkbox => {
      checkbox.checked = this.selectedSources.includes(checkbox.value);
    });
  }
  
  // Initialize the feature tour step
  initializeFeatureTourStep() {
    // Reset any active highlights
    document.querySelectorAll('.feature-highlight').forEach(highlight => {
      highlight.classList.remove('active');
    });
    
    // Start feature tour sequence
    this.startFeatureTour();
  }
  
  // Handle persona selection
  selectPersona(persona) {
    this.selectedPersona = persona;
    this.userPreferences.persona = persona;
    
    // Update UI
    this.personaSelectors.forEach(selector => {
      if (selector.dataset.persona === persona) {
        selector.classList.add('selected');
      } else {
        selector.classList.remove('selected');
      }
    });
    
    // Enable next button
    if (this.nextStepBtn) {
      this.nextStepBtn.disabled = false;
    }
    
    // Set persona-specific recommendations
    this.setPersonaRecommendations(persona);
  }
  
  // Set recommendations based on selected persona
  setPersonaRecommendations(persona) {
    // Define recommendations for each persona
    const recommendations = {
      'thought-leader': {
        sources: ['Harvard Business Review', 'MIT Technology Review', 'Forbes'],
        contentTypes: ['insights', 'analysis', 'trends'],
        frequency: 'weekly'
      },
      'industry-expert': {
        sources: ['Industry Publications', 'Research Reports', 'Case Studies'],
        contentTypes: ['technical', 'research', 'tutorials'],
        frequency: 'bi-weekly'
      },
      'networker': {
        sources: ['TechCrunch', 'Fast Company', 'LinkedIn News'],
        contentTypes: ['news', 'events', 'people'],
        frequency: 'daily'
      },
      'career-builder': {
        sources: ['Career Blogs', 'Company News', 'Job Sites'],
        contentTypes: ['career', 'skills', 'companies'],
        frequency: 'weekly'
      }
    };
    
    // Store recommendations in preferences
    const personaSettings = recommendations[persona] || {};
    Object.keys(personaSettings).forEach(key => {
      this.userPreferences[key] = personaSettings[key];
    });
  }
  
  // Update selected sources
  updateSelectedSources() {
    this.selectedSources = Array.from(this.sourceCheckboxes)
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);
    
    this.userPreferences.sources = this.selectedSources;
    
    // Enable/disable next button based on selection
    if (this.nextStepBtn && this.currentStep === 2) {
      this.nextStepBtn.disabled = this.selectedSources.length === 0;
    }
  }
  
  // Feature tour functionality
  startFeatureTour() {
    const tourItems = Array.from(this.featureTourTargets);
    if (tourItems.length === 0) return;
    
    let currentIndex = 0;
    const highlightFeature = (index) => {
      // Clear all active highlights
      document.querySelectorAll('.feature-highlight').forEach(el => {
        el.classList.remove('active');
      });
      
      // If we've reached the end, stop
      if (index >= tourItems.length) return;
      
      const target = tourItems[index];
      const targetId = target.dataset.tourTarget;
      const highlight = document.querySelector(`.feature-highlight[data-target="${targetId}"]`);
      
      if (highlight) {
        highlight.classList.add('active');
      }
    };
    
    // Start with first item
    highlightFeature(0);
    
    // Setup navigation for feature tour
    const tourNext = document.getElementById('tourNextBtn');
    const tourPrev = document.getElementById('tourPrevBtn');
    
    if (tourNext) {
      tourNext.addEventListener('click', () => {
        currentIndex++;
        highlightFeature(currentIndex);
        
        // Update navigation buttons
        if (tourPrev) tourPrev.disabled = false;
        if (tourNext) tourNext.disabled = currentIndex >= tourItems.length - 1;
      });
    }
    
    if (tourPrev) {
      tourPrev.disabled = true; // Initially disabled
      tourPrev.addEventListener('click', () => {
        currentIndex--;
        highlightFeature(currentIndex);
        
        // Update navigation buttons
        tourPrev.disabled = currentIndex <= 0;
        if (tourNext) tourNext.disabled = false;
      });
    }
  }
  
  // Save user preferences
  saveUserPreferences() {
    localStorage.setItem('userPreferences', JSON.stringify(this.userPreferences));
    
    // If API connector is available, save to backend
    if (window.API && typeof window.API.saveUserPreferences === 'function') {
      window.API.saveUserPreferences(this.userPreferences)
        .catch(error => console.error('Error saving preferences:', error));
    }
  }
  
  // Validate the current step before proceeding
  validateCurrentStep() {
    switch(this.currentStep) {
      case 1: // Persona selection
        if (!this.selectedPersona) {
          if (window.enhancedUI && window.enhancedUI.showToast) {
            window.enhancedUI.showToast('Please select a persona to continue', 'warning');
          }
          return false;
        }
        break;
      case 2: // Content sources
        if (this.selectedSources.length === 0) {
          if (window.enhancedUI && window.enhancedUI.showToast) {
            window.enhancedUI.showToast('Please select at least one content source', 'warning');
          }
          return false;
        }
        break;
    }
    return true;
  }
  
  // Actions to take after onboarding is complete
  triggerPostOnboardingActions() {
    // Initialize app with user preferences
    if (window.appInit && typeof window.appInit.setupWithPreferences === 'function') {
      window.appInit.setupWithPreferences(this.userPreferences);
    }
    
    // Add personalized welcome message based on persona
    const welcomeMessages = {
      'thought-leader': "Welcome, Thought Leader! Let's shape industry conversations with your insights.",
      'industry-expert': "Ready to share your expert knowledge! We'll help you establish authority in your field.",
      'networker': "Time to grow your network! We'll help you stay visible with engaging content.",
      'career-builder': "Let's advance your career! Strategic content will help you stand out to employers.",
      'default': "Welcome to your personalized LinkedIn content assistant!"
    };
    
    const welcomeMessage = welcomeMessages[this.selectedPersona] || welcomeMessages.default;
    
    // Update welcome message in UI if element exists
    const welcomeEl = document.querySelector('.welcome-message');
    if (welcomeEl) {
      welcomeEl.textContent = welcomeMessage;
    }
    
    // Configure content sources
    this.configureInitialSources();
  }
  
  // Configure initial content sources based on selections
  configureInitialSources() {
    if (window.API && typeof window.API.configureSources === 'function' && this.selectedSources.length > 0) {
      window.API.configureSources(this.selectedSources)
        .then(() => {
          console.log('Content sources configured successfully');
        })
        .catch(error => {
          console.error('Error configuring content sources:', error);
        });
    }
  }
  
  // Method to manually trigger onboarding (e.g., from help menu)
  static showOnboarding() {
    const onboardingManager = new OnboardingManager();
    onboardingManager.showOnboarding();
    return onboardingManager;
  }
}

// Initialize the onboarding experience when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.onboardingManager = new OnboardingManager();
});
