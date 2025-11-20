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
                // Don't logout if on customerauth page - allow guest access
                const isCustomerAuthPage = window.location.pathname === '/customerauth' || 
                                          window.location.pathname.startsWith('/customerauth');
                if (isCustomerAuthPage) {
                    // Clear invalid token but stay on customerauth page
                    this.token = null;
                    this.currentUser = null;
                    localStorage.removeItem('authToken');
                } else {
                    this.logout();
                }
            }
        } catch (error) {
            console.error('Token verification error:', error);
            // Don't logout if on customerauth page - allow guest access
            const isCustomerAuthPage = window.location.pathname === '/customerauth' || 
                                      window.location.pathname.startsWith('/customerauth');
            if (isCustomerAuthPage) {
                // Clear invalid token but stay on customerauth page
                this.token = null;
                this.currentUser = null;
                localStorage.removeItem('authToken');
            } else {
                this.logout();
            }
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
            // If customer is on customerauth page, redirect to customer booking page with business ID
            if (path === '/customerauth' || path.startsWith('/customerauth')) {
                const urlParams = new URLSearchParams(window.location.search);
                const businessId = urlParams.get('business');
                if (businessId) {
                    window.location.href = `/customer?business=${businessId}`;
                } else {
                    window.location.href = '/customer';
                }
            }
            // Customers can stay on /customer pages without forced redirect
        }
    }

    updateUIForLoggedOutUser() {
        const path = window.location.pathname;
        // Allow guest access to customerauth, customer pages, and index
        const allowedPaths = ['/', '/customerauth', '/customer', '/terms.html', '/privacy.html'];
        const isAllowedPath = allowedPaths.some(allowed => path === allowed || path.startsWith(allowed));
        
        if (!isAllowedPath) {
            // Only redirect if on restricted pages (business/admin)
            window.location.href = '/';
        }
    }

    async businessRegister(formData) {
        // Check network availability
        if (typeof loadingManager !== 'undefined' && !loadingManager.checkNetworkBeforeAction('register business')) {
            return;
        }

        if (typeof loadingManager !== 'undefined') {
            loadingManager.show('Registering business...');
        }

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
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification('Business registered successfully! Please login.', 'success');
                } else {
                    alert('Business registered successfully! Please login.');
                }
                closeModal('businessRegisterModal');
                document.getElementById('businessRegisterForm').reset();
            } else {
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification(data.error || 'Registration failed', 'error');
                } else {
                    alert(data.error || 'Registration failed');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (typeof loadingManager !== 'undefined') {
                loadingManager.showNotification('Registration failed. Please check your connection and try again.', 'error');
            } else {
                alert('Registration failed. Please check your connection and try again.');
            }
        } finally {
            if (typeof loadingManager !== 'undefined') {
                loadingManager.hide();
            }
        }
    }

    async businessLogin(email, password, rememberMe = false) {
        // Check network availability
        if (typeof loadingManager !== 'undefined' && !loadingManager.checkNetworkBeforeAction('login')) {
            return;
        }

        if (typeof loadingManager !== 'undefined') {
            loadingManager.show('Logging in...');
        }

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
                
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification('Login successful! Redirecting...', 'success', 1500);
                    setTimeout(() => {
                        window.location.href = '/business';
                    }, 1500);
                } else {
                    window.location.href = '/business';
                }
            } else {
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification(data.error || 'Login failed', 'error');
                } else {
                    alert(data.error || 'Login failed');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (typeof loadingManager !== 'undefined') {
                loadingManager.showNotification('Login failed. Please check your connection and try again.', 'error');
            } else {
                alert('Login failed. Please check your connection and try again.');
            }
        } finally {
            if (typeof loadingManager !== 'undefined') {
                loadingManager.hide();
            }
        }
    }

    async adminLogin(email, password, rememberMe = false) {
        // Check network availability
        if (typeof loadingManager !== 'undefined' && !loadingManager.checkNetworkBeforeAction('login')) {
            return;
        }

        if (typeof loadingManager !== 'undefined') {
            loadingManager.show('Logging in...');
        }

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
                
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification('Login successful! Redirecting...', 'success', 1500);
                    setTimeout(() => {
                        window.location.href = '/admin';
                    }, 1500);
                } else {
                    window.location.href = '/admin';
                }
            } else {
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification(data.error || 'Admin login failed', 'error');
                } else {
                    alert(data.error || 'Admin login failed');
                }
            }
        } catch (error) {
            console.error('Admin login error:', error);
            if (typeof loadingManager !== 'undefined') {
                loadingManager.showNotification('Admin login failed. Please check your connection and try again.', 'error');
            } else {
                alert('Admin login failed. Please check your connection and try again.');
            }
        } finally {
            if (typeof loadingManager !== 'undefined') {
                loadingManager.hide();
            }
        }
    }

    async customerRegister(formData) {
        // Check network availability
        if (typeof loadingManager !== 'undefined' && !loadingManager.checkNetworkBeforeAction('register')) {
            return false;
        }

        if (typeof loadingManager !== 'undefined') {
            loadingManager.show('Creating your account...');
        }

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
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification('Registration successful!', 'success');
                } else {
                    alert('Registration successful!');
                }
                return true;
            } else {
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification(data.error || 'Registration failed', 'error');
                } else {
                    alert(data.error || 'Registration failed');
                }
                return false;
            }
        } catch (error) {
            console.error('Customer registration error:', error);
            if (typeof loadingManager !== 'undefined') {
                loadingManager.showNotification('Registration failed. Please check your connection and try again.', 'error');
            } else {
                alert('Registration failed. Please check your connection and try again.');
            }
            return false;
        } finally {
            if (typeof loadingManager !== 'undefined') {
                loadingManager.hide();
            }
        }
    }

    async customerLogin(email, password, rememberMe = false) {
        // Check network availability
        if (typeof loadingManager !== 'undefined' && !loadingManager.checkNetworkBeforeAction('login')) {
            return false;
        }

        if (typeof loadingManager !== 'undefined') {
            loadingManager.show('Logging in...');
        }

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
                
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification('Login successful!', 'success');
                } else {
                    alert('Login successful!');
                }
                return true;
            } else {
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification(data.error || 'Login failed', 'error');
                } else {
                    alert(data.error || 'Login failed');
                }
                return false;
            }
        } catch (error) {
            console.error('Customer login error:', error);
            if (typeof loadingManager !== 'undefined') {
                loadingManager.showNotification('Login failed. Please check your connection and try again.', 'error');
            } else {
                alert('Login failed. Please check your connection and try again.');
            }
            return false;
        } finally {
            if (typeof loadingManager !== 'undefined') {
                loadingManager.hide();
            }
        }
    }

    logout() {
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        
        const path = window.location.pathname;
        // If on customerauth page, preserve business ID and reload page
        if (path === '/customerauth' || path.startsWith('/customerauth')) {
            const urlParams = new URLSearchParams(window.location.search);
            const businessId = urlParams.get('business');
            if (businessId) {
                // Stay on customerauth page with business ID
                window.location.href = `/customerauth?business=${businessId}`;
            } else {
                window.location.href = '/';
            }
        } else if (path.startsWith('/customer')) {
            // If on customer page, preserve business ID
            const urlParams = new URLSearchParams(window.location.search);
            const businessId = urlParams.get('business');
            if (businessId) {
                window.location.href = `/customerauth?business=${businessId}`;
            } else {
                window.location.href = '/';
            }
        } else {
            window.location.href = '/';
        }
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
            
            // Validate phone number format (must start with country code +)
            const phone = document.getElementById('businessPhone').value.trim();
            const phoneRegex = /^\+\d{1,3}[\s\-]?\d{6,14}$/;
            
            if (!phoneRegex.test(phone)) {
                if (typeof loadingManager !== 'undefined') {
                    loadingManager.showNotification('Phone number must start with country code (e.g., +27 123456789)', 'error');
                } else {
                    alert('Phone number must start with country code (e.g., +27 123456789)');
                }
                return;
            }
            
            const formData = {
                ownerName: document.getElementById('ownerName').value,
                businessName: document.getElementById('businessName').value,
                phone: phone,
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