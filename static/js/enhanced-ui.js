/**
 * Enhanced UI JavaScript
 * Handles interactions for the improved dashboard, onboarding experience,
 * microinteractions and accessibility features
 */

class EnhancedUI {
  constructor() {
    this.initializeUI();
    this.setupEventListeners();
    
    // Check if this is the first visit
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    if (!hasCompletedOnboarding && this.onboardingContainer) {
      // Show onboarding on first visit
      setTimeout(() => {
        this.showOnboarding();
      }, 1000);
    }
  }
  
  initializeUI() {
    // Dashboard elements
    this.dashboardTabs = document.querySelectorAll('.dashboard-tab');
    this.navItems = document.querySelectorAll('.nav-item');
    
    // Onboarding elements
    this.onboardingContainer = document.getElementById('onboardingContainer');
    this.onboardingSteps = document.querySelector('.onboarding-steps');
    this.progressSteps = document.querySelectorAll('.progress-step');
    this.currentStepElement = document.getElementById('currentStep');
    this.nextStepBtn = document.getElementById('nextStepBtn');
    this.prevStepBtn = document.getElementById('prevStepBtn');
    this.closeOnboardingBtn = document.getElementById('closeOnboarding');
    this.skipOnboardingBtn = document.getElementById('skipOnboarding');
    
    // Toast elements
    this.toastContainer = document.getElementById('toastContainer');
    
    // Current state
    this.currentStep = 0;
    this.totalSteps = this.progressSteps ? this.progressSteps.length : 0;
  }
  
