class CustomerBooking {
    constructor() {
        this.authManager = authManager;
        this.currentBusiness = null;
        this.selectedService = null;
        this.selectedStylist = null;
        this.selectedDate = null;
        this.selectedTime = null;
        this.init();
    }

    async init() {
        await this.loadBusinessFromURL();
        this.loadServices();
        this.loadStylists();
        this.setupEventListeners();
    }

    async loadBusinessFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = urlParams.get('business');
        
        if (!businessId) {
            alert('Invalid business link');
            return;
        }

        try {
            const response = await fetch(`/api/customer/business/${businessId}`);
            const business = await response.json();
            this.currentBusiness = business;
            
            document.getElementById('businessName').textContent = business.business_name;
            document.getElementById('businessContact').textContent = `${business.phone} | ${business.email}`;

        } catch (error) {
            console.error('Error loading business:', error);
            alert('Failed to load business information');
        }
    }

    async loadServices() {
        if (!this.currentBusiness) return;

        try {
            const response = await fetch(`/api/customer/services/${this.currentBusiness.id}`);
            const services = await response.json();
            this.renderServices(services);

        } catch (error) {
            console.error('Error loading services:', error);
        }
    }

    renderServices(services) {
        const container = document.getElementById('servicesContainer');
        container.innerHTML = '';

        services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-3';
            card.innerHTML = `
                <div class="card service-card ${this.selectedService?.id === service.id ? 'border-primary' : ''}" 
                     data-service-id="${service.id}">
                    <div class="card-body">
                        <h5 class="card-title">${service.name}</h5>
                        <p class="card-text">${service.description || 'No description available'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="h6 mb-0">$${service.price}</span>
                            <span class="text-muted">${service.duration} mins</span>
                        </div>
                        <button class="btn btn-primary mt-2 select-service" 
                                data-service-id="${service.id}">
                            Select
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        this.attachServiceSelectionListeners();
    }

    attachServiceSelectionListeners() {
        document.querySelectorAll('.select-service').forEach(button => {
            button.addEventListener('click', (e) => {
                const serviceId = e.target.dataset.serviceId;
                this.selectService(serviceId);
            });
        });
    }

    selectService(serviceId) {
        // Remove previous selection
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.remove('border-primary');
        });

        // Add selection to current card
        const selectedCard = document.querySelector(`[data-service-id="${serviceId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('border-primary');
        }

        this.selectedService = {
            id: serviceId,
            name: selectedCard.querySelector('.card-title').textContent,
            price: selectedCard.querySelector('.h6').textContent.replace('$', ''),
            duration: selectedCard.querySelector('.text-muted').textContent.replace(' mins', '')
        };

        document.getElementById('selectedService').textContent = this.selectedService.name;
        document.getElementById('step2').classList.remove('disabled');
    }

    async loadStylists() {
        if (!this.currentBusiness) return;

        try {
            const response = await fetch(`/api/customer/stylists/${this.currentBusiness.id}`);
            const stylists = await response.json();
            this.renderStylists(stylists);

        } catch (error) {
            console.error('Error loading stylists:', error);
        }
    }

    renderStylists(stylists) {
        const container = document.getElementById('stylistsContainer');
        container.innerHTML = '';

        stylists.forEach(stylist => {
            const card = document.createElement('div');
            card.className = 'col-md-6 mb-3';
            card.innerHTML = `
                <div class="card stylist-card ${this.selectedStylist?.id === stylist.id ? 'border-primary' : ''}" 
                     data-stylist-id="${stylist.id}">
                    <div class="card-body">
                        <h5 class="card-title">${stylist.name}</h5>
                        <p class="card-text">${stylist.bio || 'No bio available'}</p>
                        <div class="mb-2">
                            <strong>Specialties:</strong> ${stylist.specialties?.join(', ') || 'None'}
                        </div>
                        <div class="text-muted">
                            Experience: ${stylist.experience || 0} years
                        </div>
                        <button class="btn btn-primary mt-2 select-stylist" 
                                data-stylist-id="${stylist.id}">
                            Select
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        this.attachStylistSelectionListeners();
    }

    attachStylistSelectionListeners() {
        document.querySelectorAll('.select-stylist').forEach(button => {
            button.addEventListener('click', (e) => {
                const stylistId = e.target.dataset.stylistId;
                this.selectStylist(stylistId);
            });
        });
    }

    selectStylist(stylistId) {
        // Remove previous selection
        document.querySelectorAll('.stylist-card').forEach(card => {
            card.classList.remove('border-primary');
        });

        // Add selection to current card
        const selectedCard = document.querySelector(`[data-stylist-id="${stylistId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('border-primary');
        }

        this.selectedStylist = {
            id: stylistId,
            name: selectedCard.querySelector('.card-title').textContent
        };

        document.getElementById('selectedStylist').textContent = this.selectedStylist.name;
        document.getElementById('step3').classList.remove('disabled');
        
        // Load available dates
        this.loadAvailableDates();
    }

    loadAvailableDates() {
        const dateInput = document.getElementById('appointmentDate');
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        
        // Enable date selection
        dateInput.disabled = false;
    }

    async loadAvailableTimes() {
        if (!this.selectedService || !this.selectedStylist || !this.selectedDate) {
            return;
        }

        try {
            const response = await fetch(
                `/api/customer/available-slots/${this.currentBusiness.id}?` +
                `date=${this.selectedDate}&duration=${this.selectedService.duration}&stylistId=${this.selectedStylist.id}`
            );
            
            const timeSlots = await response.json();
            this.renderTimeSlots(timeSlots);

        } catch (error) {
            console.error('Error loading time slots:', error);
        }
    }

    renderTimeSlots(timeSlots) {
        const container = document.getElementById('timeSlotsContainer');
        container.innerHTML = '';

        if (timeSlots.length === 0) {
            container.innerHTML = '<p class="text-muted">No available time slots for this date.</p>';
            return;
        }

        timeSlots.forEach(timeSlot => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn btn-outline-primary time-slot ${this.selectedTime === timeSlot ? 'active' : ''}`;
            button.textContent = timeSlot;
            button.addEventListener('click', () => {
                this.selectTime(timeSlot);
            });
            container.appendChild(button);
        });
    }

    selectTime(time) {
        this.selectedTime = time;
        
        // Update UI
        document.querySelectorAll('.time-slot').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        document.getElementById('selectedTime').textContent = time;
        document.getElementById('step4').classList.remove('disabled');
    }

    async bookAppointment(customerData) {
        if (!this.selectedService || !this.selectedStylist || !this.selectedDate || !this.selectedTime) {
            alert('Please complete all booking steps');
            return;
        }

        try {
            const bookingData = {
                businessId: this.currentBusiness.id,
                customerName: customerData.name,
                customerPhone: customerData.phone,
                serviceId: this.selectedService.id,
                stylistId: this.selectedStylist.id,
                appointmentDate: this.selectedDate,
                appointmentTime: this.selectedTime,
                specialRequests: document.getElementById('specialRequests').value
            };

            const response = await fetch('/api/customer/book-appointment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();

            if (data.success) {
                alert('Appointment booked successfully!');
                this.resetBooking();
            } else {
                alert(data.error || 'Failed to book appointment');
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            alert('Failed to book appointment');
        }
    }

    resetBooking() {
        this.selectedService = null;
        this.selectedStylist = null;
        this.selectedDate = null;
        this.selectedTime = null;
        
        document.getElementById('selectedService').textContent = 'None';
        document.getElementById('selectedStylist').textContent = 'None';
        document.getElementById('selectedDate').textContent = 'None';
        document.getElementById('selectedTime').textContent = 'None';
        
        document.querySelectorAll('.step').forEach(step => {
            if (step.id !== 'step1') {
                step.classList.add('disabled');
            }
        });
        
        document.getElementById('bookingForm').reset();
        this.loadServices();
        this.loadStylists();
    }

    setupEventListeners() {
        // Date selection
        const dateInput = document.getElementById('appointmentDate');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                document.getElementById('selectedDate').textContent = this.selectedDate;
                document.getElementById('step4').classList.remove('disabled');
                this.loadAvailableTimes();
            });
        }

        // Booking form submission
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const customerData = {
                    name: document.getElementById('customerName').value,
                    phone: document.getElementById('customerPhone').value
                };

                // Check if customer is logged in
                if (this.authManager.isCustomer()) {
                    await this.bookAppointment(customerData);
                } else {
                    // Show login/register modal
                    openModal('customerAuthModal');
                    // Store booking data for after authentication
                    this.pendingBooking = customerData;
                }
            });
        }

        // Customer authentication success
        document.addEventListener('customerAuthenticated', () => {
            if (this.pendingBooking) {
                this.bookAppointment(this.pendingBooking);
                this.pendingBooking = null;
                closeModal('customerAuthModal');
            }
        });
    }
}

// Initialize customer booking when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new CustomerBooking();
});