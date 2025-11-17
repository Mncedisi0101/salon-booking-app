class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('authToken');
        this.init();
    }

    async init() {
        if (this.token) {
            await this.verifyToken();
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/verify-token', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const data = await response.json();
            
            if (data.valid) {
                this.currentUser = data.user;
                this.updateUIForLoggedInUser();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token verification error:', error);
            this.logout();
        }
    }

    updateUIForLoggedInUser() {
        const path = window.location.pathname;
        const role = this.currentUser?.role;
        if (role === 'business') {
            if (path !== '/business') {
                window.location.href = '/business';
            }
        } else if (role === 'admin') {
            if (path !== '/admin') {
                window.location.href = '/admin';
            }
        } else if (role === 'customer') {
            // Customers typically use /customer; do not force redirect if already there
            if (!path.startsWith('/customer')) {
                // Optional: avoid redirecting from marketing/index
                window.location.href = '/customer';
            }
        }
    }

    updateUIForLoggedOutUser() {
        if (window.location.pathname !== '/' && !window.location.pathname.includes('/customer')) {
            window.location.href = '/';
        }
    }

    async businessRegister(formData) {
        // Check network availability
        if (!loadingManager.checkNetworkBeforeAction('register business')) {
            return;
        }

        loadingManager.show('Registering business...');

        try {
            const response = await fetch('/api/business/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                loadingManager.showNotification('Business registered successfully! Please login.', 'success');
                closeModal('businessRegisterModal');
                document.getElementById('businessRegisterForm').reset();
            } else {
                loadingManager.showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            loadingManager.showNotification('Registration failed. Please check your connection and try again.', 'error');
        } finally {
            loadingManager.hide();
        }
    }

    async businessLogin(email, password, rememberMe = false) {
        // Check network availability
        if (!loadingManager.checkNetworkBeforeAction('login')) {
            return;
        }

        loadingManager.show('Logging in...');

        try {
            const response = await fetch('/api/business/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                localStorage.setItem('authToken', this.token);
                this.currentUser = data.business;
                
                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('rememberedBusinessEmail', email);
                } else {
                    localStorage.removeItem('rememberedBusinessEmail');
                }
                
                loadingManager.showNotification('Login successful! Redirecting...', 'success', 1500);
                setTimeout(() => {
                    window.location.href = '/business';
                }, 1500);
            } else {
                loadingManager.showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            loadingManager.showNotification('Login failed. Please check your connection and try again.', 'error');
        } finally {
            loadingManager.hide();
        }
    }

    async adminLogin(email, password, rememberMe = false) {
        // Check network availability
        if (!loadingManager.checkNetworkBeforeAction('login')) {
            return;
        }

        loadingManager.show('Logging in...');

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                localStorage.setItem('authToken', this.token);
                this.currentUser = data.admin;
                
                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('rememberedAdminEmail', email);
                } else {
                    localStorage.removeItem('rememberedAdminEmail');
                }
                
                loadingManager.showNotification('Login successful! Redirecting...', 'success', 1500);
                setTimeout(() => {
                    window.location.href = '/admin';
                }, 1500);
            } else {
                loadingManager.showNotification(data.error || 'Admin login failed', 'error');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            loadingManager.showNotification('Admin login failed. Please check your connection and try again.', 'error');
        } finally {
            loadingManager.hide();
        }
    }

    async customerRegister(formData) {
        // Check network availability
        if (!loadingManager.checkNetworkBeforeAction('register')) {
            return false;
        }

        loadingManager.show('Creating your account...');

        try {
            const response = await fetch('/api/customer/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                localStorage.setItem('authToken', this.token);
                this.currentUser = data.customer;
                loadingManager.showNotification('Registration successful!', 'success');
                return true;
            } else {
                loadingManager.showNotification(data.error || 'Registration failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Customer registration error:', error);
            loadingManager.showNotification('Registration failed. Please check your connection and try again.', 'error');
            return false;
        } finally {
            loadingManager.hide();
        }
    }

    async customerLogin(email, password, rememberMe = false) {
        // Check network availability
        if (!loadingManager.checkNetworkBeforeAction('login')) {
            return false;
        }

        loadingManager.show('Logging in...');

        try {
            const response = await fetch('/api/customer/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                localStorage.setItem('authToken', this.token);
                this.currentUser = data.customer;
                
                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('rememberedCustomerEmail', email);
                } else {
                    localStorage.removeItem('rememberedCustomerEmail');
                }
                
                loadingManager.showNotification('Login successful!', 'success');
                return true;
            } else {
                loadingManager.showNotification(data.error || 'Login failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Customer login error:', error);
            loadingManager.showNotification('Login failed. Please check your connection and try again.', 'error');
            return false;
        } finally {
            loadingManager.hide();
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        window.location.href = '/';
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    isAuthenticated() {
        // Consider user authenticated if a token exists; user details may be populated after verify
        return Boolean(this.token);
    }

    isBusiness() {
        // Allow access if token exists; role will be confirmed after verification
        return this.isAuthenticated() && (!this.currentUser || this.currentUser.role === 'business');
    }

    isAdmin() {
        return this.isAuthenticated() && (!this.currentUser || this.currentUser.role === 'admin');
    }

    isCustomer() {
        return this.isAuthenticated() && (!this.currentUser || this.currentUser.role === 'customer');
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Event listeners for authentication
document.addEventListener('DOMContentLoaded', function() {
    // Business registration
    const businessRegisterForm = document.getElementById('businessRegisterForm');
    if (businessRegisterForm) {
        businessRegisterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = {
                ownerName: document.getElementById('ownerName').value,
                businessName: document.getElementById('businessName').value,
                phone: document.getElementById('businessPhone').value,
                email: document.getElementById('businessEmail').value,
                password: document.getElementById('businessPassword').value
            };
            authManager.businessRegister(formData);
        });
    }

    // Business login
    const businessLoginForm = document.getElementById('businessLoginForm');
    if (businessLoginForm) {
        // Restore remembered email if exists
        const rememberedBusinessEmail = localStorage.getItem('rememberedBusinessEmail');
        if (rememberedBusinessEmail) {
            const emailInput = document.getElementById('businessLoginEmail');
            const rememberCheckbox = document.getElementById('rememberBusiness');
            if (emailInput) emailInput.value = rememberedBusinessEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
        
        businessLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('businessLoginEmail').value;
            const password = document.getElementById('businessLoginPassword').value;
            const rememberMe = document.getElementById('rememberBusiness')?.checked || false;
            authManager.businessLogin(email, password, rememberMe);
        });
    }

    // Admin login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        // Restore remembered email if exists
        const rememberedAdminEmail = localStorage.getItem('rememberedAdminEmail');
        if (rememberedAdminEmail) {
            const emailInput = document.getElementById('adminEmail');
            const rememberCheckbox = document.getElementById('rememberMe');
            if (emailInput) emailInput.value = rememberedAdminEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
        
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            authManager.adminLogin(email, password, rememberMe);
        });
    }

    // Customer registration
    const customerRegisterForm = document.getElementById('customerRegisterForm');
    if (customerRegisterForm) {
        customerRegisterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = {
                name: document.getElementById('customerName').value,
                email: document.getElementById('customerEmail').value,
                phone: document.getElementById('customerPhone').value,
                password: document.getElementById('customerPassword').value
            };
            const success = await authManager.customerRegister(formData);
            if (success) {
                alert('Registration successful! You can now book appointments.');
                closeModal('customerRegisterModal');
            }
        });
    }

    // Customer login
    const customerLoginForm = document.getElementById('customerLoginForm');
    if (customerLoginForm) {
        // Restore remembered email if exists
        const rememberedCustomerEmail = localStorage.getItem('rememberedCustomerEmail');
        if (rememberedCustomerEmail) {
            const emailInput = document.getElementById('customerLoginEmail');
            const rememberCheckbox = document.getElementById('rememberCustomer');
            if (emailInput) emailInput.value = rememberedCustomerEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
        
        customerLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('customerLoginEmail').value;
            const password = document.getElementById('customerLoginPassword').value;
            const rememberMe = document.getElementById('rememberCustomer')?.checked || false;
            const success = await authManager.customerLogin(email, password, rememberMe);
            if (success) {
                alert('Login successful!');
                closeModal('customerLoginModal');
            }
        });
    }

    // Logout buttons
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            authManager.logout();
        });
    });
});