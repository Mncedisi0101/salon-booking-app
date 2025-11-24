// Main JavaScript for SalonPro Landing Page

class MainApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupModalHandlers();
        this.setupFormSubmissions();
        this.setupSmoothScrolling();
        this.checkAuthStatus();
        this.setupCustomerAuthModal();
        this.setupCustomerAuthPage();
    }

    // Setup Customer Auth Page functionality (for customerauth.html)
    setupCustomerAuthPage() {
        // Only run on customerauth.html page
        if (!window.location.pathname.includes('customerauth')) {
            return;
        }

        // Get business ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = urlParams.get('business');

        // Tab switching functionality
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const switchToSignup = document.getElementById('switchToSignup');
        const switchToLogin = document.getElementById('switchToLogin');

        if (!loginTab || !signupTab) return;

        // Switch to login tab
        const showLogin = () => {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        };

        // Switch to signup tab
        const showSignup = () => {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.style.display = 'block';
            loginForm.style.display = 'none';
        };

        // Event listeners for tab switching
        loginTab.addEventListener('click', showLogin);
        signupTab.addEventListener('click', showSignup);
        if (switchToSignup) {
            switchToSignup.addEventListener('click', (e) => {
                e.preventDefault();
                showSignup();
            });
        }
        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                showLogin();
            });
        }

        // Password toggle functionality
        const setupPasswordToggle = (passwordFieldId, toggleButtonId) => {
            const passwordField = document.getElementById(passwordFieldId);
            const toggleButton = document.getElementById(toggleButtonId);

            if (!passwordField || !toggleButton) return;

            toggleButton.addEventListener('click', function() {
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);

                // Toggle eye icon
                const icon = this.querySelector('i');
                if (type === 'password') {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            });
        };

        // Setup password toggles
        setupPasswordToggle('loginPassword', 'toggleLoginPassword');
        setupPasswordToggle('signupPassword', 'toggleSignupPassword');
        setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');

        // Form submission handlers
        // Note: loginFormElement handler is now in customerauth.html inline script
        // to properly handle business ID from URL params and validation
        // This prevents duplicate form submissions
        const loginFormElement = document.getElementById('loginFormElement');
        if (loginFormElement) {
            console.log('ℹ️ Login form found - handler is in customerauth.html inline script');
            
            // Keep the remembered email restoration functionality here
            const rememberedCustomerEmail = localStorage.getItem('rememberedCustomerEmail');
            if (rememberedCustomerEmail) {
                const emailInput = document.getElementById('loginEmail');
                const rememberCheckbox = document.getElementById('rememberMeLogin');
                if (emailInput) emailInput.value = rememberedCustomerEmail;
                if (rememberCheckbox) rememberCheckbox.checked = true;
            }
            
            // Event listener removed to prevent duplicate submissions
            // The inline script in customerauth.html handles this form with proper business ID validation
        }

        // Note: signupFormElement handler is now in customerauth.html inline script
        // to properly handle business ID from URL params
        // This prevents duplicate form submissions
        const signupFormElement = document.getElementById('signupFormElement');
        if (signupFormElement) {
            console.log('ℹ️ Signup form found - handler is in customerauth.html inline script');
            // Event listener removed to prevent duplicate submissions
            // The inline script in customerauth.html handles this form with proper business ID validation
        }

        // Social login buttons (placeholder functionality)
        document.querySelectorAll('.social-btn').forEach(button => {
            button.addEventListener('click', () => {
                alert('Social login coming soon!');
            });
        });
    }

    setupModalHandlers() {
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="display: block"]');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
        });
    }

    setupFormSubmissions() {
        // Business Login Form
        const businessLoginForm = document.getElementById('businessLoginForm');
        if (businessLoginForm) {
            businessLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBusinessLogin();
            });
        }

        // Business Registration Form
        // Note: Business registration is handled by auth.js to avoid duplicate submissions
        // The authManager handles the form submission with proper validation

        // Admin Login Form
        const adminLoginForm = document.getElementById('adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }

        // Password confirmation validation
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }

    setupCustomerAuthModal() {
        // Customer Authentication Modal (for booking flow)
        const customerAuthHTML = `
            <div id="customerAuthModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Customer Authentication</h2>
                        <span class="close" onclick="closeModal('customerAuthModal')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <ul class="nav nav-tabs" id="customerAuthTabs">
                            <li class="nav-item">
                                <a class="nav-link active" data-bs-toggle="tab" href="#customerLoginTab">Login</a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" data-bs-toggle="tab" href="#customerRegisterTab">Register</a>
                            </li>
                        </ul>
                        
                        <div class="tab-content mt-3">
                            <div class="tab-pane fade show active" id="customerLoginTab">
                                <form id="customerLoginForm">
                                    <div class="form-group">
                                        <label for="customerLoginEmail">Email *</label>
                                        <input type="email" id="customerLoginEmail" name="customerLoginEmail" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="customerLoginPassword">Password *</label>
                                        <input type="password" id="customerLoginPassword" name="customerLoginPassword" required>
                                    </div>
                                    <div class="form-group checkbox-group">
                                        <input type="checkbox" id="rememberCustomer" name="rememberCustomer">
                                        <label for="rememberCustomer">Remember me</label>
                                    </div>
                                    <div class="form-actions">
                                        <button type="submit" class="btn btn-primary">Login</button>
                                    </div>
                                </form>
                            </div>
                            <div class="tab-pane fade" id="customerRegisterTab">
                                <form id="customerRegisterForm">
                                    <div class="form-group">
                                        <label for="customerName">Full Name *</label>
                                        <input type="text" id="customerName" name="customerName" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="customerEmail">Email *</label>
                                        <input type="email" id="customerEmail" name="customerEmail" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="customerPhone">Phone Number *</label>
                                        <input type="tel" id="customerPhone" name="customerPhone" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="customerPassword">Password *</label>
                                        <input type="password" id="customerPassword" name="customerPassword" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="customerConfirmPassword">Confirm Password *</label>
                                        <input type="password" id="customerConfirmPassword" name="customerConfirmPassword" required>
                                    </div>
                                    <div class="form-actions">
                                        <button type="submit" class="btn btn-primary">Register</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body if not exists
        if (!document.getElementById('customerAuthModal')) {
            document.body.insertAdjacentHTML('beforeend', customerAuthHTML);
        }

        // Setup customer auth form handlers
        const customerLoginForm = document.getElementById('customerLoginForm');
        if (customerLoginForm) {
            customerLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCustomerLogin();
            });
        }

        const customerRegisterForm = document.getElementById('customerRegisterForm');
        if (customerRegisterForm) {
            customerRegisterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCustomerRegistration();
            });
        }
    }

    setupSmoothScrolling() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    async checkAuthStatus() {
        try {
            if (authManager.token) {
                const isValid = await authManager.verifyToken();
                if (isValid) {
                    // User is already logged in, redirect to appropriate dashboard
                    if (authManager.currentUser.role === 'business') {
                        window.location.href = '/business';
                    } else if (authManager.currentUser.role === 'admin') {
                        window.location.href = '/admin';
                    }
                    // Customer can stay on current page
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }

    validatePasswordMatch() {
        const password = document.getElementById('businessPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const submitButton = document.querySelector('#businessRegisterForm button[type="submit"]');

        if (password && confirmPassword && submitButton) {
            if (password.value !== confirmPassword.value) {
                confirmPassword.style.borderColor = 'var(--danger)';
                submitButton.disabled = true;
                submitButton.title = 'Passwords do not match';
            } else {
                confirmPassword.style.borderColor = 'var(--success)';
                submitButton.disabled = false;
                submitButton.title = '';
            }
        }
    }

    async handleBusinessLogin() {
        const form = document.getElementById('businessLoginForm');
        const formData = new FormData(form);
        
        const loginData = {
            email: formData.get('businessLoginEmail'),
            password: formData.get('businessLoginPassword')
        };

        // Basic validation
        if (!loginData.email || !loginData.password) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitButton.disabled = true;

            await authManager.businessLogin(loginData.email, loginData.password);
            
        } catch (error) {
            console.error('Business login error:', error);
            this.showNotification('Login failed. Please check your connection and try again.', 'error');
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Login to Dashboard';
                submitButton.disabled = false;
            }
        }
    }

    async handleBusinessRegistration() {
        const form = document.getElementById('businessRegisterForm');
        const formData = new FormData(form);
        
        // Basic validation
        if (!this.validateBusinessForm(formData)) {
            return;
        }

        const businessData = {
            ownerName: formData.get('ownerName'),
            businessName: formData.get('businessName'),
            phone: formData.get('businessPhone'),
            email: formData.get('businessEmail'),
            password: formData.get('businessPassword')
        };

        try {
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
            submitButton.disabled = true;

            await authManager.businessRegister(businessData);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registration failed. Please check your connection and try again.', 'error');
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Register Business';
                submitButton.disabled = false;
            }
        }
    }

    async handleAdminLogin() {
        const form = document.getElementById('adminLoginForm');
        const formData = new FormData(form);
        
        const loginData = {
            email: formData.get('adminEmail'),
            password: formData.get('adminPassword')
        };

        // Basic validation
        if (!loginData.email || !loginData.password) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitButton.disabled = true;

            await authManager.adminLogin(loginData.email, loginData.password);
            
        } catch (error) {
            console.error('Admin login error:', error);
            this.showNotification('Login failed. Please check your connection and try again.', 'error');
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Login to Dashboard';
                submitButton.disabled = false;
            }
        }
    }

    async handleCustomerLogin() {
        const form = document.getElementById('customerLoginForm');
        const formData = new FormData(form);
        
        const loginData = {
            email: formData.get('customerLoginEmail'),
            password: formData.get('customerLoginPassword')
        };

        if (!loginData.email || !loginData.password) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitButton.disabled = true;

            const success = await authManager.customerLogin(loginData.email, loginData.password);
            
            if (success) {
                this.showNotification('Login successful!', 'success');
                // Trigger event for customer booking
                document.dispatchEvent(new Event('customerAuthenticated'));
            }
            
        } catch (error) {
            console.error('Customer login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        } finally {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Login';
                submitButton.disabled = false;
            }
        }
    }

    async handleCustomerRegistration() {
        const form = document.getElementById('customerRegisterForm');
        const formData = new FormData(form);
        
        // Validate passwords match
        const password = formData.get('customerPassword');
        const confirmPassword = formData.get('customerConfirmPassword');
        
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match.', 'error');
            return;
        }

        const customerData = {
            name: formData.get('customerName'),
            email: formData.get('customerEmail'),
            phone: formData.get('customerPhone'),
            password: password
        };

        // Basic validation
        if (!customerData.name || !customerData.email || !customerData.phone || !customerData.password) {
            this.showNotification('Please fill in all required fields.', 'error');
            return;
        }

        try {
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
            submitButton.disabled = true;

            const success = await authManager.customerRegister(customerData);
            
            if (success) {
                this.showNotification('Registration successful!', 'success');
                // Trigger event for customer booking
                document.dispatchEvent(new Event('customerAuthenticated'));
            }
            
        } catch (error) {
            console.error('Customer registration error:', error);
            this.showNotification('Registration failed. Please try again.', 'error');
        } finally {
            const submitButton = form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Register';
                submitButton.disabled = false;
            }
        }
    }

    validateBusinessForm(formData) {
        const ownerName = formData.get('ownerName');
        const businessName = formData.get('businessName');
        const phone = formData.get('businessPhone');
        const email = formData.get('businessEmail');
        const password = formData.get('businessPassword');
        const confirmPassword = formData.get('confirmPassword');
        const terms = formData.get('terms');

        // Check required fields
        if (!ownerName || !businessName || !phone || !email || !password || !confirmPassword) {
            this.showNotification('Please fill in all required fields.', 'error');
            return false;
        }

        // Check password match
        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match.', 'error');
            return false;
        }

        // Check password strength
        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters long.', 'error');
            return false;
        }

        // Check email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email address.', 'error');
            return false;
        }

        // Check phone format (basic validation)
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
            this.showNotification('Please enter a valid phone number.', 'error');
            return false;
        }

        // Check terms acceptance
        if (!terms) {
            this.showNotification('Please accept the Terms & Conditions.', 'error');
            return false;
        }

        return true;
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
        `;

        notification.querySelector('.notification-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;

        notification.querySelector('.notification-close').style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            margin-left: auto;
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);

        // Add CSS animations
        this.addNotificationStyles();
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'success': 'var(--success)',
            'error': 'var(--danger)',
            'warning': 'var(--warning)',
            'info': 'var(--info)'
        };
        return colors[type] || 'var(--info)';
    }

    addNotificationStyles() {
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // Add fade-in animation
            modal.style.animation = 'modalSlideIn 0.3s ease';
            
            // Focus on first input
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 300);
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.animation = 'modalSlideOut 0.3s ease';
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
    }
}