  setupEventListeners() {
    // Dashboard tab navigation
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = item.getAttribute('data-tab');
        this.switchTab(tabId);
      });
    });
    
    // Onboarding navigation
    if (this.nextStepBtn) {
      this.nextStepBtn.addEventListener('click', () => this.nextStep());
    }
    
    if (this.prevStepBtn) {
      this.prevStepBtn.addEventListener('click', () => this.prevStep());
    }
    
    if (this.closeOnboardingBtn) {
      this.closeOnboardingBtn.addEventListener('click', () => this.hideOnboarding());
    }
    
    if (this.skipOnboardingBtn) {
      this.skipOnboardingBtn.addEventListener('click', () => this.completeOnboarding());
    }
    
    // Add event listeners for any buttons that need toast notifications
    const refreshButtons = document.querySelectorAll('[data-toast]');
    refreshButtons.forEach(button => {
      button.addEventListener('click', () => {
        const toastType = button.getAttribute('data-toast-type') || 'info';
        const toastMessage = button.getAttribute('data-toast') || 'Action completed';
        this.showToast(toastMessage, toastType);
      });
    });
  }
  
  // Dashboard tab switching
  switchTab(tabId) {
    console.log('EnhancedUI: Switching tab to', tabId);
    
    if (!tabId) {
      console.error('No tab ID provided to switchTab');
      return;
    }
    
    // Update navigation
    this.navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Update tab content
    this.dashboardTabs.forEach(tab => {
      if (tab.id === tabId) {
        tab.classList.add('active');
        tab.style.display = 'block'; // Ensure it's visible
      } else {
        tab.classList.remove('active');
        tab.style.display = 'none'; // Hide it
      }
    });
    
    // Update URL hash without scrolling
    const scrollPosition = window.scrollY;
    window.location.hash = tabId;
    window.scrollTo(0, scrollPosition);
    
    // Store the current tab
    window.currentTab = tabId;
    localStorage.setItem('currentTab', tabId);
    
    // Dispatch event for integration with other components
    const tabChangeEvent = new CustomEvent('tabChange', {
      bubbles: true,
      detail: { tabId: tabId }
    });
    document.dispatchEvent(tabChangeEvent);
  }
  
  // Check URL hash on page load to show correct tab
  checkUrlHash() {
    const hash = window.location.hash.substring(1);
    if (hash) {
      this.switchTab(hash);
    }
  }
  
  // Onboarding functions
  showOnboarding() {
    if (this.onboardingContainer) {
      this.onboardingContainer.classList.add('visible');
      // Reset to first step
      this.goToStep(0);
    }
  }
  
  hideOnboarding() {
    if (this.onboardingContainer) {
      this.onboardingContainer.classList.remove('visible');
    }
  }
  
  completeOnboarding() {
    // Mark onboarding as completed
    localStorage.setItem('hasCompletedOnboarding', 'true');
    this.hideOnboarding();
    
    // Show welcome toast
    this.showToast('Welcome to LinkedIn Post Generator! Your dashboard is ready.', 'success');
  }
  
  nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.goToStep(this.currentStep + 1);
    } else {
      this.completeOnboarding();
    }
  }
  
  prevStep() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }
  
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
    
    // Update step counter
    if (this.currentStepElement) {
      this.currentStepElement.textContent = stepIndex + 1;
    }
    
    // Move step container
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
    }
  }
  
  // Toast notification system
  showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    // Set icon based on type
    let icon = '💬';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${this.getToastTitle(type)}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-dismiss" aria-label="Dismiss notification">✕</button>
    `;
    
    // Add to container
    this.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Set up dismiss button
    const dismissBtn = toast.querySelector('.toast-dismiss');
    dismissBtn.addEventListener('click', () => {
      this.dismissToast(toast);
    });
    
    // Auto dismiss after duration
    setTimeout(() => {
      this.dismissToast(toast);
    }, duration);
    
    return toast;
  }
  
  dismissToast(toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300); // Match the animation duration
  }
  
  getToastTitle(type) {
    switch(type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      default: return 'Information';
    }
  }
  
  // Accessibility enhancements
  setupAccessibility() {
    // Handle keyboard navigation for tabs
    this.navItems.forEach(item => {
      item.setAttribute('tabindex', '0');
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.click();
        }
      });
    });
    
    // Add ARIA attributes to interactive elements
    const tabPanels = document.querySelectorAll('.dashboard-tab');
    tabPanels.forEach(panel => {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', `tab-${panel.id}`);
    });
  }
  
  // Card and element animations
  initializeAnimations() {
    // Add hover animations to cards
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach(card => {
      card.classList.add('hover-card');
    });
    
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn:not(.btn--icon)');
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        button.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }
  
  // Button loading state
  setButtonLoadingState(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
      // Store original text
      button.dataset.originalText = button.innerHTML;
      button.classList.add('btn--loading');
      button.innerHTML = '<span class="btn-text"></span>';
      button.disabled = true;
    } else {
      button.classList.remove('btn--loading');
      button.innerHTML = button.dataset.originalText || 'Button';
      button.disabled = false;
    }
  }
  
  // Form field validation
  setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!form.checkValidity()) {
          e.preventDefault();
          this.showInvalidFormFields(form);
        }
      });
    });
  }
  
  showInvalidFormFields(form) {
    const invalidFields = form.querySelectorAll(':invalid');
    invalidFields.forEach(field => {
      field.classList.add('invalid');
      
      // Add validation message
      const errorMessage = field.dataset.errorMessage || 'This field is required';
      let errorElement = field.parentElement.querySelector('.error-message');
      
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        field.parentElement.appendChild(errorElement);
      }
      
      errorElement.textContent = errorMessage;
      
      // Remove error on input
      field.addEventListener('input', () => {
        field.classList.remove('invalid');
        errorElement.textContent = '';
      }, { once: true });
    });
    
    // Focus first invalid field
    if (invalidFields.length > 0) {
      invalidFields[0].focus();
    }
  }
  
  // Theme switching
  toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
    
    // Show toast
    this.showToast(`${isDarkMode ? 'Dark' : 'Light'} mode activated`, 'info', 2000);
  }
  
  // Check and apply saved theme preference
  applyThemePreference() {
    const savedTheme = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'true' || (savedTheme === null && prefersDark)) {
      document.body.classList.add('dark-mode');
    }
  }
}

// Initialize the enhanced UI
document.addEventListener('DOMContentLoaded', () => {
  window.enhancedUI = new EnhancedUI();
  
  // Apply saved theme
  window.enhancedUI.applyThemePreference();
  
  // Setup accessibility features
  window.enhancedUI.setupAccessibility();
  
  // Initialize animations
  window.enhancedUI.initializeAnimations();
  
  // Setup form validation
  window.enhancedUI.setupFormValidation();
  
  // Check URL hash for tab navigation
  window.enhancedUI.checkUrlHash();
});

// Create mock placeholder for image paths
function getPlaceholderImage(width, height, text) {
  return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(text)}`;
}

// Helper function for debouncing
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Sample data for development/testing
const sampleData = {
  articles: [
    {
      id: 1,
      title: "The Future of AI in Content Marketing",
      source: "TechCrunch",
      category: "Technology",
      date: "2025-06-05T08:30:00Z",
      relevance: 9.2,
      summary: "AI is revolutionizing how marketers create and distribute content, with personalization at scale becoming the new standard.",
      keywords: ["AI", "marketing", "personalization", "content strategy"]
    },
    {
      id: 2,
      title: "Leadership Lessons from Tech Innovators",
      source: "Harvard Business Review",
      category: "Leadership",
      date: "2025-06-04T14:45:00Z",
      relevance: 8.7,
      summary: "Top tech leaders share insights on building resilient teams and fostering innovation cultures in rapidly changing environments.",
      keywords: ["leadership", "innovation", "tech culture", "teams"]
    }
  ],
  
  interests: ["AI", "Machine Learning", "Digital Marketing", "Leadership", "Innovation", "Technology Trends"],
  
  sources: ["TechCrunch", "Harvard Business Review", "Wired", "Fast Company", "MIT Technology Review"]
};
