class CustomerBooking {
    constructor() {
        this.authManager = authManager;
        this.currentBusiness = null;
        this.selectedService = null;
        this.selectedStylist = null;
        this.selectedDate = null;
        this.selectedTime = null;
        this.services = [];
        this.stylists = [];
        this.init();
    }

    async init() {
        await this.loadBusinessFromURL();
        await this.loadServices();
        await this.loadStylists();
        this.setupEventListeners();
    }

    nextStep(stepId) {
        // Hide all steps
        document.querySelectorAll('.booking-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show the target step
        const targetStep = document.getElementById(stepId);
        if (targetStep) {
            targetStep.classList.add('active');
        }

        // Update progress indicators
        this.updateProgressIndicators(stepId);
    }

    previousStep(stepId) {
        this.nextStep(stepId);
    }

    updateProgressIndicators(currentStepId) {
        const stepMap = {
            'serviceStep': 1,
            'stylistStep': 2,
            'dateStep': 3,
            'customerInfoStep': 4
        };

        const currentStepNumber = stepMap[currentStepId];

        document.querySelectorAll('.progress-step').forEach((indicator, index) => {
            const stepNumber = index + 1;
            if (stepNumber < currentStepNumber) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (stepNumber === currentStepNumber) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });
    }

    bookAnother() {
        // Reset and go back to first step
        this.resetBooking();
        document.getElementById('confirmationStep').style.display = 'none';
        document.getElementById('bookingSteps').style.display = 'block';
        this.nextStep('serviceStep');
    }

    async loadBusinessFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = urlParams.get('business');
        
        if (!businessId) {
            alert('Invalid business link. Please scan the QR code again.');
            window.location.href = '/';
            return;
        }

        try {
            const response = await fetch(`/api/customer/business/${businessId}`);
            
            if (!response.ok) {
                throw new Error('Business not found');
            }
            
            const business = await response.json();
            this.currentBusiness = business;
            
            // Update header with business info
            document.getElementById('businessName').textContent = business.business_name;
            
            // Update footer
            const footerBusinessName = document.getElementById('footerBusinessName');
            const footerBusinessPhone = document.getElementById('footerBusinessPhone');
            if (footerBusinessName) footerBusinessName.textContent = business.business_name;
            if (footerBusinessPhone) footerBusinessPhone.textContent = business.phone;

        } catch (error) {
            console.error('Error loading business:', error);
            alert('Failed to load business information. Please try again.');
            window.location.href = '/';
        }
    }

    async loadServices() {
        if (!this.currentBusiness) return;

        try {
            const response = await fetch(`/api/customer/services/${this.currentBusiness.id}`);
            const services = await response.json();
            this.services = services;
            this.renderServices(services);

        } catch (error) {
            console.error('Error loading services:', error);
            alert('Failed to load services. Please try again.');
        }
    }

