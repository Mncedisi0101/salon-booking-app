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
                alert('Business registered successfully! Please login.');
                closeModal('businessRegisterModal');
                document.getElementById('businessRegisterForm').reset();
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed. Please try again.');
        }
    }

    async businessLogin(email, password) {
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
                window.location.href = '/business';
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    async adminLogin(email, password) {
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
                window.location.href = '/admin';
            } else {
                alert(data.error || 'Admin login failed');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            alert('Admin login failed. Please try again.');
        }
    }

    async customerRegister(formData) {
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
                return true;
            } else {
                alert(data.error || 'Registration failed');
                return false;
            }
        } catch (error) {
            console.error('Customer registration error:', error);
            alert('Registration failed. Please try again.');
            return false;
        }
    }

    async customerLogin(email, password) {
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
                return true;
            } else {
                alert(data.error || 'Login failed');
                return false;
            }
        } catch (error) {
            console.error('Customer login error:', error);
            alert('Login failed. Please try again.');
            return false;
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
        businessLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('businessLoginEmail').value;
            const password = document.getElementById('businessLoginPassword').value;
            authManager.businessLogin(email, password);
        });
    }

    // Admin login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            authManager.adminLogin(email, password);
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
        customerLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('customerLoginEmail').value;
            const password = document.getElementById('customerLoginPassword').value;
            const success = await authManager.customerLogin(email, password);
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