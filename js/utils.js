/**
 * Utility functions for loading states and network detection
 */

class LoadingManager {
    constructor() {
        this.activeLoaders = new Set();
        this.init();
    }

    init() {
        // Create global loading overlay if it doesn't exist
        if (!document.getElementById('globalLoadingOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'globalLoadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p class="loading-text">Loading...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        // Add network status listener
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));

        // Check initial network status
        if (!navigator.onLine) {
            this.showNetworkError();
        }
    }

    /**
     * Show loading overlay with optional message
     */
    show(message = 'Loading...') {
        const overlay = document.getElementById('globalLoadingOverlay');
        if (overlay) {
            const textElement = overlay.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            overlay.style.display = 'flex';
            this.activeLoaders.add('global');
        }
    }

    /**
     * Hide loading overlay
     */
    hide() {
        this.activeLoaders.delete('global');
        if (this.activeLoaders.size === 0) {
            const overlay = document.getElementById('globalLoadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }

    /**
     * Show loading state on a specific button
     */
    showButtonLoading(button, loadingText = 'Loading...') {
        if (!button) return null;
        
        const originalContent = button.innerHTML;
        const originalDisabled = button.disabled;
        
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${loadingText}`;
        button.classList.add('btn-loading');
        
        return {
            originalContent,
            originalDisabled,
            restore: () => {
                button.innerHTML = originalContent;
                button.disabled = originalDisabled;
                button.classList.remove('btn-loading');
            }
        };
    }

    /**
     * Show loading state for a table or list
     */
    showTableLoading(tableBody, colspan = 5, message = 'Loading data...') {
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center py-4">
                    <div class="spinner-border text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="text-muted mb-0">${message}</p>
                </td>
            </tr>
        `;
    }

    /**
     * Show loading state for a container
     */
    showContainerLoading(container, message = 'Loading...') {
        if (!container) return;
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'container-loading';
        loadingDiv.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted">${message}</p>
            </div>
        `;
        
        container.innerHTML = '';
        container.appendChild(loadingDiv);
    }

    /**
     * Handle network status changes
     */
    handleNetworkChange(isOnline) {
        if (isOnline) {
            this.hideNetworkError();
            this.showNotification('Connection restored! You are back online.', 'success', 3000);
        } else {
            this.showNetworkError();
        }
    }

    /**
     * Show network error notification
     */
    showNetworkError() {
        // Remove existing network notifications
        const existingNotifications = document.querySelectorAll('.network-notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = 'network-notification network-offline';
        notification.innerHTML = `
            <div class="network-notification-content">
                <i class="fas fa-wifi-slash me-2"></i>
                <span>No internet connection. Please check your network and try again.</span>
            </div>
        `;
        document.body.appendChild(notification);
    }

    /**
     * Hide network error notification
     */
    hideNetworkError() {
        const notifications = document.querySelectorAll('.network-notification');
        notifications.forEach(notification => {
            notification.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
    }

    /**
     * Check if network is available
     */
    isNetworkAvailable() {
        return navigator.onLine;
    }

    /**
     * Show notification with auto-dismiss
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications of the same type
        const existingNotifications = document.querySelectorAll(`.app-notification.notification-${type}`);
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `app-notification notification-${type}`;
        
        const iconMap = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${iconMap[type] || 'fa-info-circle'} me-2"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutRight 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }

    /**
     * Verify network before action
     */
    async checkNetworkBeforeAction(actionName = 'perform this action') {
        if (!this.isNetworkAvailable()) {
            this.showNotification(
                `Cannot ${actionName} - No internet connection. Please check your network.`,
                'error',
                5000
            );
            return false;
        }
        return true;
    }
}

/**
 * API wrapper with loading states and network detection
 */
class APIClient {
    constructor(loadingManager) {
        this.loadingManager = loadingManager || new LoadingManager();
    }

    /**
     * Make API request with loading states and network check
     */
    async request(url, options = {}, config = {}) {
        const {
            showLoading = true,
            loadingMessage = 'Loading...',
            actionName = 'complete this request',
            showSuccessMessage = false,
            successMessage = 'Operation completed successfully',
            showErrorMessage = true
        } = config;

        // Check network availability
        if (!this.loadingManager.isNetworkAvailable()) {
            this.loadingManager.showNotification(
                `Cannot ${actionName} - No internet connection. Please check your network.`,
                'error'
            );
            throw new Error('No network connection');
        }

        // Show loading
        if (showLoading) {
            this.loadingManager.show(loadingMessage);
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            if (showSuccessMessage) {
                this.loadingManager.showNotification(successMessage, 'success', 3000);
            }

            return data;

        } catch (error) {
            console.error('API request error:', error);
            
            if (showErrorMessage) {
                const errorMessage = error.message === 'No network connection' 
                    ? `Cannot ${actionName} - No internet connection. Please check your network.`
                    : `Failed to ${actionName}: ${error.message}`;
                    
                this.loadingManager.showNotification(errorMessage, 'error');
            }
            
            throw error;
        } finally {
            if (showLoading) {
                this.loadingManager.hide();
            }
        }
    }

    /**
     * GET request
     */
    async get(url, config = {}) {
        return this.request(url, { method: 'GET' }, config);
    }

    /**
     * POST request
     */
    async post(url, data, config = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        }, config);
    }

    /**
     * PUT request
     */
    async put(url, data, config = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        }, config);
    }

    /**
     * DELETE request
     */
    async delete(url, config = {}) {
        return this.request(url, { method: 'DELETE' }, config);
    }
}

// Initialize global instances
const loadingManager = new LoadingManager();
const apiClient = new APIClient(loadingManager);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LoadingManager, APIClient, loadingManager, apiClient };
}