// Modal switching functions
function switchToLogin() {
    closeModal('businessRegisterModal');
    setTimeout(() => {
        openModal('businessLoginModal');
    }, 300);
}

function switchToRegister() {
    closeModal('businessLoginModal');
    setTimeout(() => {
        openModal('businessRegisterModal');
    }, 300);
}

function openCustomerAuth() {
    openModal('customerAuthModal');
}

// Modal Functions
function openModal(modalId) {
    if (window.mainApp) {
        window.mainApp.openModal(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
}

function closeModal(modalId) {
    if (window.mainApp) {
        window.mainApp.closeModal(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
}

// Scroll to features section
function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Toggle mobile navigation
function toggleMobileNav() {
    const navActions = document.getElementById('navActions');
    const navToggle = document.getElementById('navToggle');
    
    if (navActions) {
        navActions.classList.toggle('active');
        
        // Update icon
        const icon = navToggle.querySelector('i');
        if (navActions.classList.contains('active')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

// Close mobile nav when clicking outside
document.addEventListener('click', (e) => {
    const navActions = document.getElementById('navActions');
    const navToggle = document.getElementById('navToggle');
    const navContainer = document.querySelector('.nav-container');
    
    if (navActions && navActions.classList.contains('active')) {
        if (!navContainer.contains(e.target)) {
            navActions.classList.remove('active');
            const icon = navToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
});

// Add modal animation styles
function addModalStyles() {
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes modalSlideOut {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(-50px);
                }
            }
            
            .modal {
                animation-duration: 0.3s;
                animation-fill-mode: both;
            }

            /* Tab styles for customer auth */
            .nav-tabs .nav-link {
                color: var(--dark);
                border: none;
                padding: 0.75rem 1.5rem;
            }

            .nav-tabs .nav-link.active {
                color: var(--orange-soda);
                border-bottom: 2px solid var(--orange-soda);
                background: transparent;
            }

            .nav-tabs .nav-link:hover {
                border-color: transparent;
                color: var(--orange-soda);
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    addModalStyles();
    window.mainApp = new MainApp();
    
    // Add input validation styles
    const style = document.createElement('style');
    style.textContent = `
        input:invalid {
            border-color: var(--danger);
        }
        
        input:valid {
            border-color: var(--success);
        }
        
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        
        .loading::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid var(--orange-soda);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});

// Global functions for external access
window.openModal = openModal;
window.closeModal = closeModal;
window.scrollToFeatures = scrollToFeatures;
window.toggleMobileNav = toggleMobileNav;
window.switchToLogin = switchToLogin;
window.switchToRegister = switchToRegister;
window.openCustomerAuth = openCustomerAuth;