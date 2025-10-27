class BusinessDashboard {
    constructor() {
        this.authManager = authManager;
        this.currentBusiness = null;
        this.init();
    }

    async init() {
        if (!this.authManager.isBusiness()) {
            window.location.href = '/';
            return;
        }

        await this.loadBusinessData();
        await this.loadServices();
        await this.loadStylists();
        await this.loadAppointments();
        await this.loadBusinessHours();
        this.setupEventListeners();
        this.updateQRCode();
    }

    async loadBusinessData() {
        try {
            const response = await fetch('/api/business/data', {
                headers: this.authManager.getAuthHeaders()
            });
            
            const data = await response.json();
            this.currentBusiness = data;
            
            const businessNameDisplay = document.getElementById('businessNameDisplay');
            if (businessNameDisplay) businessNameDisplay.textContent = data.business_name;
            const userName = document.getElementById('userName');
            if (userName) userName.textContent = data.owner_name || data.business_name;

        } catch (error) {
            console.error('Error loading business data:', error);
        }
    }

    updateQRCode() {
        if (this.currentBusiness) {
            const qrCodeImg = document.getElementById('qrCodeImage');
            if (qrCodeImg) {
                qrCodeImg.src = `/api/qr-code/${this.currentBusiness.id}`;
                qrCodeImg.alt = `QR Code for ${this.currentBusiness.business_name}`;
            }
        }
    }

    async loadServices() {
        try {
            const response = await fetch('/api/business/services', {
                headers: this.authManager.getAuthHeaders()
            });
            
            const services = await response.json();
            this.renderServices(services);

        } catch (error) {
            console.error('Error loading services:', error);
        }
    }

    renderServices(services) {
        const tbody = document.getElementById('servicesTableBody');
        tbody.innerHTML = '';

        services.forEach(service => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.name}</td>
                <td>$${service.price}</td>
                <td>${service.duration} mins</td>
                <td>${service.category}</td>
                <td>${service.is_available ? 'Yes' : 'No'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-service" data-id="${service.id}">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-service" data-id="${service.id}">
                        Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        this.attachServiceEventListeners();
    }

    attachServiceEventListeners() {
        // Edit service buttons
        document.querySelectorAll('.edit-service').forEach(button => {
            button.addEventListener('click', (e) => {
                const serviceId = e.target.dataset.id;
                this.editService(serviceId);
            });
        });

        // Delete service buttons
        document.querySelectorAll('.delete-service').forEach(button => {
            button.addEventListener('click', (e) => {
                const serviceId = e.target.dataset.id;
                this.deleteService(serviceId);
            });
        });
    }

    async addService(formData) {
        try {
            const response = await fetch('/api/business/services', {
                method: 'POST',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                alert('Service added successfully!');
                const el = document.getElementById('addServiceModal');
                if (el && window.bootstrap?.Modal) {
                    const modal = window.bootstrap.Modal.getOrCreateInstance(el);
                    modal.hide();
                }
                const addForm = document.getElementById('serviceForm') || document.getElementById('addServiceForm');
                if (addForm) addForm.reset();
                this.loadServices();
            } else {
                alert(data.error || 'Failed to add service');
            }
        } catch (error) {
            console.error('Error adding service:', error);
            alert('Failed to add service');
        }
    }

    async editService(serviceId) {
        try {
            const services = await this.fetchServices();
            const service = services.find(s => s.id === serviceId);
            
            if (service) {
                document.getElementById('editServiceId').value = service.id;
                document.getElementById('editServiceName').value = service.name;
                document.getElementById('editServicePrice').value = service.price;
                document.getElementById('editServiceDuration').value = service.duration;
                document.getElementById('editServiceCategory').value = service.category;
                document.getElementById('editServiceDescription').value = service.description || '';
                document.getElementById('editServiceAvailable').checked = service.is_available;
                
                const el = document.getElementById('editServiceModal'); if (el && window.bootstrap?.Modal) 
                            { const modal = window.bootstrap.Modal.getOrCreateInstance(el); modal.show(); }
            }
        } catch (error) {
            console.error('Error editing service:', error);
        }
    }

    async updateService(formData) {
        try {
            const serviceId = document.getElementById('editServiceId').value;
            const response = await fetch(`/api/business/services/${serviceId}`, {
                method: 'PUT',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                alert('Service updated successfully!');
                const el = document.getElementById('editServiceModal');
                if (el && window.bootstrap?.Modal) {
                    const modal = window.bootstrap.Modal.getOrCreateInstance(el);
                    modal.hide();
                }
                this.loadServices();
            } else {
                alert(data.error || 'Failed to update service');
            }
        } catch (error) {
            console.error('Error updating service:', error);
            alert('Failed to update service');
        }
    }

    async deleteService(serviceId) {
        if (!confirm('Are you sure you want to delete this service?')) {
            return;
        }

        try {
            const response = await fetch(`/api/business/services/${serviceId}`, {
                method: 'DELETE',
                headers: this.authManager.getAuthHeaders()
            });

            const data = await response.json();

            if (data.success) {
                alert('Service deleted successfully!');
                this.loadServices();
            } else {
                alert(data.error || 'Failed to delete service');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Failed to delete service');
        }
    }

    async fetchServices() {
        const response = await fetch('/api/business/services', {
            headers: this.authManager.getAuthHeaders()
        });
        return await response.json();
    }

    // Stylists
    async loadStylists() {
        try {
            const res = await fetch('/api/business/stylists', { headers: this.authManager.getAuthHeaders() });
            const stylists = await res.json();
            this.renderStylists(stylists || []);
        } catch (e) {
            console.error('Error loading stylists:', e);
        }
    }

    renderStylists(stylists) {
        const tbody = document.getElementById('stylistsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!stylists.length) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" class="text-center text-muted py-4"><i class="fas fa-user-tie fa-2x mb-2"></i><p>No stylists added yet</p></td>';
            tbody.appendChild(row);
            return;
        }
        stylists.forEach(stylist => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${stylist.name}</td>
                <td>${stylist.email || ''}</td>
                <td>${stylist.experience || 0} yrs</td>
                <td>${Array.isArray(stylist.specialties) ? stylist.specialties.join(', ') : (stylist.specialties || '')}</td>
                <td>${stylist.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-stylist" data-id="${stylist.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-stylist" data-id="${stylist.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        this.attachStylistEventListeners(stylists);
    }

    attachStylistEventListeners(stylists) {
        document.querySelectorAll('.edit-stylist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const s = stylists.find(x => x.id === id);
                if (!s) return;
                // Populate Add Stylist modal as an edit (reuse form/modal)
                document.getElementById('stylistModalTitle').textContent = 'Edit Stylist';
                document.getElementById('stylistName').value = s.name || '';
                document.getElementById('stylistEmail').value = s.email || '';
                document.getElementById('stylistBio').value = s.bio || '';
                document.getElementById('stylistSpecialties').value = Array.isArray(s.specialties) ? s.specialties.join(', ') : (s.specialties || '');
                document.getElementById('stylistExperience').value = s.experience || 0;
                document.getElementById('stylistStatus').checked = s.is_active !== false;
                // Store editing id on form dataset
                const form = document.getElementById('stylistForm');
                form.dataset.editingId = s.id;
                const el = document.getElementById('addStylistModal');
                if (el && window.bootstrap?.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance(el).show();
                }
            });
        });
        document.querySelectorAll('.delete-stylist').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (!confirm('Delete this stylist?')) return;
                try {
                    const res = await fetch(`/api/business/stylists/${id}`, { method: 'DELETE', headers: this.authManager.getAuthHeaders() });
                    const data = await res.json();
                    if (data.success) {
                        alert('Stylist deleted');
                        this.loadStylists();
                    } else {
                        alert(data.error || 'Failed to delete stylist');
                    }
                } catch (err) {
                    console.error('Delete stylist error:', err);
                    alert('Failed to delete stylist');
                }
            });
        });
    }

    async submitStylistForm(e) {
        e.preventDefault();
        const form = document.getElementById('stylistForm');
        const payload = {
            name: document.getElementById('stylistName').value,
            email: document.getElementById('stylistEmail').value,
            bio: document.getElementById('stylistBio').value,
            specialties: document.getElementById('stylistSpecialties').value.split(',').map(s => s.trim()).filter(Boolean),
            experience: document.getElementById('stylistExperience').value,
            is_active: document.getElementById('stylistStatus').checked,
        };
        const isEdit = Boolean(form.dataset.editingId);
        try {
            let res;
            if (isEdit) {
                const id = form.dataset.editingId;
                res = await fetch(`/api/business/stylists/${id}`, { method: 'PUT', headers: this.authManager.getAuthHeaders(), body: JSON.stringify(payload) });
            } else {
                res = await fetch('/api/business/stylists', { method: 'POST', headers: this.authManager.getAuthHeaders(), body: JSON.stringify(payload) });
            }
            const data = await res.json();
            if (data.success) {
                alert(isEdit ? 'Stylist updated' : 'Stylist added');
                // Reset form state
                delete form.dataset.editingId;
                form.reset();
                const el = document.getElementById('addStylistModal');
                if (el && window.bootstrap?.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance(el).hide();
                }
                this.loadStylists();
            } else {
                alert(data.error || 'Failed to save stylist');
            }
        } catch (err) {
            console.error('Save stylist error:', err);
            alert('Failed to save stylist');
        }
    }

    async loadAppointments() {
        return;
    }

    async loadBusinessHours() {
        try {
            const res = await fetch('/api/business/hours', { headers: this.authManager.getAuthHeaders() });
            const hours = await res.json();
            this.renderBusinessHours(Array.isArray(hours) ? hours : []);
        } catch (e) {
            console.error('Business hours load error:', e);
        }
    }

    renderBusinessHours(hours) {
        const container = document.getElementById('businessHoursContainer');
        if (!container) return;
        // Ensure we have entries for all 0..6 days
        const byDay = new Map(hours.map(h => [h.day, h]));
        const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        let html = '<div class="table-responsive"><table class="table align-middle"><thead><tr><th>Day</th><th style="width:160px">Open</th><th style="width:160px">Close</th><th style="width:140px">Closed</th></tr></thead><tbody>';
        for (let d = 0; d <= 6; d++) {
            const h = byDay.get(d) || { day: d, open_time: '09:00', close_time: '17:00', is_closed: d === 0 || d === 6 };
            html += `
                <tr data-day="${d}">
                    <td>${dayNames[d]}</td>
                    <td><input type="time" class="form-control open-time" value="${h.open_time}" ${h.is_closed ? 'disabled' : ''}></td>
                    <td><input type="time" class="form-control close-time" value="${h.close_time}" ${h.is_closed ? 'disabled' : ''}></td>
                    <td>
                        <div class="form-check form-switch">
                            <input class="form-check-input is-closed" type="checkbox" ${h.is_closed ? 'checked' : ''}>
                            <label class="form-check-label">Closed</label>
                        </div>
                    </td>
                </tr>`;
        }
        html += '</tbody></table></div>';
        container.innerHTML = html;

        // Toggle enable/disable of time inputs when closed switch changes (null-safe)
        const rows = container.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const closedInput = row.querySelector('.is-closed');
            const openEl = row.querySelector('.open-time');
            const closeEl = row.querySelector('.close-time');
            if (!closedInput || !openEl || !closeEl) return;
            closedInput.addEventListener('change', () => {
                const disabled = closedInput.checked;
                openEl.disabled = disabled;
                closeEl.disabled = disabled;
            });
        });

        // Bind save button
        const saveBtn = document.getElementById('saveBusinessHours');
        if (saveBtn && !saveBtn.dataset.boundHoursSave) {
            saveBtn.addEventListener('click', () => this.saveBusinessHours());
            saveBtn.dataset.boundHoursSave = '1';
        }
    }

    async saveBusinessHours() {
        try {
            const container = document.getElementById('businessHoursContainer');
            const rows = Array.from(container.querySelectorAll('tbody tr'));
            const hours = rows.map(row => {
                const day = parseInt(row.getAttribute('data-day'), 10);
                const is_closed = row.querySelector('.is-closed').checked;
                const open_time = row.querySelector('.open-time').value || '09:00';
                const close_time = row.querySelector('.close-time').value || '17:00';
                return { day, is_closed, open_time, close_time };
            });

            const res = await fetch('/api/business/hours', {
                method: 'PUT',
                headers: this.authManager.getAuthHeaders(),
                body: JSON.stringify({ hours })
            });
            const data = await res.json();
            if (data.success) {
                alert('Business hours saved');
                this.loadBusinessHours();
            } else {
                alert(data.error || 'Failed to save business hours');
            }
        } catch (e) {
            console.error('Save business hours error:', e);
            alert('Failed to save business hours');
        }
    }

    // Modal helpers to be used by inline onclicks
    openAddStylistModal() {
        const el = document.getElementById('addStylistModal');
        if (el && window.bootstrap?.Modal) {
            const modal = window.bootstrap.Modal.getOrCreateInstance(el);
            modal.show();
        }
    }

    openAddServiceModal() {
        const el = document.getElementById('addServiceModal');
        if (el && window.bootstrap?.Modal) {
            const modal = window.bootstrap.Modal.getOrCreateInstance(el);
            modal.show();
        }
    }

    setupEventListeners() {
        // Sidebar navigation: switch sections based on data-section attribute
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Quick actions
        const quickToAppointments = document.querySelector('.quick-action-btn[onclick*="appointments"]');
        if (quickToAppointments) quickToAppointments.addEventListener('click', () => this.showSection('appointments'));
        const quickAddStylist = document.querySelector('.quick-action-btn[onclick*="openAddStylistModal"]');
        if (quickAddStylist) quickAddStylist.addEventListener('click', () => this.openAddStylistModal?.());
        const quickAddService = document.querySelector('.quick-action-btn[onclick*="openAddServiceModal"]');
        if (quickAddService) quickAddService.addEventListener('click', () => this.openAddServiceModal?.());
        const quickToQr = document.querySelector('.quick-action-btn[onclick*="qrcode"]');
        if (quickToQr) quickToQr.addEventListener('click', () => this.showSection('qrcode'));

        // Service form submissions
        const addServiceForm = document.getElementById('serviceForm');
        if (addServiceForm) {
            addServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('serviceName').value,
                    price: document.getElementById('servicePrice').value,
                    duration: document.getElementById('serviceDuration').value,
                    category: document.getElementById('serviceCategory').value,
                    description: document.getElementById('serviceDescription').value
                };
                this.addService(formData);
            });
        }

        const editServiceForm = document.getElementById('editServiceForm');
        if (editServiceForm) {
            editServiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = {
                    name: document.getElementById('editServiceName').value,
                    price: document.getElementById('editServicePrice').value,
                    duration: document.getElementById('editServiceDuration').value,
                    category: document.getElementById('editServiceCategory').value,
                    description: document.getElementById('editServiceDescription').value,
                    is_available: document.getElementById('editServiceAvailable').checked
                };
                this.updateService(formData);
            });
        }

        // Stylist form submission (add or update)
        const stylistForm = document.getElementById('stylistForm');
        if (stylistForm) {
            stylistForm.addEventListener('submit', (e) => this.submitStylistForm(e));
        }

        // Header sidebar toggle (if present)
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                document.querySelector('.dashboard-container')?.classList.toggle('sidebar-collapsed');
            });
        }
    }
