/**
 * Progressive Disclosure
 * Manages showing and hiding UI elements based on context and user interaction
 * to create a cleaner, more focused interface
 */

class ProgressiveDisclosure {
  constructor() {
    this.disclosureGroups = {};
    this.userLevel = this.getUserExperienceLevel();
    
    this.initializeDisclosures();
    this.setupEventListeners();
  }
  
  initializeDisclosures() {
    // Find all progressive disclosure elements
    document.querySelectorAll('[data-disclosure-group]').forEach(element => {
      const groupName = element.dataset.disclosureGroup;
      const priority = parseInt(element.dataset.disclosurePriority || '1', 10);
      const condition = element.dataset.disclosureCondition || 'click';
      const target = element.dataset.disclosureTarget;
      
      if (!this.disclosureGroups[groupName]) {
        this.disclosureGroups[groupName] = [];
      }
      
      this.disclosureGroups[groupName].push({
        element,
        priority,
        condition,
        target,
        disclosed: this.shouldBeInitiallyDisclosed(element)
      });
    });
    
    // Sort each group by priority
    Object.keys(this.disclosureGroups).forEach(groupName => {
      this.disclosureGroups[groupName].sort((a, b) => a.priority - b.priority);
    });
    
    // Apply initial state
    this.applyDisclosureState();
  }
  
  // Determine if an element should be initially shown based on attributes and user level
  shouldBeInitiallyDisclosed(element) {
    const minLevel = parseInt(element.dataset.disclosureMinLevel || '0', 10);
    const alwaysShow = element.dataset.disclosureAlways === 'true';
    const initiallyShown = element.dataset.disclosureInitial === 'true';
    
    return alwaysShow || initiallyShown || this.userLevel >= minLevel;
  }
  
  // Get user experience level from local storage (0=beginner, 1=intermediate, 2=advanced)
  getUserExperienceLevel() {
    // Track app usage to determine level
    const appOpenCount = parseInt(localStorage.getItem('appOpenCount') || '0', 10);
    const postsCreated = parseInt(localStorage.getItem('postsCreatedCount') || '0', 10);
    const explicitLevel = localStorage.getItem('userExperienceLevel');
    
    if (explicitLevel) {
      return parseInt(explicitLevel, 10);
    }
    
    // Auto-determine level based on usage
    if (postsCreated > 10 || appOpenCount > 20) {
      return 2; // Advanced
    } else if (postsCreated > 3 || appOpenCount > 5) {
      return 1; // Intermediate
    } else {
      return 0; // Beginner
    }
  }
  
  // Apply the current disclosure state to all elements
  applyDisclosureState() {
    Object.keys(this.disclosureGroups).forEach(groupName => {
      const group = this.disclosureGroups[groupName];
      
      group.forEach(item => {
        this.setDisclosureState(item.element, item.disclosed);
        
        // If this controls a target element, set its state too
        if (item.target) {
          const targetElement = document.querySelector(item.target);
          if (targetElement) {
            this.setDisclosureState(targetElement, item.disclosed);
          }
        }
      });
    });
  }
  
