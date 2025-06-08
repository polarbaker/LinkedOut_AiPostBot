/**
 * Notification System
 * Provides toast notifications, alerts, and status messages for the LinkedIn Post Generator
 */

class NotificationSystem {
  constructor(options = {}) {
    this.options = {
      toastContainer: 'toastContainer',
      defaultDuration: 5000,
      maxToasts: 5,
      position: 'bottom-right',
      ...options
    };
    
    this.toastContainer = document.getElementById(this.options.toastContainer);
    if (!this.toastContainer) {
      this.createToastContainer();
    }
    
    // Active notifications
    this.activeToasts = [];
    
    // Initialize notification count badge
    this.initializeNotificationBadge();
    
    // Load any stored notifications
    this.loadStoredNotifications();
  }
  
  // Create toast container if it doesn't exist
  createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = this.options.toastContainer;
    this.toastContainer.className = `toast-container position-${this.options.position}`;
    document.body.appendChild(this.toastContainer);
  }
  
  // Show a toast notification
  toast(message, type = 'info', options = {}) {
    const toastOptions = {
      duration: this.options.defaultDuration,
      icon: this.getIconForType(type),
      title: this.getTitleForType(type),
      dismissible: true,
      animate: true,
      ...options
    };
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    if (toastOptions.animate) {
      toast.classList.add('animated');
    }
    
    // Create toast content
    toast.innerHTML = `
      <div class="toast-icon">${toastOptions.icon}</div>
      <div class="toast-content">
        <div class="toast-title">${toastOptions.title}</div>
        <div class="toast-message">${message}</div>
      </div>
      ${toastOptions.dismissible ? '<button class="toast-dismiss" aria-label="Dismiss notification">✕</button>' : ''}
    `;
    
    // Add to container
    this.toastContainer.appendChild(toast);
    
    // Limit number of visible toasts
    this.manageToastLimit();
    
    // Track toast
    const toastId = Date.now().toString();
    toast.dataset.toastId = toastId;
    this.activeToasts.push(toastId);
    
    // Add dismiss handler
    const dismissBtn = toast.querySelector('.toast-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        this.dismissToast(toast);
      });
    }
    
    // Trigger entrance animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Set auto-dismiss
    if (toastOptions.duration > 0) {
      setTimeout(() => {
        this.dismissToast(toast);
      }, toastOptions.duration);
    }
    
    // Add to persistent notifications if needed
    if (options.persistent) {
      this.storeNotification({
        id: toastId,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      // Update notification badge
      this.updateNotificationBadge();
    }
    
    return toastId;
  }
  
  // Dismiss a toast notification
  dismissToast(toast) {
    if (!toast) return;
    
    // Get ID
    const toastId = toast.dataset.toastId;
    
    // Add exit animation
    toast.classList.add('removing');
    
    // Remove after animation completes
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        
        // Remove from active toasts
        this.activeToasts = this.activeToasts.filter(id => id !== toastId);
      }
    }, 300); // Match animation duration
    
    return toastId;
  }
  
  // Limit the number of visible toasts
  manageToastLimit() {
    const toasts = this.toastContainer.querySelectorAll('.toast');
    if (toasts.length > this.options.maxToasts) {
      // Remove oldest toasts
      for (let i = 0; i < toasts.length - this.options.maxToasts; i++) {
        this.dismissToast(toasts[i]);
      }
    }
  }
  
  // Get icon for toast type
  getIconForType(type) {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  }
  
  // Get title for toast type
  getTitleForType(type) {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      default:
        return 'Information';
    }
  }
  
  // Show success toast
  success(message, options = {}) {
    return this.toast(message, 'success', options);
  }
  
  // Show error toast
  error(message, options = {}) {
    return this.toast(message, 'error', options);
  }
  
  // Show warning toast
  warning(message, options = {}) {
    return this.toast(message, 'warning', options);
  }
  
  // Show info toast
  info(message, options = {}) {
    return this.toast(message, 'info', options);
  }
  
  // Initialize notification badge
  initializeNotificationBadge() {
    const notificationBtns = document.querySelectorAll('.notification-btn, #notificationsBtn');
    notificationBtns.forEach(btn => {
      const badge = document.createElement('span');
      badge.className = 'notification-badge';
      badge.style.display = 'none';
      btn.appendChild(badge);
      
      // Add click handler to show notification center
      btn.addEventListener('click', () => {
        this.toggleNotificationCenter();
      });
    });
  }
  
  // Update notification badge count
  updateNotificationBadge() {
    const unreadCount = this.getUnreadNotificationCount();
    const badges = document.querySelectorAll('.notification-badge');
    
    badges.forEach(badge => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    });
    
    // Update document title if there are unread notifications
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) LinkedIn Post Generator`;
    } else {
      document.title = 'LinkedIn Post Generator';
    }
  }
  
  // Store a persistent notification
  storeNotification(notification) {
    const notifications = this.getStoredNotifications();
    notifications.unshift(notification);
    
    // Limit to 50 notifications
    const limitedNotifications = notifications.slice(0, 50);
    
    // Save to localStorage
    localStorage.setItem('notifications', JSON.stringify(limitedNotifications));
  }
  
  // Get stored notifications
  getStoredNotifications() {
    const notificationsJson = localStorage.getItem('notifications');
    return notificationsJson ? JSON.parse(notificationsJson) : [];
  }
  
  // Get unread notification count
  getUnreadNotificationCount() {
    const notifications = this.getStoredNotifications();
    return notifications.filter(n => !n.read).length;
  }
  
  // Load existing notifications from storage
  loadStoredNotifications() {
    const notifications = this.getStoredNotifications();
    
    // Update badge
    this.updateNotificationBadge();
    
    return notifications;
  }
  
  // Mark notification as read
  markAsRead(notificationId) {
    const notifications = this.getStoredNotifications();
    const updatedNotifications = notifications.map(n => {
      if (n.id === notificationId) {
        return { ...n, read: true };
      }
      return n;
    });
    
    // Save updated notifications
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    // Update badge
    this.updateNotificationBadge();
  }
  
  // Mark all notifications as read
  markAllAsRead() {
    const notifications = this.getStoredNotifications();
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    
    // Save updated notifications
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    
    // Update badge
    this.updateNotificationBadge();
  }
  
  // Toggle notification center
  toggleNotificationCenter() {
    let notificationCenter = document.getElementById('notificationCenter');
    
    if (notificationCenter) {
      // Toggle visibility
      if (notificationCenter.classList.contains('show')) {
        this.hideNotificationCenter();
      } else {
        this.showNotificationCenter();
      }
    } else {
      // Create notification center
      this.createNotificationCenter();
      this.showNotificationCenter();
    }
  }
  
  // Create notification center
  createNotificationCenter() {
    const notificationCenter = document.createElement('div');
    notificationCenter.id = 'notificationCenter';
    notificationCenter.className = 'notification-center';
    
    // Get notifications
    const notifications = this.getStoredNotifications();
    
    // Create content
    notificationCenter.innerHTML = `
      <div class="notification-header">
        <h3 class="notification-title">Notifications</h3>
        <button class="btn btn--sm btn--text" id="markAllReadBtn">Mark all as read</button>
        <button class="notification-close" aria-label="Close notification center">✕</button>
      </div>
      <div class="notification-list">
        ${this.renderNotifications(notifications)}
      </div>
    `;
    
    // Add to body
    document.body.appendChild(notificationCenter);
    
    // Add event listeners
    const closeBtn = notificationCenter.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.hideNotificationCenter();
    });
    
    const markAllReadBtn = notificationCenter.querySelector('#markAllReadBtn');
    markAllReadBtn.addEventListener('click', () => {
      this.markAllAsRead();
      this.hideNotificationCenter();
    });
    
    // Add click handlers to individual notifications
    const notificationItems = notificationCenter.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
      item.addEventListener('click', () => {
        const notificationId = item.dataset.id;
        this.markAsRead(notificationId);
        item.classList.add('read');
        
        // Execute any action linked to this notification
        const actionType = item.dataset.actionType;
        const actionData = item.dataset.actionData;
        
        if (actionType) {
          this.handleNotificationAction(actionType, actionData);
        }
      });
    });
    
    // Close when clicking outside
    document.addEventListener('click', this.handleOutsideClick);
    
    return notificationCenter;
  }
  
  // Render notifications list
  renderNotifications(notifications) {
    if (notifications.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <p>No notifications yet</p>
        </div>
      `;
    }
    
    return notifications.map(n => {
      const isRead = n.read ? 'read' : 'unread';
      const timeAgo = this.getTimeAgo(new Date(n.timestamp));
      
      return `
        <div class="notification-item ${isRead}" data-id="${n.id}" data-action-type="${n.actionType || ''}" data-action-data="${n.actionData || ''}">
          <div class="notification-icon notification-icon-${n.type}">${this.getIconForType(n.type)}</div>
          <div class="notification-content">
            <p class="notification-message">${n.message}</p>
            <span class="notification-time">${timeAgo}</span>
          </div>
          ${n.read ? '' : '<span class="unread-indicator"></span>'}
        </div>
      `;
    }).join('');
  }
  
  // Get relative time string
  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + ' years ago';
    }
    
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + ' months ago';
    }
    
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + ' days ago';
    }
    
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + ' hours ago';
    }
    
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + ' minutes ago';
    }
    
    return 'just now';
  }
  
  // Handle outside click
  handleOutsideClick = (event) => {
    const notificationCenter = document.getElementById('notificationCenter');
    const notificationBtns = document.querySelectorAll('.notification-btn, #notificationsBtn');
    
    let clickedOnButton = false;
    notificationBtns.forEach(btn => {
      if (btn.contains(event.target)) {
        clickedOnButton = true;
      }
    });
    
    if (notificationCenter && 
        !notificationCenter.contains(event.target) && 
        !clickedOnButton) {
      this.hideNotificationCenter();
    }
  }
  
  // Show notification center
  showNotificationCenter() {
    const notificationCenter = document.getElementById('notificationCenter') || this.createNotificationCenter();
    notificationCenter.classList.add('show');
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'notification-backdrop';
    document.body.appendChild(backdrop);
    
    setTimeout(() => {
      backdrop.classList.add('active');
    }, 10);
    
    // Add close handler to backdrop
    backdrop.addEventListener('click', () => {
      this.hideNotificationCenter();
    });
  }
  
  // Hide notification center
  hideNotificationCenter() {
    const notificationCenter = document.getElementById('notificationCenter');
    if (!notificationCenter) return;
    
    notificationCenter.classList.remove('show');
    
    // Remove backdrop
    const backdrop = document.querySelector('.notification-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      setTimeout(() => {
        if (backdrop.parentNode) {
          backdrop.parentNode.removeChild(backdrop);
        }
      }, 300);
    }
  }
  
  // Handle notification action
  handleNotificationAction(actionType, actionData) {
    switch (actionType) {
      case 'navigate':
        // Navigate to a specific page or tab
        if (actionData.startsWith('#')) {
          window.location.hash = actionData;
        } else {
          window.location.href = actionData;
        }
        break;
        
      case 'showPost':
        // Open a specific post
        if (window.contentHub && typeof window.contentHub.openPost === 'function') {
          window.contentHub.openPost(actionData);
        }
        break;
        
      case 'refreshData':
        // Refresh specific data
        if (window.dashboard && typeof window.dashboard.refreshData === 'function') {
          window.dashboard.refreshData(actionData);
        }
        break;
    }
  }
  
  // In-app notification (persistent across page refreshes)
  notify(message, type = 'info', options = {}) {
    const notificationId = Date.now().toString();
    
    // Store notification
    this.storeNotification({
      id: notificationId,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
      actionType: options.actionType || null,
      actionData: options.actionData || null
    });
    
    // Show toast
    this.toast(message, type, { duration: options.duration || 5000 });
    
    // Update badge
    this.updateNotificationBadge();
    
    return notificationId;
  }
  
  // Clear all notifications
  clearAllNotifications() {
    localStorage.removeItem('notifications');
    this.updateNotificationBadge();
    
    // Refresh notification center if open
    const notificationCenter = document.getElementById('notificationCenter');
    if (notificationCenter && notificationCenter.classList.contains('show')) {
      this.hideNotificationCenter();
      this.showNotificationCenter();
    }
  }
}

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.notifications = new NotificationSystem();
  
  // Example of system notifications for demo purposes
  setTimeout(() => {
    if (window.notifications) {
      window.notifications.notify(
        'Welcome to the enhanced LinkedIn Post Generator!',
        'info',
        { 
          actionType: 'navigate', 
          actionData: '#overview',
          duration: 7000
        }
      );
    }
  }, 2000);
});