// Handle section switching and active state
    showSection(sectionId) {
        // Update active nav item
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
        const activeItem = document.querySelector(`.sidebar-nav .nav-item[data-section="${sectionId}"]`);
        if (activeItem) activeItem.classList.add('active');

        // Update visible section
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');

        // Update title
        const contentTitle = document.getElementById('contentTitle');
        if (contentTitle) contentTitle.textContent = this.getSectionTitle(sectionId);

        // Lazy-load data per section
        if (sectionId === 'services') this.loadServices();
        if (sectionId === 'stylists') this.loadStylists();
        if (sectionId === 'appointments') this.loadAppointments();
        if (sectionId === 'hours') this.loadBusinessHours();
        if (sectionId === 'qrcode') this.updateQRCode();
    }

    getSectionTitle(sectionId) {
        switch (sectionId) {
            case 'dashboard': return 'Dashboard Overview';
            case 'appointments': return 'Appointment Management';
            case 'stylists': return 'Stylist Management';
            case 'services': return 'Service Management';
            case 'hours': return 'Business Hours';
            case 'qrcode': return 'Your Business QR Code';
            default: return 'Dashboard Overview';
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const dashboard = new BusinessDashboard();
    // Expose global wrappers for inline onclick handlers defined in business.html
    window.showSection = (id) => dashboard.showSection(id);
    window.openAddStylistModal = () => dashboard.openAddStylistModal();
    window.openAddServiceModal = () => dashboard.openAddServiceModal();
});