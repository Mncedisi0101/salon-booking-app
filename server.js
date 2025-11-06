require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const qr = require('qr-image');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireBusinessAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'business') {
    return res.status(403).json({ error: 'Business access required' });
  }
  next();
};

const requireAdminAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/business', (req, res) => {
  res.sendFile(__dirname + '/views/business.html');
});

app.get('/customer', (req, res) => {
  res.sendFile(__dirname + '/views/customer.html');
});

app.get('/customerauth', (req, res) => {
  res.sendFile(__dirname + '/views/customerauth.html');
});

app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/views/admin.html');
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('businesses').select('id').limit(1);
    if (error) throw error;
    res.json({ ok: true, message: 'Healthy' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Business Registration
app.post('/api/business/register', async (req, res) => {
  try {
    const { ownerName, businessName, phone, email, password } = req.body;
    
    // Check if business already exists
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('email', email)
      .single();

    if (existingBusiness) {
      return res.status(400).json({ error: 'Business already registered with this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const businessId = uuidv4();

    // Create business
    const { data: business, error } = await supabase
      .from('businesses')
      .insert([{
        id: businessId,
        owner_name: ownerName,
        business_name: businessName,
        phone: phone,
        email: email,
        password: hashedPassword,
        qr_code_data: `${req.protocol}://${req.get('host')}/customerauth?business=${businessId}`
      }])
      .select()
      .single();

    if (error) throw error;

    // Create default business hours
    const businessHours = [
      { business_id: businessId, day: 0, open_time: '09:00', close_time: '17:00', is_closed: true },
      { business_id: businessId, day: 1, open_time: '09:00', close_time: '17:00', is_closed: false },
      { business_id: businessId, day: 2, open_time: '09:00', close_time: '17:00', is_closed: false },
      { business_id: businessId, day: 3, open_time: '09:00', close_time: '17:00', is_closed: false },
      { business_id: businessId, day: 4, open_time: '09:00', close_time: '17:00', is_closed: false },
      { business_id: businessId, day: 5, open_time: '09:00', close_time: '17:00', is_closed: false },
      { business_id: businessId, day: 6, open_time: '10:00', close_time: '16:00', is_closed: true }
    ];

    await supabase.from('business_hours').insert(businessHours);

    // Create insurance lead
    await supabase.from('insurance_leads').insert([{
      business_id: businessId,
      business_name: businessName,
      owner_name: ownerName,
      contact_email: email,
      contact_phone: phone,
      status: 'new'
    }]);

    res.json({ 
      success: true, 
      message: 'Business registered successfully',
      businessId: businessId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Business Login
app.post('/api/business/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !business) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, business.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: business.id, 
        email: business.email, 
        businessName: business.business_name,
        role: 'business' 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      business: {
        id: business.id,
        email: business.email,
        businessName: business.business_name,
        ownerName: business.owner_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Login - Plain text validation
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Fetch admin from database
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      console.log('Admin not found:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Validate password as plain text (exact match)
    if (password !== admin.password) {
      console.log('Password mismatch for admin:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer Registration
app.post('/api/customer/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer already registered with this email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customerId = uuidv4();

    const { data: customer, error } = await supabase
      .from('customers')
      .insert([{
        id: customerId,
        name: name,
        email: email,
        phone: phone,
        password: hashedPassword
      }])
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign(
      { 
        id: customer.id, 
        email: customer.email, 
        role: 'customer' 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      message: 'Registration successful',
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      }
    });

  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer Login
app.post('/api/customer/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !customer) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, customer.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: customer.id, 
        email: customer.email, 
        role: 'customer' 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone
      }
    });

  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Business Data
app.get('/api/business/data', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) throw error;

    res.json(business);

  } catch (error) {
    console.error('Business data error:', error);
    res.status(500).json({ error: 'Failed to load business data' });
  }
});

// Get Business Services
app.get('/api/business/services', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(services || []);

  } catch (error) {
    console.error('Services error:', error);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

// Add Service
app.post('/api/business/services', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const { name, price, duration, description, category } = req.body;

    const { data: service, error } = await supabase
      .from('services')
      .insert([{
        business_id: businessId,
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
        description,
        category,
        is_available: true
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, service });

  } catch (error) {
    console.error('Add service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Service
app.put('/api/business/services/:id', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const serviceId = req.params.id;
    const { name, price, duration, description, category, is_available } = req.body;

    const { data: service, error } = await supabase
      .from('services')
      .update({
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
        description,
        category,
        is_available
      })
      .eq('id', serviceId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, service });

  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Service
app.delete('/api/business/services/:id', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const serviceId = req.params.id;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)
      .eq('business_id', businessId);

    if (error) throw error;

    res.json({ success: true });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Stylists
app.get('/api/business/stylists', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;

    const { data: stylists, error } = await supabase
      .from('stylists')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(stylists || []);

  } catch (error) {
    console.error('Stylists error:', error);
    res.status(500).json({ error: 'Failed to load stylists' });
  }
});

// Add Stylist
app.post('/api/business/stylists', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const { name, bio, specialties, experience, email, is_active } = req.body;

    const { data: stylist, error } = await supabase
      .from('stylists')
      .insert([{
        business_id: businessId,
        name,
        bio,
        specialties: Array.isArray(specialties) ? specialties : [specialties],
        experience: parseInt(experience) || 0,
        email,
        is_active: is_active !== false
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, stylist });

  } catch (error) {
    console.error('Add stylist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Stylist
app.put('/api/business/stylists/:id', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const stylistId = req.params.id;
    const { name, bio, specialties, experience, email, is_active } = req.body;

    const { data: stylist, error } = await supabase
      .from('stylists')
      .update({
        name,
        bio,
        specialties: Array.isArray(specialties) ? specialties : [specialties],
        experience: parseInt(experience) || 0,
        email,
        is_active
      })
      .eq('id', stylistId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, stylist });

  } catch (error) {
    console.error('Update stylist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Stylist
app.delete('/api/business/stylists/:id', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const stylistId = req.params.id;

    const { error } = await supabase
      .from('stylists')
      .delete()
      .eq('id', stylistId)
      .eq('business_id', businessId);

    if (error) throw error;

    res.json({ success: true });

  } catch (error) {
    console.error('Delete stylist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Appointments
app.get('/api/business/appointments', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const { status, date } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        services:service_id(name, price, duration),
        stylists:stylist_id(name),
        customers:customer_id(name, phone)
      `)
      .eq('business_id', businessId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (date) {
      query = query.eq('appointment_date', date);
    }

    const { data: appointments, error } = await query.order('appointment_date', { ascending: true });

    if (error) throw error;

    res.json(appointments || []);

  } catch (error) {
    console.error('Appointments error:', error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// Update Appointment Status
app.put('/api/business/appointments/:id/status', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const appointmentId = req.params.id;
    const { status } = req.body;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, appointment });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Business Hours
app.get('/api/business/hours', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;

    const { data: hours, error } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .order('day', { ascending: true });

    if (error) throw error;

    res.json(hours || []);

  } catch (error) {
    console.error('Business hours error:', error);
    res.status(500).json({ error: 'Failed to load business hours' });
  }
});

// Update Business Hours
app.put('/api/business/hours', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const { hours } = req.body;

    for (const hour of hours) {
      const { error } = await supabase
        .from('business_hours')
        .update({
          open_time: hour.open_time,
          close_time: hour.close_time,
          is_closed: hour.is_closed
        })
        .eq('business_id', businessId)
        .eq('day', hour.day);

      if (error) throw error;
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Update hours error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer Routes

// Get Business Info for Customer
app.get('/api/customer/business/:id', async (req, res) => {
  try {
    const businessId = req.params.id;

    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, business_name, owner_name, phone, email')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);

  } catch (error) {
    console.error('Customer business error:', error);
    res.status(500).json({ error: 'Failed to load business' });
  }
});

// Get Services for Customer
app.get('/api/customer/services/:businessId', async (req, res) => {
  try {
    const businessId = req.params.businessId;

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json(services || []);

  } catch (error) {
    console.error('Customer services error:', error);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

// Get Stylists for Customer
app.get('/api/customer/stylists/:businessId', async (req, res) => {
  try {
    const businessId = req.params.businessId;

    const { data: stylists, error } = await supabase
      .from('stylists')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    res.json(stylists || []);

  } catch (error) {
    console.error('Customer stylists error:', error);
    res.status(500).json({ error: 'Failed to load stylists' });
  }
});

// Get Available Time Slots
app.get('/api/customer/available-slots/:businessId', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const { date, duration, stylistId } = req.query;

    // Get business hours for the specific day
    const dayOfWeek = new Date(date).getDay();
    const { data: businessHours, error: hoursError } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .eq('day', dayOfWeek)
      .single();

    if (hoursError || !businessHours || businessHours.is_closed) {
      return res.json([]);
    }

    // Get existing appointments for that day and stylist
    const { data: existingAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_time, duration')
      .eq('business_id', businessId)
      .eq('appointment_date', date)
      .eq('stylist_id', stylistId)
      .in('status', ['pending', 'confirmed']);

    if (appointmentsError) throw appointmentsError;

    // Generate available time slots
    const availableSlots = generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      parseInt(duration),
      existingAppointments || []
    );

    res.json(availableSlots);

  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({ error: 'Failed to load available slots' });
  }
});

// Book Appointment
app.post('/api/customer/book-appointment', async (req, res) => {
  try {
    const { businessId, customerName, customerPhone, serviceId, stylistId, appointmentDate, appointmentTime, specialRequests } = req.body;

    // Get service details to get duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return res.status(400).json({ error: 'Service not found' });
    }

    // Check if customer exists, if not create one
    let customerId = uuidv4();
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .single();

    if (!existingCustomer) {
      const { error: customerError } = await supabase
        .from('customers')
        .insert([{
          id: customerId,
          name: customerName,
          phone: customerPhone
        }]);

      if (customerError) throw customerError;
    } else {
      customerId = existingCustomer.id;
    }

    // Create appointment
    const appointmentId = uuidv4();
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([{
        id: appointmentId,
        business_id: businessId,
        customer_id: customerId,
        service_id: serviceId,
        stylist_id: stylistId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        duration: service.duration,
        special_requests: specialRequests,
        status: 'pending'
      }])
      .select(`
        *,
        services:service_id(name, price, duration),
        stylists:stylist_id(name),
        customers:customer_id(name, phone)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, appointment });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to book appointment', details: error.message });
  }
});

// Admin Routes

// Get All Businesses
app.get('/api/admin/businesses', authenticateToken, requireAdminAuth, async (req, res) => {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(businesses || []);

  } catch (error) {
    console.error('Admin businesses error:', error);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
});
// Delete Business (Admin only)
app.delete('/api/admin/businesses/:id', authenticateToken, requireAdminAuth, async (req, res) => {
    try {
        const businessId = req.params.id;

        // Delete related records first (due to foreign key constraints)
        await supabase.from('appointments').delete().eq('business_id', businessId);
        await supabase.from('services').delete().eq('business_id', businessId);
        await supabase.from('stylists').delete().eq('business_id', businessId);
        await supabase.from('business_hours').delete().eq('business_id', businessId);
        await supabase.from('insurance_leads').delete().eq('business_id', businessId);

        // Delete business
        const { error } = await supabase
            .from('businesses')
            .delete()
            .eq('id', businessId);

        if (error) throw error;

        res.json({ success: true });

    } catch (error) {
        console.error('Delete business error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get Insurance Leads
app.get('/api/admin/leads', authenticateToken, requireAdminAuth, async (req, res) => {
  try {
    const { data: leads, error } = await supabase
      .from('insurance_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(leads || []);

  } catch (error) {
    console.error('Admin leads error:', error);
    res.status(500).json({ error: 'Failed to load leads' });
  }
});

// Update Lead Status
app.put('/api/admin/leads/:id', authenticateToken, requireAdminAuth, async (req, res) => {
  try {
    const leadId = req.params.id;
    const { status } = req.body;

    const { data: lead, error } = await supabase
      .from('insurance_leads')
      .update({ status, last_contacted: new Date().toISOString() })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, lead });

  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Get All Appointments
app.get('/api/admin/appointments', authenticateToken, requireAdminAuth, async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        businesses:business_id(business_name),
        services:service_id(name, price),
        stylists:stylist_id(name),
        customers:customer_id(name, phone)
      `)
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    res.json(appointments || []);

  } catch (error) {
    console.error('Admin appointments error:', error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// Generate QR Code
app.get('/api/qr-code/:businessId', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const qrUrl = `${req.protocol}://${req.get('host')}/customerauth?business=${businessId}`;
    
    const qrSvg = qr.image(qrUrl, { type: 'svg' });
    res.setHeader('Content-type', 'image/svg+xml');
    qrSvg.pipe(res);

  } catch (error) {
    console.error('QR code error:', error);
    res.status(500).send('Error generating QR code');
  }
});

// Verify Token
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Helper function to generate time slots
function generateTimeSlots(openTime, closeTime, duration, existingAppointments) {
  const slots = [];
  const start = new Date(`1970-01-01T${openTime}`);
  const end = new Date(`1970-01-01T${closeTime}`);
  
  let current = new Date(start);
  
  while (current < end) {
    const slotTime = current.toTimeString().slice(0, 5);
    const slotEnd = new Date(current.getTime() + duration * 60000);
    
    // Check if slot conflicts with existing appointments
    const isAvailable = !existingAppointments.some(apt => {
      const aptStart = new Date(`1970-01-01T${apt.appointment_time}`);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
      return (current < aptEnd && slotEnd > aptStart);
    });
    
    if (isAvailable && slotEnd <= end) {
      slots.push(slotTime);
    }
    
    current = new Date(current.getTime() + 30 * 60000); // 30-minute intervals
  }
  
  return slots;
}

app.listen(PORT, () => {
  console.log(`SalonPro server running on port ${PORT}`);
});