    renderServices(services) {
        const selectElement = document.getElementById('serviceSelect');
        if (!selectElement) return;
        
        selectElement.innerHTML = '';

        if (services.length === 0) {
            selectElement.innerHTML = '<option value="">No services available</option>';
            return;
        }

        // Add a placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '-- Select a Service --';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.appendChild(placeholderOption);

        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} - $${service.price} (${service.duration} mins)`;
            option.dataset.name = service.name;
            option.dataset.price = service.price;
            option.dataset.duration = service.duration;
            selectElement.appendChild(option);
        });
    }

    selectService(serviceId, selectedOption) {
        console.log('selectService called with:', serviceId);
        
        this.selectedService = {
            id: serviceId,
            name: selectedOption.dataset.name,
            price: selectedOption.dataset.price,
            duration: selectedOption.dataset.duration
        };

        console.log('Selected service:', this.selectedService);

        // Update selected services display
        const selectedServicesDiv = document.getElementById('selectedServices');
        const selectedServiceDetails = document.getElementById('selectedServiceDetails');
        
        if (selectedServicesDiv && selectedServiceDetails) {
            selectedServiceDetails.innerHTML = `
                <p><strong>${this.selectedService.name}</strong></p>
                <p>Price: $${this.selectedService.price}</p>
                <p>Duration: ${this.selectedService.duration} minutes</p>
            `;
            selectedServicesDiv.style.display = 'block';
        }

        // Update summary
        document.getElementById('summaryService').textContent = this.selectedService.name;
        document.getElementById('summaryDuration').textContent = `${this.selectedService.duration} minutes`;
        document.getElementById('summaryTotal').textContent = `$${this.selectedService.price}`;

        // Enable next button
        const nextButton = document.getElementById('nextToStylist');
        console.log('Next button found:', nextButton);
        console.log('Button disabled before:', nextButton ? nextButton.disabled : 'N/A');
        
        if (nextButton) {
            nextButton.disabled = false;
            console.log('Button disabled after:', nextButton.disabled);
        }
    }

    async loadStylists() {
        if (!this.currentBusiness) return;

        try {
            const response = await fetch(`/api/customer/stylists/${this.currentBusiness.id}`);
            const stylists = await response.json();
            this.stylists = stylists;
            this.renderStylists(stylists);

        } catch (error) {
            console.error('Error loading stylists:', error);
            alert('Failed to load stylists. Please try again.');
        }
    }

    renderStylists(stylists) {
        const selectElement = document.getElementById('stylistSelect');
        if (!selectElement) return;
        
        selectElement.innerHTML = '';

        if (stylists.length === 0) {
            selectElement.innerHTML = '<option value="">No stylists available</option>';
            return;
        }

        // Add a placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = '-- Select a Stylist --';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        selectElement.appendChild(placeholderOption);

        stylists.forEach(stylist => {
            const option = document.createElement('option');
            option.value = stylist.id;
            option.textContent = `${stylist.name} (${stylist.experience || 0} years exp)`;
            option.dataset.name = stylist.name;
            option.dataset.bio = stylist.bio || 'No bio available';
            option.dataset.experience = stylist.experience || 0;
            selectElement.appendChild(option);
        });
    }

    selectStylist(stylistId, selectedOption) {
        this.selectedStylist = {
            id: stylistId,
            name: selectedOption.dataset.name,
            bio: selectedOption.dataset.bio,
            experience: selectedOption.dataset.experience
        };

        // Update stylist info display
        const stylistInfoDiv = document.getElementById('stylistInfo');
        const stylistNameElement = document.getElementById('stylistName');
        const stylistBioElement = document.getElementById('stylistBio');
        const stylistExperienceElement = document.getElementById('stylistExperience');
        
        if (stylistInfoDiv && stylistNameElement) {
            stylistNameElement.textContent = this.selectedStylist.name;
            stylistBioElement.textContent = this.selectedStylist.bio;
            stylistExperienceElement.textContent = `${this.selectedStylist.experience} years of experience`;
            stylistInfoDiv.style.display = 'block';
        }

        // Update summary
        document.getElementById('summaryStylist').textContent = this.selectedStylist.name;

        // Enable next button
        const nextButton = document.getElementById('nextToDate');
        if (nextButton) {
            nextButton.disabled = false;
        }
        
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
        const container = document.getElementById('timeSlots');
        if (!container) return;
        
        container.innerHTML = '';

        if (timeSlots.length === 0) {
            container.innerHTML = '<div class="text-muted">No available time slots for this date.</div>';
            return;
        }

        timeSlots.forEach(timeSlot => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn btn-outline-primary m-1 time-slot ${this.selectedTime === timeSlot ? 'active' : ''}`;
            button.textContent = timeSlot;
            button.dataset.time = timeSlot;
            button.addEventListener('click', (e) => {
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
            if (btn.dataset.time === time) {
                btn.classList.add('active');
            }
        });
        
        // Update summary
        document.getElementById('summaryDateTime').textContent = `${this.selectedDate} at ${time}`;
        
