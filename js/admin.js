class AdminDashboard {
    constructor() {
        this.authManager = authManager;
        this.init();
    }

    async init() {
        if (!this.authManager.isAdmin()) {
            window.location.href = '/';
            return;
        }

        await this.loadDashboardStats();
        await this.loadBusinesses();
        await this.loadLeads();
        await this.loadAppointments();
        this.setupEventListeners();
        this.setupCharts();
    }

    async loadDashboardStats() {
        try {
            // Load businesses count
            const businessesResponse = await fetch('/api/admin/businesses', {
                headers: this.authManager.getAuthHeaders()
            });
            const businesses = await businessesResponse.json();
            document.getElementById('totalBusinesses').textContent = businesses.length;

            // Load appointments count
            const appointmentsResponse = await fetch('/api/admin/appointments', {
                headers: this.authManager.getAuthHeaders()
            });
            const appointments = await appointmentsResponse.json();
            document.getElementById('totalAppointments').textContent = appointments.length;

            // Load leads count
            const leadsResponse = await fetch('/api/admin/leads', {
                headers: this.authManager.getAuthHeaders()
            });
            const leads = await leadsResponse.json();
            const newLeads = leads.filter(lead => lead.status === 'new').length;
            document.getElementById('newLeads').textContent = newLeads;

            // Calculate revenue (sum of all completed appointment prices)
            const revenue = appointments
                .filter(apt => apt.status === 'completed')
                .reduce((sum, apt) => sum + (parseFloat(apt.services?.price) || 0), 0);
            document.getElementById('totalRevenue').textContent = `$${revenue.toFixed(2)}`;

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
    }

    async loadBusinesses() {
        try {
            const response = await fetch('/api/admin/businesses', {
                headers: this.authManager.getAuthHeaders()
            });
            const businesses = await response.json();
            this.renderBusinesses(businesses);
            this.renderRecentBusinesses(businesses);

        } catch (error) {
            console.error('Error loading businesses:', error);
        }
    }

    renderBusinesses(businesses) {
        const tbody = document.getElementById('businessesTableBody');
        tbody.innerHTML = '';

        businesses.forEach(business => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${business.business_name}</td>
                <td>${business.owner_name}</td>
                <td>${business.email}</td>
                <td>${business.phone}</td>
                <td>${new Date(business.created_at).toLocaleDateString()}</td>
                <td>
                    <span class="badge bg-success">Active</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-business" data-id="${business.id}">
                        View
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-business" data-id="${business.id}">
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.attachBusinessEventListeners();
    }

    renderRecentBusinesses(businesses) {
        const tbody = document.getElementById('recentBusinessesBody');
        tbody.innerHTML = '';

        const recentBusinesses = businesses.slice(0, 5); // Show last 5 businesses

        recentBusinesses.forEach(business => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${business.business_name}</td>
                <td>${business.owner_name}</td>
                <td>${business.email}</td>
                <td>${new Date(business.created_at).toLocaleDateString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    attachBusinessEventListeners() {
        // View business buttons
        document.querySelectorAll('.view-business').forEach(button => {
            button.addEventListener('click', (e) => {
                const businessId = e.target.dataset.id;
                this.viewBusinessDetails(businessId);
            });
        });

        // Delete business buttons
        document.querySelectorAll('.delete-business').forEach(button => {
            button.addEventListener('click', (e) => {
                const businessId = e.target.dataset.id;
                this.deleteBusiness(businessId);
            });
        });
    }

    async viewBusinessDetails(businessId) {
        try {
            const response = await fetch('/api/admin/businesses', {
                headers: this.authManager.getAuthHeaders()
            });
            const businesses = await response.json();
            const business = businesses.find(b => b.id === businessId);

            if (business) {
                document.getElementById('detailBusinessName').textContent = business.business_name;
                document.getElementById('detailOwnerName').textContent = business.owner_name;
                document.getElementById('detailEmail').textContent = business.email;
                document.getElementById('detailPhone').textContent = business.phone;
                document.getElementById('detailRegDate').textContent = new Date(business.created_at).toLocaleDateString();

                // Load business appointments count
                const appointmentsResponse = await fetch('/api/admin/appointments', {
                    headers: this.authManager.getAuthHeaders()
                });
                const appointments = await appointmentsResponse.json();
                const businessAppointments = appointments.filter(apt => apt.business_id === businessId);
                document.getElementById('detailTotalAppointments').textContent = businessAppointments.length;

                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('businessDetailsModal'));
                modal.show();
            }
        } catch (error) {
            console.error('Error viewing business details:', error);
        }
    }

    async deleteBusiness(businessId) {
        if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
            return;
        }

        try {
            // Note: You'll need to add a DELETE endpoint for businesses in your server
            const response = await fetch(`/api/admin/businesses/${businessId}`, {
                method: 'DELETE',
                headers: this.authManager.getAuthHeaders()
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Business deleted successfully!', 'success');
                this.loadBusinesses();
                this.loadDashboardStats();
            } else {
                this.showNotification(data.error || 'Failed to delete business', 'error');
            }
        } catch (error) {
            console.error('Error deleting business:', error);
            this.showNotification('Failed to delete business', 'error');
        }
    }

    async loadLeads() {
        try {
            const response = await fetch('/api/admin/leads', {
                headers: this.authManager.getAuthHeaders()
            });
            const leads = await response.json();
            this.renderLeads(leads);
            this.updateLeadsChart(leads);

        } catch (error) {
            console.error('Error loading leads:', error);
        }
    }

    renderLeads(leads) {
        const tbody = document.getElementById('leadsTableBody');
        tbody.innerHTML = '';

        leads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${lead.business_name}</td>
                <td>${lead.owner_name}</td>
                <td>
                    <div>${lead.contact_email}</div>
                    <small class="text-muted">${lead.contact_phone}</small>
                </td>
                <td>${new Date(lead.created_at).toLocaleDateString()}</td>
                <td>
                    <span class="badge ${this.getLeadStatusBadgeClass(lead.status)}">
                        ${lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                </td>
                <td>${lead.last_contacted ? new Date(lead.last_contacted).toLocaleDateString() : 'Never'}</td>
                <td>
                    <select class="form-select form-select-sm lead-status-select" data-id="${lead.id}">
                        <option value="new" ${lead.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>Converted</option>
                        <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>Lost</option>
                    </select>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.attachLeadEventListeners();
    }

    getLeadStatusBadgeClass(status) {
        const classes = {
            'new': 'bg-warning',
            'contacted': 'bg-primary',
            'converted': 'bg-success',
            'lost': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    attachLeadEventListeners() {
        document.querySelectorAll('.lead-status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const leadId = e.target.dataset.id;
                const newStatus = e.target.value;
                this.updateLeadStatus(leadId, newStatus);
            });
        });
    }

    async updateLeadStatus(leadId, status) {
        try {
            const response = await fetch(`/api/admin/leads/${leadId}`, {
                method: 'PUT',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Lead status updated successfully!', 'success');
                this.loadLeads();
                this.loadDashboardStats();
            } else {
                this.showNotification(data.error || 'Failed to update lead status', 'error');
            }
        } catch (error) {
            console.error('Error updating lead status:', error);
            this.showNotification('Failed to update lead status', 'error');
        }
    }

    async loadAppointments() {
        try {
            const response = await fetch('/api/admin/appointments', {
                headers: this.authManager.getAuthHeaders()
            });
            const appointments = await response.json();
            this.renderAppointments(appointments);

        } catch (error) {
            console.error('Error loading appointments:', error);
        }
    }

    renderAppointments(appointments) {
        const tbody = document.getElementById('allAppointmentsTableBody');
        tbody.innerHTML = '';

        appointments.forEach(apt => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${apt.businesses?.business_name || 'N/A'}</td>
                <td>
                    <div>${apt.customers?.name || 'N/A'}</div>
                    <small class="text-muted">${apt.customers?.phone || 'N/A'}</small>
                </td>
                <td>${apt.services?.name || 'N/A'}</td>
                <td>${apt.stylists?.name || 'N/A'}</td>
                <td>
                    <div>${new Date(apt.appointment_date).toLocaleDateString()}</div>
                    <small class="text-muted">${apt.appointment_time}</small>
                </td>
                <td>$${apt.services?.price || '0.00'}</td>
                <td>
                    <span class="badge ${this.getAppointmentStatusBadgeClass(apt.status)}">
                        ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-appointment" data-id="${apt.id}">
                        View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.attachAppointmentEventListeners();
    }

    getAppointmentStatusBadgeClass(status) {
        const classes = {
            'pending': 'bg-warning',
            'confirmed': 'bg-primary',
            'completed': 'bg-success',
            'cancelled': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    attachAppointmentEventListeners() {
        document.querySelectorAll('.view-appointment').forEach(button => {
            button.addEventListener('click', (e) => {
                const appointmentId = e.target.dataset.id;
                this.viewAppointmentDetails(appointmentId);
            });
        });
    }

    async viewAppointmentDetails(appointmentId) {
        try {
            const response = await fetch('/api/admin/appointments', {
                headers: this.authManager.getAuthHeaders()
            });
            const appointments = await response.json();
            const appointment = appointments.find(apt => apt.id === appointmentId);

            if (appointment) {
                // Create and show appointment details modal
                this.showAppointmentModal(appointment);
            }
        } catch (error) {
            console.error('Error viewing appointment details:', error);
        }
    }

    showAppointmentModal(appointment) {
        const modalHTML = `
            <div class="modal fade" id="appointmentDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Appointment Details</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Business:</strong>
                                    <p>${appointment.businesses?.business_name || 'N/A'}</p>
                                </div>
                                <div class="col-md-6">
                                    <strong>Customer:</strong>
                                    <p>${appointment.customers?.name || 'N/A'} (${appointment.customers?.phone || 'N/A'})</p>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Service:</strong>
                                    <p>${appointment.services?.name || 'N/A'} - $${appointment.services?.price || '0.00'}</p>
                                </div>
                                <div class="col-md-6">
                                    <strong>Stylist:</strong>
                                    <p>${appointment.stylists?.name || 'N/A'}</p>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <strong>Date & Time:</strong>
                                    <p>${new Date(appointment.appointment_date).toLocaleDateString()} at ${appointment.appointment_time}</p>
                                </div>
                                <div class="col-md-6">
                                    <strong>Status:</strong>
                                    <p><span class="badge ${this.getAppointmentStatusBadgeClass(appointment.status)}">${appointment.status}</span></p>
                                </div>
                            </div>
                            ${appointment.special_requests ? `
                            <div class="row">
                                <div class="col-12">
                                    <strong>Special Requests:</strong>
                                    <p>${appointment.special_requests}</p>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal
        const existingModal = document.getElementById('appointmentDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal'));
        modal.show();
    }

    setupCharts() {
        this.setupLeadsChart();
    }

    setupLeadsChart() {
        // This will be populated when leads are loaded
    }

    updateLeadsChart(leads) {
        const ctx = document.getElementById('leadsPieChart');
        if (!ctx) return;

        // Count leads by status
        const statusCounts = {
            new: 0,
            contacted: 0,
            converted: 0,
            lost: 0
        };

        leads.forEach(lead => {
            statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
        });

        // Create pie chart
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['New', 'Contacted', 'Converted', 'Lost'],
                datasets: [{
                    data: [statusCounts.new, statusCounts.contacted, statusCounts.converted, statusCounts.lost],
                    backgroundColor: [
                        '#ffc107',
                        '#007bff',
                        '#28a745',
                        '#dc3545'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Tab navigation
        const tabLinks = document.querySelectorAll('.admin-nav-item');
        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('href').substring(1);
                this.showSection(targetSection);
            });
        });

        // Filter events
        const leadStatusFilter = document.getElementById('leadStatusFilter');
        if (leadStatusFilter) {
            leadStatusFilter.addEventListener('change', () => {
                this.filterLeads();
            });
        }

        const appointmentStatusFilter = document.getElementById('appointmentStatusFilter');
        if (appointmentStatusFilter) {
            appointmentStatusFilter.addEventListener('change', () => {
                this.filterAppointments();
            });
        }

        const appointmentDateFilter = document.getElementById('appointmentDateFilter');
        if (appointmentDateFilter) {
            appointmentDateFilter.addEventListener('change', () => {
                this.filterAppointments();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.authManager.logout();
            });
        }
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.admin-content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update active nav item
        document.querySelectorAll('.admin-nav-item').forEach(navItem => {
            navItem.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[href="#${sectionId}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    }

    filterLeads() {
        const statusFilter = document.getElementById('leadStatusFilter').value;
        const rows = document.querySelectorAll('#leadsTableBody tr');

        rows.forEach(row => {
            const status = row.querySelector('.badge').textContent.toLowerCase();
            if (statusFilter === 'all' || status === statusFilter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    filterAppointments() {
        const statusFilter = document.getElementById('appointmentStatusFilter').value;
        const dateFilter = document.getElementById('appointmentDateFilter').value;
        const rows = document.querySelectorAll('#allAppointmentsTableBody tr');

        rows.forEach(row => {
            const status = row.querySelector('.badge').textContent.toLowerCase();
            const date = row.cells[4].querySelector('div').textContent;
            
            let showRow = true;

            if (statusFilter !== 'all' && status !== statusFilter) {
                showRow = false;
            }

            if (dateFilter && date !== new Date(dateFilter).toLocaleDateString()) {
                showRow = false;
            }

            row.style.display = showRow ? '' : 'none';
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to page
        const container = document.querySelector('.admin-content');
        container.insertBefore(notification, container.firstChild);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize admin dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});