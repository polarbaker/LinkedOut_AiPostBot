/**
 * Main scripts for the LinkedIn Post Generator application
 * Handles tab navigation and basic UI interactions
 */

// Ensure the document is fully loaded before executing
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing application scripts...');
    
    // Initialize tab navigation
    initTabNavigation();
    
    // Set up theme toggler
    initThemeToggle();
    
    // Initialize modal functionality
    initModals();
    
    console.log('Application scripts initialized');
});

/**
 * Initialize tab navigation functionality
 */
function initTabNavigation() {
    // Handle both main app tabs and dashboard tabs
    const mainTabButtons = document.querySelectorAll('.nav-tab');
    const mainTabContents = document.querySelectorAll('.tab-content');
    const dashboardNavItems = document.querySelectorAll('.nav-item');
    const dashboardTabs = document.querySelectorAll('.dashboard-tab');
    
    console.log(`Found ${mainTabButtons.length} main tab buttons, ${mainTabContents.length} main tab contents`);
    console.log(`Found ${dashboardNavItems.length} dashboard nav items, ${dashboardTabs.length} dashboard tabs`);
    
    // Initialize main app tab navigation
    if (mainTabButtons.length > 0) {
        initMainAppTabs(mainTabButtons, mainTabContents);
    }
    
    // Initialize dashboard tab navigation
    if (dashboardNavItems.length > 0) {
        initDashboardTabs(dashboardNavItems, dashboardTabs);
    }
    
    // Check URL hash for direct navigation
    checkUrlHash();
}

/**
 * Initialize main application tabs
 */
function initMainAppTabs(tabButtons, tabContents) {
    // Add click event listeners to tab buttons
    tabButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const targetTabId = this.getAttribute('data-tab');
            
            if (!targetTabId) {
                console.error('Tab button is missing data-tab attribute', this);
                return;
            }
            
            switchTab(targetTabId, tabButtons, tabContents);
        });
    });
    
    // Set initial active tab from localStorage or use default
    const savedTab = localStorage.getItem('mainAppCurrentTab');
    if (savedTab) {
        // Find the button with the saved tab and click it
        const savedTabButton = Array.from(tabButtons).find(btn => btn.getAttribute('data-tab') === savedTab);
        if (savedTabButton) {
            savedTabButton.click();
        } else {
            // If saved tab doesn't exist, click the first tab
            tabButtons[0].click();
        }
    } else {
        // Use the first tab as default if no saved preference
        tabButtons[0].click();
    }
}

/**
 * Initialize dashboard tabs
 */
function initDashboardTabs(navItems, dashboardTabs) {
    // Add click event listeners to nav items
    navItems.forEach(item => {
        item.addEventListener('click', function(event) {
            event.preventDefault();
            const targetTabId = this.getAttribute('data-tab');
            
            if (!targetTabId) {
                console.error('Nav item is missing data-tab attribute', this);
                return;
            }
            
            switchDashboardTab(targetTabId, navItems, dashboardTabs);
        });
    });
    
    // Set initial active tab from localStorage or use default
    const savedTab = localStorage.getItem('dashboardCurrentTab');
    if (savedTab) {
        // Find the nav item with the saved tab and click it
        const savedNavItem = Array.from(navItems).find(item => item.getAttribute('data-tab') === savedTab);
        if (savedNavItem) {
            savedNavItem.click();
        } else {
            // If saved tab doesn't exist, click the first tab
            navItems[0].click();
        }
    } else {
        // Use the first tab as default if no saved preference
        navItems[0].click();
    }
}

/**
 * Switch main app tab
 */
function switchTab(tabId, tabButtons, tabContents) {
    console.log('Switching main app tab to:', tabId);
    
    // Update tab button states
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });
    
    // Update tab content visibility
    tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
            content.style.display = 'block';
            window.currentMainAppTab = tabId;
            
            // Dispatch event for tab change
            dispatchTabChangeEvent(tabId, content);
        } else {
            content.classList.remove('active');
            content.style.display = 'none';
        }
    });
    
    // Save to localStorage
    localStorage.setItem('mainAppCurrentTab', tabId);
}

/**
 * Switch dashboard tab
 */
function switchDashboardTab(tabId, navItems, dashboardTabs) {
    console.log('Switching dashboard tab to:', tabId);
    
    // Update navigation item states
    navItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabId) {
            item.classList.add('active');
            item.setAttribute('aria-selected', 'true');
        } else {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
        }
    });
    
    // Update dashboard tab visibility
    dashboardTabs.forEach(tab => {
        if (tab.id === tabId) {
            tab.classList.add('active');
            tab.style.display = 'block';
            window.currentDashboardTab = tabId;
            
            // Dispatch event for tab change
            dispatchTabChangeEvent(tabId, tab);
        } else {
            tab.classList.remove('active');
            tab.style.display = 'none';
        }
    });
    
    // Save to localStorage
    localStorage.setItem('dashboardCurrentTab', tabId);
    
    // Update URL hash without scrolling
    const scrollPosition = window.scrollY;
    window.location.hash = tabId;
    window.scrollTo(0, scrollPosition);
}

/**
 * Dispatch a tab change event
 */
