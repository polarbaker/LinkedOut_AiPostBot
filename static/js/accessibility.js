/**
 * Accessibility Enhancements
 * Implements key accessibility features for the LinkedIn Post Generator
 */

class AccessibilityManager {
  constructor() {
    this.highContrastMode = false;
    this.fontSizeLevel = 0; // 0=default, 1=larger, 2=largest
    this.focusTrapElements = [];
    
    this.initialize();
  }
  
  initialize() {
    this.loadUserPreferences();
    this.setupEventListeners();
    this.enhanceKeyboardNavigation();
    this.improveScreenReaderSupport();
  }
  
  loadUserPreferences() {
    // Load saved accessibility preferences
    const highContrast = localStorage.getItem('highContrastMode') === 'true';
    const fontSize = parseInt(localStorage.getItem('fontSizeLevel') || '0', 10);
    
    if (highContrast) {
      this.toggleHighContrastMode(true);
    }
    
    if (fontSize > 0) {
      this.setFontSize(fontSize);
    }
  }
  
  setupEventListeners() {
    // Setup listener for accessibility toggle buttons
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-accessibility-action]');
      if (!target) return;
      
      const action = target.dataset.accessibilityAction;
      
      switch (action) {
        case 'toggle-contrast':
          this.toggleHighContrastMode();
          break;
        case 'increase-font':
          this.increaseFontSize();
          break;
        case 'decrease-font':
          this.decreaseFontSize();
          break;
        case 'reset-preferences':
          this.resetAccessibilitySettings();
          break;
      }
    });
    
    // Listen for keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Alt+A opens accessibility menu
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        this.toggleAccessibilityMenu();
      }
    });
  }
  
  toggleHighContrastMode(forcedState) {
    this.highContrastMode = forcedState !== undefined ? forcedState : !this.highContrastMode;
    
    if (this.highContrastMode) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
    
    localStorage.setItem('highContrastMode', this.highContrastMode);
    
    // Announce to screen readers
    this.announceToScreenReader(`High contrast mode ${this.highContrastMode ? 'enabled' : 'disabled'}`);
  }
  
  increaseFontSize() {
    if (this.fontSizeLevel < 2) {
      this.fontSizeLevel++;
      this.setFontSize(this.fontSizeLevel);
      
      // Announce to screen readers
      this.announceToScreenReader(`Font size increased to level ${this.fontSizeLevel + 1}`);
    }
  }
  
  decreaseFontSize() {
    if (this.fontSizeLevel > 0) {
      this.fontSizeLevel--;
      this.setFontSize(this.fontSizeLevel);
      
      // Announce to screen readers
      this.announceToScreenReader(`Font size decreased to level ${this.fontSizeLevel + 1}`);
    }
  }
  
  setFontSize(level) {
    // Remove any existing font size classes
    document.body.classList.remove('font-size-large', 'font-size-largest');
    
    // Set new font size class
    if (level === 1) {
      document.body.classList.add('font-size-large');
    } else if (level === 2) {
      document.body.classList.add('font-size-largest');
    }
    
    this.fontSizeLevel = level;
    localStorage.setItem('fontSizeLevel', level);
  }
  
  resetAccessibilitySettings() {
    // Reset high contrast mode
    if (this.highContrastMode) {
      this.toggleHighContrastMode(false);
    }
    
    // Reset font size
    if (this.fontSizeLevel > 0) {
      this.setFontSize(0);
    }
    
    // Clear stored settings
    localStorage.removeItem('highContrastMode');
    localStorage.removeItem('fontSizeLevel');
    
    // Announce to screen readers
    this.announceToScreenReader('Accessibility settings have been reset to defaults');
  }
  
  enhanceKeyboardNavigation() {
    // Add focus styles to all interactive elements
    document.querySelectorAll('button, a, input, select, textarea, [tabindex]').forEach(element => {
      if (!element.classList.contains('skip-outline')) {
        element.classList.add('focus-visible-element');
      }
    });
    
    // Add tab index to elements that might need it
    document.querySelectorAll('.card, .interactive-element').forEach(element => {
      if (!element.hasAttribute('tabindex') && !element.querySelector('a, button, input')) {
        element.setAttribute('tabindex', '0');
      }
    });
    
    // Setup skip to content link
    const skipLink = document.querySelector('.skip-to-content');
    if (skipLink) {
      skipLink.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(skipLink.getAttribute('href'));
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
        }
      });
    }
  }
  
  improveScreenReaderSupport() {
    // Create a live region for announcements
    this.createScreenReaderAnnouncer();
    
    // Add appropriate ARIA roles
    this.addAriaAttributes();
  }
  
  createScreenReaderAnnouncer() {
    // Create live region for screen reader announcements
    const announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.classList.add('sr-only');
    document.body.appendChild(announcer);
    
    this.screenReaderAnnouncer = announcer;
  }
  
  announceToScreenReader(message, priority = 'polite') {
    if (!this.screenReaderAnnouncer) return;
    
    this.screenReaderAnnouncer.setAttribute('aria-live', priority);
    
    // Clear and then set the message (this ensures it will be announced even if the text doesn't change)
    this.screenReaderAnnouncer.textContent = '';
    setTimeout(() => {
      this.screenReaderAnnouncer.textContent = message;
    }, 50);
  }
  
  addAriaAttributes() {
    // Add necessary ARIA attributes to tabs
    const tabLists = document.querySelectorAll('[role="tablist"]');
    tabLists.forEach(tabList => {
      const tabs = tabList.querySelectorAll('[role="tab"]');
      const panels = [];
      
      tabs.forEach(tab => {
        const panelId = tab.getAttribute('aria-controls');
        const panel = document.getElementById(panelId);
        
        if (panel) {
          panels.push(panel);
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tab.id);
        }
        
        // Set up keyboard navigation
        tab.addEventListener('keydown', (e) => {
          let index = Array.from(tabs).indexOf(tab);
          
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            index = (index + 1) % tabs.length;
            tabs[index].focus();
            tabs[index].click();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            index = (index - 1 + tabs.length) % tabs.length;
            tabs[index].focus();
            tabs[index].click();
          }
        });
      });
    });
    
    // Add necessary ARIA attributes to form controls
    document.querySelectorAll('input, select, textarea').forEach(field => {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (!label && !field.hasAttribute('aria-label')) {
        console.warn(`Field ${field.id || 'unknown'} is missing an accessible label`);
      }
    });
  }
  
  toggleAccessibilityMenu() {
    let accessibilityMenu = document.getElementById('accessibility-menu');
    
    if (!accessibilityMenu) {
      // Create the accessibility menu
      accessibilityMenu = this.createAccessibilityMenu();
    }
    
    // Toggle visibility
    if (accessibilityMenu.classList.contains('shown')) {
      this.hideAccessibilityMenu(accessibilityMenu);
    } else {
      this.showAccessibilityMenu(accessibilityMenu);
    }
  }
  
  createAccessibilityMenu() {
    const menu = document.createElement('div');
    menu.id = 'accessibility-menu';
    menu.className = 'accessibility-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-labelledby', 'accessibility-title');
    
    menu.innerHTML = `
      <div class="accessibility-header">
        <h2 id="accessibility-title">Accessibility Options</h2>
        <button class="close-btn" aria-label="Close accessibility menu">✕</button>
      </div>
      <div class="accessibility-controls">
        <div class="accessibility-control">
          <span class="control-label">High Contrast Mode</span>
          <label class="switch">
            <input type="checkbox" id="high-contrast-toggle" ${this.highContrastMode ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
        
        <div class="accessibility-control">
          <span class="control-label">Text Size</span>
          <div class="button-group">
            <button class="btn btn--sm" data-accessibility-action="decrease-font" aria-label="Decrease font size">A-</button>
            <button class="btn btn--sm" disabled>${this.fontSizeLevel + 1}/3</button>
            <button class="btn btn--sm" data-accessibility-action="increase-font" aria-label="Increase font size">A+</button>
          </div>
        </div>
        
        <div class="accessibility-control">
          <span class="control-label">Reset Settings</span>
          <button class="btn btn--outline btn--sm" data-accessibility-action="reset-preferences">Reset to Default</button>
        </div>
        
        <div class="accessibility-info">
          <h3>Keyboard Shortcuts</h3>
          <ul class="shortcuts-list">
            <li><kbd>Alt</kbd> + <kbd>A</kbd> - Open accessibility menu</li>
            <li><kbd>Tab</kbd> - Navigate through elements</li>
            <li><kbd>Enter</kbd> / <kbd>Space</kbd> - Activate buttons</li>
            <li><kbd>Esc</kbd> - Close dialogs</li>
          </ul>
        </div>
      </div>
    `;
    
    document.body.appendChild(menu);
    
    // Setup event listeners
    const closeBtn = menu.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      this.hideAccessibilityMenu(menu);
    });
    
    const highContrastToggle = menu.querySelector('#high-contrast-toggle');
    highContrastToggle.addEventListener('change', () => {
      this.toggleHighContrastMode(highContrastToggle.checked);
    });
    
    // Handle ESC key to close
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAccessibilityMenu(menu);
      }
    });
    
    return menu;
  }
  
  showAccessibilityMenu(menu) {
    menu.classList.add('shown');
    
    // Create and show backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'accessibility-backdrop';
    document.body.appendChild(backdrop);
    
    // Focus the menu
    menu.setAttribute('tabindex', '-1');
    menu.focus();
    
    // Setup focus trap
    this.trapFocusInMenu(menu);
    
    // Add close handler to backdrop
    backdrop.addEventListener('click', () => {
      this.hideAccessibilityMenu(menu);
    });
  }
  
  hideAccessibilityMenu(menu) {
    menu.classList.remove('shown');
    
    // Remove backdrop
    const backdrop = document.querySelector('.accessibility-backdrop');
    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }
    
    // Release focus trap
    this.releaseFocusTrap();
  }
  
  trapFocusInMenu(menu) {
    const focusableElements = menu.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Save the element that had focus before opening the menu
      this.previouslyFocusedElement = document.activeElement;
      
      // Focus the first element
      firstElement.focus();
      
      // Handle tab key to keep focus inside the menu
      menu.addEventListener('keydown', this.handleTabKeyInFocusTrap);
      
      this.focusTrapElements = { menu, firstElement, lastElement };
    }
  }
  
  handleTabKeyInFocusTrap = (e) => {
    if (e.key !== 'Tab') return;
    
    if (!this.focusTrapElements) return;
    
    const { firstElement, lastElement } = this.focusTrapElements;
    
    // If shift+tab on first element, go to last element
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } 
    // If tab on last element, go to first element
    else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
  
  releaseFocusTrap() {
    if (this.focusTrapElements) {
      const { menu } = this.focusTrapElements;
      menu.removeEventListener('keydown', this.handleTabKeyInFocusTrap);
      this.focusTrapElements = null;
      
      // Restore focus to previously focused element
      if (this.previouslyFocusedElement) {
        this.previouslyFocusedElement.focus();
      }
    }
  }
}

// Initialize accessibility features when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.accessibilityManager = new AccessibilityManager();
});