  // Set the visibility state of an element
  setDisclosureState(element, isDisclosed) {
    if (isDisclosed) {
      element.classList.remove('hidden', 'disclosure-hidden');
      element.classList.add('disclosed');
      element.setAttribute('aria-hidden', 'false');
      
      // If this is a form field that's now visible, we may need to make it required
      if ((element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') 
          && element.hasAttribute('data-required-when-visible')) {
        element.setAttribute('required', '');
      }
    } else {
      element.classList.add('disclosure-hidden');
      element.classList.remove('disclosed');
      element.setAttribute('aria-hidden', 'true');
      
      // Remove required attribute when hidden
      if (element.hasAttribute('required') && element.hasAttribute('data-required-when-visible')) {
        element.removeAttribute('required');
      }
    }
  }
  
  // Toggle disclosure state of an element
  toggleDisclosure(element, forcedState) {
    const groupName = element.dataset.disclosureGroup;
    const elementIndex = this.findElementIndexInGroup(element, groupName);
    
    if (elementIndex === -1) return;
    
    // Update the disclosed state
    const group = this.disclosureGroups[groupName];
    const newState = forcedState !== undefined ? forcedState : !group[elementIndex].disclosed;
    group[elementIndex].disclosed = newState;
    
    // Apply the new state
    this.setDisclosureState(element, newState);
    
    // If this controls a target element, set its state too
    const targetSelector = element.dataset.disclosureTarget;
    if (targetSelector) {
      const targetElement = document.querySelector(targetSelector);
      if (targetElement) {
        this.setDisclosureState(targetElement, newState);
      }
    }
    
    // If this is a "more" toggle, show additional items in the same group
    if (element.dataset.disclosureMore === 'true') {
      this.showMoreInGroup(groupName, element);
    }
    
    // Update persisted state if needed
    if (element.dataset.disclosurePersist === 'true') {
      localStorage.setItem(`disclosure_${groupName}_${elementIndex}`, newState);
    }
    
    // Trigger disclosure event
    this.triggerDisclosureEvent(element, newState);
  }
  
  // Find element's index in its disclosure group
  findElementIndexInGroup(element, groupName) {
    if (!this.disclosureGroups[groupName]) return -1;
    return this.disclosureGroups[groupName].findIndex(item => item.element === element);
  }
  
  // Handle "Show More" functionality
  showMoreInGroup(groupName, triggerElement) {
    if (!this.disclosureGroups[groupName]) return;
    
    // Get the count of items to show
    const showCount = parseInt(triggerElement.dataset.disclosureShowCount || '3', 10);
    const group = this.disclosureGroups[groupName];
    
    // Find how many are currently disclosed
    const currentlyDisclosed = group.filter(item => item.disclosed).length;
    
    // Show additional items up to the showCount
    let newlyDisclosed = 0;
    for (let i = 0; i < group.length && newlyDisclosed < showCount; i++) {
      if (!group[i].disclosed) {
        group[i].disclosed = true;
        this.setDisclosureState(group[i].element, true);
        newlyDisclosed++;
      }
    }
    
    // Update the show more button or hide it if everything is now shown
    if (currentlyDisclosed + newlyDisclosed >= group.length) {
      // All items are now shown, hide the "show more" button
      triggerElement.classList.add('disclosure-hidden');
    } else {
      // Update the count in the button text if it has a counter
      const countElement = triggerElement.querySelector('.disclosure-count');
      if (countElement) {
        const remaining = group.length - (currentlyDisclosed + newlyDisclosed);
        countElement.textContent = remaining;
      }
    }
  }
  
  // Set up event listeners for disclosure triggers
  setupEventListeners() {
    // Click triggers
    document.addEventListener('click', (event) => {
      const triggerElement = event.target.closest('[data-disclosure-trigger]');
      if (triggerElement) {
        const targetSelector = triggerElement.dataset.disclosureTarget;
        if (targetSelector) {
          const targetElements = document.querySelectorAll(targetSelector);
          targetElements.forEach(target => {
            if (target.dataset.disclosureGroup) {
              this.toggleDisclosure(target);
            }
          });
          
          event.preventDefault();
        }
      }
    });
    
    // Setup hover triggers
    document.querySelectorAll('[data-disclosure-condition="hover"]').forEach(element => {
      element.addEventListener('mouseenter', () => {
        if (element.dataset.disclosureGroup) {
          this.toggleDisclosure(element, true);
        }
      });
      
      element.addEventListener('mouseleave', () => {
        if (element.dataset.disclosureGroup && !element.dataset.disclosureSticky) {
          this.toggleDisclosure(element, false);
        }
      });
    });
    
    // Setup focus triggers
    document.querySelectorAll('[data-disclosure-condition="focus"]').forEach(element => {
      element.addEventListener('focus', () => {
        if (element.dataset.disclosureGroup) {
          this.toggleDisclosure(element, true);
        }
      });
      
      element.addEventListener('blur', () => {
        if (element.dataset.disclosureGroup && !element.dataset.disclosureSticky) {
          this.toggleDisclosure(element, false);
        }
      });
    });
    
    // Form field validation triggers
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('input', event => {
        const field = event.target;
        if (field.dataset.disclosureValidation === 'true') {
          const isValid = field.checkValidity();
          const targetSelector = field.dataset.disclosureTarget;
          
          if (targetSelector) {
            const targetElements = document.querySelectorAll(targetSelector);
            targetElements.forEach(target => {
              if (target.dataset.disclosureGroup) {
                this.toggleDisclosure(target, isValid);
              }
            });
          }
        }
      });
    });
  }
  
  // Trigger custom disclosure event
  triggerDisclosureEvent(element, isDisclosed) {
    const event = new CustomEvent('disclosure', {
      bubbles: true,
      detail: {
        element,
        isDisclosed,
        group: element.dataset.disclosureGroup
      }
    });
    element.dispatchEvent(event);
  }
  
  // Increment user's experience level
  incrementExperienceLevel() {
    const currentLevel = this.getUserExperienceLevel();
    if (currentLevel < 2) {
      localStorage.setItem('userExperienceLevel', currentLevel + 1);
      this.userLevel = currentLevel + 1;
      
      // Reapply disclosure state based on new level
      this.applyDisclosureState();
      
      return true;
    }
    return false;
  }
  
  // Track app usage metrics for auto-adjusting user level
  trackAppUsage(metric, value = 1) {
    const currentValue = parseInt(localStorage.getItem(metric) || '0', 10);
    localStorage.setItem(metric, currentValue + value);
    
    // Check if we should update experience level
    const newLevel = this.getUserExperienceLevel();
    if (newLevel !== this.userLevel) {
      this.userLevel = newLevel;
      this.applyDisclosureState();
    }
  }
  
  // Show features based on contextual usage patterns
  showFeatureBasedOnContext(featureSelector, condition) {
    const featureElement = document.querySelector(featureSelector);
    if (!featureElement || !featureElement.dataset.disclosureGroup) return;
    
    if (condition) {
      this.toggleDisclosure(featureElement, true);
    }
  }
  
  // Helper function to progressively disclose elements by priority
  progressivelyShowInGroup(groupName, interval = 500, limit = null) {
    if (!this.disclosureGroups[groupName]) return;
    
    const group = this.disclosureGroups[groupName];
    let count = 0;
    
    const showNext = () => {
      if (count < group.length && (!limit || count < limit)) {
        if (!group[count].disclosed) {
          this.toggleDisclosure(group[count].element, true);
        }
        count++;
        setTimeout(showNext, interval);
      }
    };
    
    showNext();
  }
}

// Initialize the progressive disclosure system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.progressiveDislosure = new ProgressiveDisclosure();
  
  // Track app open
  window.progressiveDislosure.trackAppUsage('appOpenCount');
  
  // Check URL parameters for guided flows
  const urlParams = new URLSearchParams(window.location.search);
  const guidedFlow = urlParams.get('guide');
  
  if (guidedFlow) {
    // Handle specific guided flows
    switch(guidedFlow) {
      case 'new-user':
        // For new users, start a specific guided disclosure sequence
        window.progressiveDislosure.progressivelyShowInGroup('getting-started', 1000);
        break;
      case 'advanced':
        // For advanced users, show more advanced features immediately
        document.querySelectorAll('[data-disclosure-min-level="2"]').forEach(element => {
          if (element.dataset.disclosureGroup) {
            window.progressiveDislosure.toggleDisclosure(element, true);
          }
        });
        break;
    }
  }
});