function dispatchTabChangeEvent(tabId, element) {
    const tabChangeEvent = new CustomEvent('tabChange', {
        bubbles: true,
        detail: { tabId: tabId }
    });
    element.dispatchEvent(tabChangeEvent);
    document.dispatchEvent(tabChangeEvent);
}

/**
 * Check URL hash for direct tab navigation
 */
function checkUrlHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    
    console.log('URL hash detected:', hash);
    
    // Check if it's a dashboard tab
    const dashboardTab = document.getElementById(hash);
    if (dashboardTab && dashboardTab.classList.contains('dashboard-tab')) {
        const navItem = document.querySelector(`.nav-item[data-tab="${hash}"]`);
        if (navItem) {
            navItem.click();
            return;
        }
    }
    
    // Check if it's a main app tab
    const tabButton = document.querySelector(`.nav-tab[data-tab="${hash}"]`);
    if (tabButton) {
        tabButton.click();
        return;
    }
}

/**
 * Initialize theme toggle functionality
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    
    if (!themeToggle) {
        return;
    }
    
    // Set initial theme from localStorage or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Toggle theme on button click
    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        
        console.log(`Theme changed to: ${newTheme}`);
    });
}

/**
 * Update the theme icon based on current theme
 * @param {string} theme - The current theme ('light' or 'dark')
 */
function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    if (!themeIcon) {
        return;
    }
    
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/**
 * Initialize modal functionality
 */
function initModals() {
    // Get modal elements
    const modal = document.getElementById('postGenerationModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const closeModalBtn = document.getElementById('closeModal');
    const generatePostBtns = document.querySelectorAll('.generate-post-btn');
    
    // Check if we're on a page with modals
    if (!modal || !modalOverlay) {
        return;
    }
    
    // Open modal when generate post button is clicked
    generatePostBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            openModal(modal, modalOverlay);
            
            // If the button has article data, use it for generation
            const articleId = this.getAttribute('data-article-id');
            if (articleId) {
                populateArticlePreview(articleId);
            }
        });
    });
    
    // Close modal when close button is clicked
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            closeModal(modal, modalOverlay);
        });
    }
    
    // Close modal when clicking outside of it
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function() {
            closeModal(modal, modalOverlay);
        });
    }
    
    // Close modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal(modal, modalOverlay);
        }
    });
}

/**
 * Open a modal
 * @param {HTMLElement} modal - The modal element
 * @param {HTMLElement} overlay - The modal overlay element
 */
function openModal(modal, overlay) {
    modal.classList.add('active');
    overlay.classList.add('active');
    document.body.classList.add('modal-open');
}

/**
 * Close a modal
 * @param {HTMLElement} modal - The modal element
 * @param {HTMLElement} overlay - The modal overlay element
 */
function closeModal(modal, overlay) {
    modal.classList.remove('active');
    overlay.classList.remove('active');
    document.body.classList.remove('modal-open');
}

/**
 * Populate article preview in the post generation modal
 * @param {string} articleId - The ID of the selected article
 */
function populateArticlePreview(articleId) {
    const articlePreview = document.getElementById('articlePreview');
    if (!articlePreview) {
        return;
    }
    
    // In a real application, this would fetch the article data
    // For now, just use a placeholder
    const placeholderData = {
        title: 'Article Preview',
        source: 'Source Website',
        summary: 'This is a placeholder for the article summary. In a real application, this would contain the actual content of the selected article.'
    };
    
    articlePreview.innerHTML = `
        <h4>${placeholderData.title}</h4>
        <div class="article-source">${placeholderData.source}</div>
        <p>${placeholderData.summary}</p>
    `;
    
    // Trigger post generation based on the article
    generatePostContent();
}

/**
 * Generate post content based on selected article and options
 */
function generatePostContent() {
    const generatedPostContent = document.getElementById('generatedPostContent');
    if (!generatedPostContent) {
        return;
    }
    
    const postFormat = document.getElementById('postFormat').value;
    const styleProfile = document.getElementById('styleProfileSelect').value;
    
    // In a real application, this would call an API to generate content
    // For now, use placeholder content
    const placeholderPost = `Generated LinkedIn post using the "${postFormat}" format with a "${styleProfile}" style profile.\n\n`;
    
    generatedPostContent.value = placeholderPost + "Here's a thoughtful post about the article that would engage your audience with professional insights while maintaining your authentic voice. This is where the AI-generated content would appear, tailored to your preferences and the selected article.";
    
    // Update character count
    const charCount = document.getElementById('charCount');
    if (charCount) {
        charCount.textContent = generatedPostContent.value.length;
    }
}

// Utility functions that might be used by other scripts
window.showSuccessNotification = function(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `<span class="notification-icon">✅</span> ${message}`;
    
    document.body.appendChild(notification);
    
    // Remove notification after a few seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(notification), 500);
    }, 3000);
};

window.showInlineError = function(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }
    
    let errorDiv = element.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('error-message')) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        element.parentNode.insertBefore(errorDiv, element.nextSibling);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    element.classList.add('error');
};

window.hideInlineError = function(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }
    
    const errorDiv = element.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
        errorDiv.style.display = 'none';
    }
    
    element.classList.remove('error');
};