        // Enable next button
        const nextButton = document.getElementById('nextToInfo');
        if (nextButton) {
            nextButton.disabled = false;
        }
    }

    async bookAppointment(customerData) {
        if (!this.selectedService || !this.selectedStylist || !this.selectedDate || !this.selectedTime) {
            alert('Please complete all booking steps');
            return;
        }

        try {
            // Show loading overlay
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            const bookingData = {
                businessId: this.currentBusiness.id,
                customerName: customerData.name,
                customerPhone: customerData.phone,
                serviceId: this.selectedService.id,
                stylistId: this.selectedStylist.id,
                appointmentDate: this.selectedDate,
                appointmentTime: this.selectedTime,
                specialRequests: customerData.specialRequests || ''
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
                // Show confirmation
                this.showConfirmation(data.appointment);
            } else {
                alert(data.error || 'Failed to book appointment');
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            alert('Failed to book appointment. Please try again.');
        } finally {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    }

    showConfirmation(appointment) {
        // Hide booking steps
        document.getElementById('bookingSteps').style.display = 'none';
        
        // Show confirmation
        const confirmationStep = document.getElementById('confirmationStep');
        const confirmationDetails = document.getElementById('confirmationDetails');
        
        confirmationDetails.innerHTML = `
            <div class="card mb-3">
                <div class="card-body">
                    <p><strong>Service:</strong> ${this.selectedService.name}</p>
                    <p><strong>Stylist:</strong> ${this.selectedStylist.name}</p>
                    <p><strong>Date:</strong> ${this.selectedDate}</p>
                    <p><strong>Time:</strong> ${this.selectedTime}</p>
                    <p><strong>Duration:</strong> ${this.selectedService.duration} minutes</p>
                    <p><strong>Total:</strong> $${this.selectedService.price}</p>
                </div>
            </div>
        `;
        
        confirmationStep.style.display = 'block';
    }

    resetBooking() {
        this.selectedService = null;
        this.selectedStylist = null;
        this.selectedDate = null;
        this.selectedTime = null;
        
        // Reset form
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) bookingForm.reset();
        
        // Reset select elements
        const serviceSelect = document.getElementById('serviceSelect');
        const stylistSelect = document.getElementById('stylistSelect');
        const dateInput = document.getElementById('appointmentDate');
        
        if (serviceSelect) serviceSelect.selectedIndex = 0;
        if (stylistSelect) stylistSelect.selectedIndex = 0;
        if (dateInput) dateInput.value = '';
        
        // Hide info displays
        const selectedServices = document.getElementById('selectedServices');
        const stylistInfo = document.getElementById('stylistInfo');
        if (selectedServices) selectedServices.style.display = 'none';
        if (stylistInfo) stylistInfo.style.display = 'none';
        
        // Reset summary
        document.getElementById('summaryService').textContent = '-';
        document.getElementById('summaryStylist').textContent = '-';
        document.getElementById('summaryDateTime').textContent = '-';
        document.getElementById('summaryDuration').textContent = '-';
        document.getElementById('summaryTotal').textContent = '$0.00';
        
        // Disable next buttons
        document.getElementById('nextToStylist').disabled = true;
        document.getElementById('nextToDate').disabled = true;
        document.getElementById('nextToInfo').disabled = true;
        
        // Clear time slots
        const timeSlots = document.getElementById('timeSlots');
        if (timeSlots) timeSlots.innerHTML = '<div class="text-muted">Select a date first</div>';
    }

    setupEventListeners() {
        // Service selection
        const serviceSelect = document.getElementById('serviceSelect');
        if (serviceSelect) {
            serviceSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    this.selectService(e.target.value, selectedOption);
                }
            });
        }

        // Stylist selection
        const stylistSelect = document.getElementById('stylistSelect');
        if (stylistSelect) {
            stylistSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    this.selectStylist(e.target.value, selectedOption);
                }
            });
        }

        // Navigation buttons
        const nextToStylistBtn = document.getElementById('nextToStylist');
        if (nextToStylistBtn) {
            nextToStylistBtn.addEventListener('click', () => {
                console.log('Next to Stylist clicked');
                this.nextStep('stylistStep');
            });
        }

        const nextToDateBtn = document.getElementById('nextToDate');
        if (nextToDateBtn) {
            nextToDateBtn.addEventListener('click', () => {
                console.log('Next to Date clicked');
                this.nextStep('dateStep');
            });
        }

        const nextToInfoBtn = document.getElementById('nextToInfo');
        if (nextToInfoBtn) {
            nextToInfoBtn.addEventListener('click', () => {
                console.log('Next to Info clicked');
                this.nextStep('customerInfoStep');
            });
        }

        // Back buttons
        const backButtons = document.querySelectorAll('.btn-secondary');
        backButtons.forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes('previousStep')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const match = onclickAttr.match(/previousStep\('([^']+)'\)/);
                    if (match) {
                        this.previousStep(match[1]);
                    }
                });
            }
        });

        // Date selection
        const dateInput = document.getElementById('appointmentDate');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                this.selectedDate = e.target.value;
                if (this.selectedDate) {
                    this.loadAvailableTimes();
                }
            });
        }

        // Booking form submission
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const customerData = {
                    name: document.getElementById('customerName').value,
                    phone: document.getElementById('customerPhone').value,
                    specialRequests: document.getElementById('specialRequests').value
                };

                await this.bookAppointment(customerData);
            });
        }

        // Pre-fill customer info if logged in
        if (this.authManager.isCustomer() && this.authManager.currentUser) {
            const customerNameInput = document.getElementById('customerName');
            const customerPhoneInput = document.getElementById('customerPhone');
            
            if (customerNameInput && this.authManager.currentUser.name) {
                customerNameInput.value = this.authManager.currentUser.name;
            }
            if (customerPhoneInput && this.authManager.currentUser.phone) {
                customerPhoneInput.value = this.authManager.currentUser.phone;
            }
        }
    }
}

// Initialize customer booking when DOM is loaded
let customerBooking;
document.addEventListener('DOMContentLoaded', function() {
    customerBooking = new CustomerBooking();
    window.customerBooking = customerBooking; // Make it globally accessible
});