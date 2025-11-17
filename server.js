require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const qr = require('qr-image');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase (anon key for general use)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Supabase Admin client (service role) for secure server-side queries
let supabaseAdmin = null;
if (process.env.SUPABASE_SERVICE_KEY) {
  try {
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    console.log('🔐 Supabase admin client initialized');
  } catch (e) {
    console.warn('⚠️ Failed to initialize Supabase admin client:', e?.message || e);
  }
} else {
  console.warn('ℹ️ SUPABASE_SERVICE_KEY not set. Using anon key for all queries. Some protected fields (like customer email) may not be accessible due to RLS.');
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Validation helper functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  // Minimum 8 characters, at least one letter and one number
  return password && password.length >= 8;
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  // Remove HTML tags and trim
  return str.replace(/<[^>]*>/g, '').trim();
};

const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

const validateLength = (value, fieldName, min, max) => {
  if (value && value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  if (value && max && value.length > max) {
    return `${fieldName} must not exceed ${max} characters`;
  }
  return null;
};

const validateNumber = (value, fieldName, min, max) => {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName} must not exceed ${max}`;
  }
  return null;
};

// Rate limiting helper
const rateLimitMap = new Map();
const checkRateLimit = (identifier, maxRequests = 5, windowMs = 60000) => {
  const now = Date.now();
  const userRequests = rateLimitMap.get(identifier) || [];
  
  // Filter out old requests outside the time window
  const recentRequests = userRequests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);
  return true;
};

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

// Create Nodemailer transporter
function createEmailTransporter() {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

// Email sending helper function
async function sendAppointmentEmail(appointment, status) {
  try {
    console.log('🔔 Starting email send process...');
    console.log('Status:', status);
    console.log('Appointment ID:', appointment?.id);
    
    // Check if email credentials are configured
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    // Use business owner's email as the sender (reply-to email)
    const businessEmail = appointment.businesses?.email;
    const businessName = appointment.businesses?.business_name || 'Our Business';
    const emailFrom = businessEmail || emailUser; // Fallback to system email if business email not available
    
    console.log('📧 Email Configuration Check:');
    console.log('  Email User:', emailUser ? '✓ Set' : '✗ Missing');
    console.log('  Email Password:', emailPassword ? '✓ Set' : '✗ Missing');
    console.log('  Email Service:', process.env.EMAIL_SERVICE || 'gmail (default)');
    console.log('  Business Email:', businessEmail || '✗ Not available');
    
    if (!emailUser || !emailPassword) {
      console.warn('❌ Email not configured. Set EMAIL_USER and EMAIL_PASSWORD in environment variables.');
      return;
    }

    const customerEmail = appointment.customers?.email;
    const customerName = appointment.customers?.name || 'Valued Customer';
    
    console.log('👤 Customer Info:');
    console.log('  Name:', customerName);
    console.log('  Email:', customerEmail || '✗ Missing');
    console.log('  📧 Will send TO:', customerEmail);
    console.log('  📤 Will send FROM:', emailFrom);
    
    if (!customerEmail) {
      console.warn('❌ Customer email not available');
      return;
    }

    // Format appointment date
    const appointmentDate = new Date(appointment.appointment_date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const serviceName = appointment.services?.name || 'Service';
    const stylistName = appointment.stylists?.name || 'Stylist';
    const appointmentTime = appointment.appointment_time;
    const businessPhone = appointment.businesses?.phone || '';

    console.log('📋 Appointment Details:');
    console.log('  Business:', businessName);
    console.log('  Service:', serviceName);
    console.log('  Stylist:', stylistName);
    console.log('  Date:', formattedDate);
    console.log('  Time:', appointmentTime);

    // Create email subject and body based on status
    const statusMessage = getStatusMessage(status);
    const subject = status === 'confirmed' 
      ? `✓ Appointment Confirmed - ${businessName}`
      : status === 'cancelled'
      ? `✗ Appointment Cancelled - ${businessName}`
      : `✓ Thank You - ${businessName}`;

    const getHeaderColor = (status) => {
      if (status === 'confirmed') return '#4CAF50';
      if (status === 'cancelled') return '#f44336';
      return '#2196F3'; // Blue for completed
    };

    const getHeaderIcon = (status) => {
      if (status === 'confirmed') return '✓';
      if (status === 'cancelled') return '✗';
      return '★'; // Star for completed
    };

    const getHeaderTitle = (status) => {
      if (status === 'confirmed') return 'Appointment Confirmed';
      if (status === 'cancelled') return 'Appointment Cancelled';
      return 'Thank You!';
    };

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${getHeaderColor(status)}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .details { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid ${getHeaderColor(status)}; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #555; }
          .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${getHeaderIcon(status)} ${getHeaderTitle(status)}</h1>
          </div>
          <div class="content">
            <p>Dear ${customerName},</p>
            <p>${statusMessage}</p>
            
            <div class="details">
              <h3>Appointment Details</h3>
              <div class="detail-row"><span class="label">Business:</span> ${businessName}</div>
              <div class="detail-row"><span class="label">Service:</span> ${serviceName}</div>
              <div class="detail-row"><span class="label">Stylist:</span> ${stylistName}</div>
              <div class="detail-row"><span class="label">Date:</span> ${formattedDate}</div>
              <div class="detail-row"><span class="label">Time:</span> ${appointmentTime}</div>
              ${businessPhone ? `<div class="detail-row"><span class="label">Contact:</span> ${businessPhone}</div>` : ''}
            </div>
            
            ${status === 'confirmed' 
              ? '<p>We look forward to seeing you!</p>' 
              : status === 'cancelled'
              ? '<p>If you have any questions, please contact us.</p>'
              : '<p>Thank you for choosing us! We hope you enjoyed your experience and look forward to serving you again soon.</p>'}
            
            <p>Best regards,<br>${businessName}</p>
          </div>
          <div class="footer">
            <p>For any questions or changes, please reply to this email or contact us at ${businessPhone || businessEmail}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Dear ${customerName},

${statusMessage}

Appointment Details:
- Business: ${businessName}
- Service: ${serviceName}
- Stylist: ${stylistName}
- Date: ${formattedDate}
- Time: ${appointmentTime}
${businessPhone ? `- Contact: ${businessPhone}` : ''}

${status === 'confirmed' 
  ? 'We look forward to seeing you!' 
  : status === 'cancelled'
  ? 'If you have any questions, please contact us.'
  : 'Thank you for choosing us! We hope you enjoyed your experience and look forward to serving you again soon.'}

Best regards,
${businessName}

---
For any questions or changes, please reply to this email or contact us at ${businessPhone || businessEmail}.
    `;

    console.log('📤 Sending email...');
    console.log('  To:', customerEmail);
    console.log('  From:', emailFrom);
    console.log('  Reply-To:', businessEmail);
    console.log('  Subject:', subject);

    // Create transporter and send email
    const transporter = createEmailTransporter();
    const mailOptions = {
      from: `"${businessName}" <${emailUser}>`, // Send from your configured Gmail
      replyTo: businessEmail, // Replies go to business owner
      to: customerEmail,
      subject: subject,
      text: textBody,
      html: htmlBody
    };

    console.log('📬 Final mail options:', {
      from: mailOptions.from,
      replyTo: mailOptions.replyTo,
      to: mailOptions.to,
      subject: mailOptions.subject
    });

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully!');
    console.log('📨 Sent to:', customerEmail);
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response
    });
    throw error;
  }
}

// Helper function to get status message
function getStatusMessage(status) {
  switch(status) {
    case 'confirmed':
      return 'Your appointment has been confirmed! We look forward to seeing you.';
    case 'cancelled':
      return 'Your appointment has been cancelled. We apologize for any inconvenience.';
    case 'completed':
      return 'Thank you for visiting us! Your appointment has been completed. We hope you had a wonderful experience and we look forward to serving you again.';
    default:
      return `Your appointment status has been updated to ${status}.`;
  }
}

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
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`register_${clientIp}`, 3, 300000)) {
      return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
    }

    const { ownerName, businessName, phone, email, password } = req.body;
    
    // Validation
    const errors = [];
    
    // Required field validation
    errors.push(validateRequired(ownerName, 'Owner name'));
    errors.push(validateRequired(businessName, 'Business name'));
    errors.push(validateRequired(phone, 'Phone number'));
    errors.push(validateRequired(email, 'Email'));
    errors.push(validateRequired(password, 'Password'));
    
    // Filter out null errors
    const validationErrors = errors.filter(e => e !== null);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }
    
    // Sanitize inputs
    const sanitizedOwnerName = sanitizeString(ownerName);
    const sanitizedBusinessName = sanitizeString(businessName);
    const sanitizedPhone = sanitizeString(phone);
    const sanitizedEmail = sanitizeString(email).toLowerCase();
    
    // Length validation
    const lengthError = validateLength(sanitizedOwnerName, 'Owner name', 2, 100) ||
                       validateLength(sanitizedBusinessName, 'Business name', 2, 100) ||
                       validateLength(password, 'Password', 8, 100);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }
    
    // Email validation
    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Phone validation
    if (!validatePhone(sanitizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Password validation
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Check if business already exists
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('*')
      .eq('email', sanitizedEmail)
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
        owner_name: sanitizedOwnerName,
        business_name: sanitizedBusinessName,
        phone: sanitizedPhone,
        email: sanitizedEmail,
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
      business_name: sanitizedBusinessName,
      owner_name: sanitizedOwnerName,
      contact_email: sanitizedEmail,
      contact_phone: sanitizedPhone,
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
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`login_${clientIp}`, 5, 300000)) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const sanitizedEmail = sanitizeString(email).toLowerCase();

    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('email', sanitizedEmail)
      .single();

    if (error || !business) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, business.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`admin_login_${clientIp}`, 3, 300000)) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const sanitizedEmail = sanitizeString(email).toLowerCase();

    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Fetch admin from database
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', sanitizedEmail)
      .eq('is_active', true)
      .single();

    if (error || !admin) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Validate password as plain text (exact match)
    if (password !== admin.password) {
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
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`customer_register_${clientIp}`, 3, 300000)) {
      return res.status(429).json({ error: 'Too many registration attempts. Please try again later.' });
    }

    const { name, email, phone, password } = req.body;

    // Validation
    const errors = [];
    errors.push(validateRequired(name, 'Name'));
    errors.push(validateRequired(email, 'Email'));
    errors.push(validateRequired(phone, 'Phone number'));
    errors.push(validateRequired(password, 'Password'));
    
    const validationErrors = errors.filter(e => e !== null);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedEmail = sanitizeString(email).toLowerCase();
    const sanitizedPhone = sanitizeString(phone);

    // Length validation
    const lengthError = validateLength(sanitizedName, 'Name', 2, 100) ||
                       validateLength(password, 'Password', 8, 100);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    // Email validation
    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Phone validation
    if (!validatePhone(sanitizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Password validation
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', sanitizedEmail)
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
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
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
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`customer_login_${clientIp}`, 5, 300000)) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const sanitizedEmail = sanitizeString(email).toLowerCase();

    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', sanitizedEmail)
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

    // Validation
    const errors = [];
    errors.push(validateRequired(name, 'Service name'));
    errors.push(validateRequired(price, 'Price'));
    errors.push(validateRequired(duration, 'Duration'));
    
    const validationErrors = errors.filter(e => e !== null);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedDescription = description ? sanitizeString(description) : '';
    const sanitizedCategory = category ? sanitizeString(category) : '';

    // Length validation
    const lengthError = validateLength(sanitizedName, 'Service name', 2, 100);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    // Category validation (whitelist)
    if (sanitizedCategory) {
      const validCategories = ['hair', 'coloring', 'styling', 'treatment', 'nails', 'spa', 'makeup', 'skincare', 'waxing', 'other'];
      if (!validCategories.includes(sanitizedCategory.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid service category' });
      }
    }

    // Number validation
    const priceError = validateNumber(price, 'Price', 0, 100000);
    if (priceError) {
      return res.status(400).json({ error: priceError });
    }

    const durationError = validateNumber(duration, 'Duration', 1, 1440);
    if (durationError) {
      return res.status(400).json({ error: durationError });
    }

    // Validate duration is one of the allowed values
    const validDurations = [15, 30, 45, 60, 90, 120, 180];
    const durationNum = parseInt(duration);
    if (!validDurations.includes(durationNum)) {
      return res.status(400).json({ error: 'Invalid duration value.' });
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert([{
        business_id: businessId,
        name: sanitizedName,
        price: parseFloat(price),
        duration: parseInt(duration),
        description: sanitizedDescription,
        category: sanitizedCategory,
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

    // Validation
    const errors = [];
    errors.push(validateRequired(name, 'Service name'));
    errors.push(validateRequired(price, 'Price'));
    errors.push(validateRequired(duration, 'Duration'));
    
    const validationErrors = errors.filter(e => e !== null);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedDescription = description ? sanitizeString(description) : '';
    const sanitizedCategory = category ? sanitizeString(category) : '';

    // Length validation
    const lengthError = validateLength(sanitizedName, 'Service name', 2, 100);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    // Category validation (whitelist)
    if (sanitizedCategory) {
      const validCategories = ['haircut', 'coloring', 'styling', 'treatment', 'nails', 'spa', 'makeup', 'waxing', 'other'];
      if (!validCategories.includes(sanitizedCategory.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid service category' });
      }
    }

    // Number validation
    const priceError = validateNumber(price, 'Price', 0, 100000);
    if (priceError) {
      return res.status(400).json({ error: priceError });
    }

    const durationError = validateNumber(duration, 'Duration', 1, 1440);
    if (durationError) {
      return res.status(400).json({ error: durationError });
    }

    // Validate duration is one of the allowed values
    const validDurations = [15, 30, 45, 60, 90, 120, 180];
    const durationNum = parseInt(duration);
    if (!validDurations.includes(durationNum)) {
      return res.status(400).json({ error: 'Invalid duration value.' });
    }

    const { data: service, error } = await supabase
      .from('services')
      .update({
        name: sanitizedName,
        price: parseFloat(price),
        duration: parseInt(duration),
        description: sanitizedDescription,
        category: sanitizedCategory,
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

    // Validation
    const errors = [];
    errors.push(validateRequired(name, 'Stylist name'));
    
    const validationErrors = errors.filter(e => e !== null);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedBio = bio ? sanitizeString(bio) : '';
    const sanitizedEmail = email ? sanitizeString(email).toLowerCase() : '';

    // Length validation
    const lengthError = validateLength(sanitizedName, 'Stylist name', 2, 100);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    // Email validation (if provided)
    if (sanitizedEmail && !validateEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Experience validation
    if (experience) {
      const expError = validateNumber(experience, 'Experience', 0, 100);
      if (expError) {
        return res.status(400).json({ error: expError });
      }
    }

    const { data: stylist, error } = await supabase
      .from('stylists')
      .insert([{
        business_id: businessId,
        name: sanitizedName,
        bio: sanitizedBio,
        specialties: Array.isArray(specialties) ? specialties : [specialties],
        experience: parseInt(experience) || 0,
        email: sanitizedEmail,
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

    // Validation
    const errors = [];
    errors.push(validateRequired(name, 'Stylist name'));
    
    const validationErrors = errors.filter(e => e !== null);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedBio = bio ? sanitizeString(bio) : '';
    const sanitizedEmail = email ? sanitizeString(email).toLowerCase() : '';

    // Length validation
    const lengthError = validateLength(sanitizedName, 'Stylist name', 2, 100);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    // Email validation (if provided)
    if (sanitizedEmail && !validateEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Experience validation
    if (experience) {
      const expError = validateNumber(experience, 'Experience', 0, 100);
      if (expError) {
        return res.status(400).json({ error: expError });
      }
    }

    const { data: stylist, error } = await supabase
      .from('stylists')
      .update({
        name: sanitizedName,
        bio: sanitizedBio,
        specialties: Array.isArray(specialties) ? specialties : [specialties],
        experience: parseInt(experience) || 0,
        email: sanitizedEmail,
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

    // Validation
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Sanitize input
    const sanitizedStatus = sanitizeString(status);

    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(sanitizedStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({ status: sanitizedStatus })
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    console.log(`📝 Appointment status updated to: ${sanitizedStatus}`);
    console.log(`🔍 Checking if email notification needed...`);
    console.log(`   Status is 'confirmed'? ${sanitizedStatus === 'confirmed'}`);
    console.log(`   Status is 'cancelled'? ${sanitizedStatus === 'cancelled'}`);
    console.log(`   Status is 'completed'? ${sanitizedStatus === 'completed'}`);

    // Send email notification for confirmed, cancelled, or completed appointments
    if (sanitizedStatus === 'confirmed' || sanitizedStatus === 'cancelled' || sanitizedStatus === 'completed') {
      console.log('🔔 ✅ YES - Status requires email notification, fetching full appointment details...');
      console.log('   Using database client:', supabaseAdmin ? 'ADMIN (service role)' : 'ANON (public)');
      
      // Fetch full appointment details with related data
      // Use admin client if available to ensure access to protected fields like customers.email
      const dbClient = supabaseAdmin || supabase;
      const { data: fullAppointment, error: fetchError } = await dbClient
        .from('appointments')
        .select(`
          *,
          customers (*),
          services (*),
          stylists (*),
          businesses (*)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching full appointment:', fetchError);
      } else {
        console.log('✓ Full appointment data fetched');
        console.log('📋 Appointment ID:', fullAppointment?.id);
        console.log('👤 Customer data:', JSON.stringify(fullAppointment?.customers, null, 2));
        console.log('📧 Customer email:', fullAppointment?.customers?.email || '❌ MISSING');
      }

      if (fullAppointment && fullAppointment.customers?.email) {
        console.log('✅ Customer email found! Triggering email send for status:', sanitizedStatus);
        // Send email asynchronously (don't wait for it to complete)
        sendAppointmentEmail(fullAppointment, sanitizedStatus).catch(err => {
          console.error('❌ Email sending failed:', err);
          // Don't throw error - email failure shouldn't prevent status update
        });
      } else {
        console.warn('⚠️ Cannot send email: Missing appointment data or customer email');
        console.warn('  fullAppointment exists?', !!fullAppointment);
        console.warn('  customers object exists?', !!fullAppointment?.customers);
        console.warn('  email exists?', !!fullAppointment?.customers?.email);
        // Fallback: notify business email so we can validate end-to-end delivery
        try {
          const businessEmail = fullAppointment?.businesses?.email || process.env.EMAIL_FROM || process.env.EMAIL_USER;
          if (businessEmail) {
            console.log('📨 Fallback: sending notification to business email:', businessEmail);
            const fallback = {
              ...fullAppointment,
              customers: { name: 'Customer', email: businessEmail },
            };
            sendAppointmentEmail(fallback, sanitizedStatus).catch(err => {
              console.error('❌ Fallback email sending failed:', err?.message || err);
            });
          } else {
            console.warn('⚠️ No fallback business email available. Skipping email send.');
          }
        } catch (e) {
          console.warn('⚠️ Fallback email attempt threw an error:', e?.message || e);
        }
      }
    } else {
      console.log(`ℹ️ Status '${sanitizedStatus}' does not require email notification`);
    }

    res.json({ success: true, appointment });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Temporary compatibility route to catch legacy front-end typo '/api/businesss/...'
app.put('/api/businesss/appointments/:id/status', authenticateToken, requireBusinessAuth, async (req, res) => {
  console.log('⚠️ Legacy route /api/businesss/ hit. Redirecting internally to correct handler.');
  req.url = req.url.replace('/api/businesss', '/api/business');
  return app._router.handle(req, res, require('finalhandler')(req, res));
});

// Delete Appointment
app.delete('/api/business/appointments/:id', authenticateToken, requireBusinessAuth, async (req, res) => {
  try {
    const businessId = req.user.id;
    const appointmentId = req.params.id;

    console.log(`🗑️ Deleting appointment ${appointmentId} for business ${businessId}`);

    // First verify the appointment belongs to this business
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', appointmentId)
      .eq('business_id', businessId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found or does not belong to your business' });
    }

    // Delete the appointment
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId)
      .eq('business_id', businessId);

    if (deleteError) throw deleteError;

    console.log(`✅ Appointment ${appointmentId} deleted successfully`);
    res.json({ success: true, message: 'Appointment deleted successfully' });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
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
    const { hours, day, open_time, close_time, is_closed } = req.body;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    // If updating a single day
    if (typeof day !== 'undefined') {
      const dayError = validateNumber(day, 'Day', 0, 6);
      if (dayError) {
        return res.status(400).json({ error: dayError });
      }
      if (!is_closed) {
        if (!timeRegex.test(open_time)) {
          return res.status(400).json({ error: `Invalid open time format for day ${day}. Expected HH:MM format.` });
        }
        if (!timeRegex.test(close_time)) {
          return res.status(400).json({ error: `Invalid close time format for day ${day}. Expected HH:MM format.` });
        }
      }
      // Check if entry exists
      const { data: existing } = await supabase
        .from('business_hours')
        .select('id')
        .eq('business_id', businessId)
        .eq('day', day)
        .single();
      if (existing) {
        // Update existing entry
        const { error } = await supabase
          .from('business_hours')
          .update({
            open_time: is_closed ? null : open_time,
            close_time: is_closed ? null : close_time,
            is_closed: !!is_closed,
            updated_at: new Date().toISOString()
          })
          .eq('business_id', businessId)
          .eq('day', day);
        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase
          .from('business_hours')
          .insert({
            business_id: businessId,
            day,
            open_time: is_closed ? null : open_time,
            close_time: is_closed ? null : close_time,
            is_closed: !!is_closed
          });
        if (error) throw error;
      }
      return res.json({ success: true, message: 'Business hours updated successfully for selected day.' });
    }

    // If updating all days (bulk update)
    if (Array.isArray(hours)) {
      for (const hour of hours) {
        if (hour.day === undefined) {
          return res.status(400).json({ error: 'Day is required for each hour entry' });
        }
        const dayError = validateNumber(hour.day, 'Day', 0, 6);
        if (dayError) {
          return res.status(400).json({ error: dayError });
        }
        const openTime = hour.open_time || '09:00';
        const closeTime = hour.close_time || '17:00';
        const isClosed = hour.is_closed || false;
        if (!isClosed) {
          if (!timeRegex.test(openTime)) {
            return res.status(400).json({ error: `Invalid open time format for day ${hour.day}. Expected HH:MM format.` });
          }
          if (!timeRegex.test(closeTime)) {
            return res.status(400).json({ error: `Invalid close time format for day ${hour.day}. Expected HH:MM format.` });
          }
        }
        const { data: existing } = await supabase
          .from('business_hours')
          .select('id')
          .eq('business_id', businessId)
          .eq('day', hour.day)
          .single();
        if (existing) {
          const { error } = await supabase
            .from('business_hours')
            .update({
              open_time: isClosed ? null : openTime,
              close_time: isClosed ? null : closeTime,
              is_closed: !!isClosed,
              updated_at: new Date().toISOString()
            })
            .eq('business_id', businessId)
            .eq('day', hour.day);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('business_hours')
            .insert({
              business_id: businessId,
              day: hour.day,
              open_time: isClosed ? null : openTime,
              close_time: isClosed ? null : closeTime,
              is_closed: !!isClosed
            });
          if (error) throw error;
        }
      }
      return res.json({ success: true, message: 'Business hours updated successfully.' });
    }

    return res.status(400).json({ error: 'Invalid request. Provide either hours array or day info.' });
  } catch (error) {
    console.error('Update hours error:', error);
    res.status(500).json({ error: 'Failed to update business hours' });
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

    // Validate required parameters
    if (!date || !duration || !stylistId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get business hours for the specific day
    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay();
    
    const { data: businessHours, error: hoursError } = await supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', businessId)
      .eq('day', dayOfWeek)
      .single();

    // If business is closed on this day, return empty array
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

    // Check if the selected date is today
    const today = new Date();
    const isToday = requestDate.toDateString() === today.toDateString();
    const currentTime = isToday ? today.toTimeString().slice(0, 5) : null;

    // Generate available time slots
    const availableSlots = generateTimeSlots(
      businessHours.open_time,
      businessHours.close_time,
      parseInt(duration),
      existingAppointments || [],
      currentTime
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
    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`booking_${clientIp}`, 3, 300000)) {
      return res.status(429).json({ error: 'Too many booking attempts. Please try again later.' });
    }

    const { businessId, customerName, customerEmail, customerPhone, serviceId, stylistId, appointmentDate, appointmentTime, specialRequests } = req.body;

    // Validation
    const errors = [];
    errors.push(validateRequired(businessId, 'Business ID'));
    errors.push(validateRequired(customerName, 'Customer name'));
    errors.push(validateRequired(customerEmail, 'Customer email'));
    errors.push(validateRequired(customerPhone, 'Phone number'));
    errors.push(validateRequired(serviceId, 'Service'));
    errors.push(validateRequired(stylistId, 'Stylist'));
    errors.push(validateRequired(appointmentDate, 'Appointment date'));
    errors.push(validateRequired(appointmentTime, 'Appointment time'));
    
    const validationErrors = errors.filter(e => e !== null);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    // Sanitize inputs
    const sanitizedCustomerName = sanitizeString(customerName);
    const sanitizedCustomerEmail = sanitizeString(customerEmail);
    const sanitizedCustomerPhone = sanitizeString(customerPhone);
    const sanitizedSpecialRequests = specialRequests ? sanitizeString(specialRequests) : '';

    // Length validation
    const lengthError = validateLength(sanitizedCustomerName, 'Customer name', 2, 100);
    if (lengthError) {
      return res.status(400).json({ error: lengthError });
    }

    // Email validation
    if (!validateEmail(sanitizedCustomerEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    // Phone validation
    if (!validatePhone(sanitizedCustomerPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Date validation
    const appointmentDateObj = new Date(appointmentDate);
    if (isNaN(appointmentDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid appointment date' });
    }

    // Time validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      return res.status(400).json({ error: 'Invalid appointment time format' });
    }

    // Validate that business exists
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return res.status(400).json({ error: 'Business not found or invalid' });
    }

    // Validate that service exists and belongs to this business
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration, business_id, is_available')
      .eq('id', serviceId)
      .eq('business_id', businessId)
      .single();

    if (serviceError || !service) {
      return res.status(400).json({ error: 'Service not found or not available for this business' });
    }

    if (!service.is_available) {
      return res.status(400).json({ error: 'Selected service is currently unavailable' });
    }

    // Validate that stylist exists and belongs to this business
    const { data: stylist, error: stylistError } = await supabase
      .from('stylists')
      .select('id, name, business_id, is_active')
      .eq('id', stylistId)
      .eq('business_id', businessId)
      .single();

    if (stylistError || !stylist) {
      return res.status(400).json({ error: 'Stylist not found or not available for this business' });
    }

    if (!stylist.is_active) {
      return res.status(400).json({ error: 'Selected stylist is currently unavailable' });
    }

    // Validate that the appointment date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDateObj < today) {
      return res.status(400).json({ error: 'Cannot book appointments in the past' });
    }

    // Validate business hours for the selected day
    const dayOfWeek = appointmentDateObj.getDay();
    const { data: businessHours, error: hoursError } = await supabase
      .from('business_hours')
      .select('open_time, close_time, is_closed')
      .eq('business_id', businessId)
      .eq('day', dayOfWeek)
      .single();

    if (hoursError || !businessHours) {
      return res.status(400).json({ error: 'Business hours not configured' });
    }

    if (businessHours.is_closed) {
      return res.status(400).json({ error: 'Business is closed on the selected day' });
    }

    // Validate that appointment time is within business hours
    if (appointmentTime < businessHours.open_time || appointmentTime >= businessHours.close_time) {
      return res.status(400).json({ error: 'Appointment time is outside business hours' });
    }

    // Check for conflicting appointments for this stylist
    const { data: conflictingAppointments, error: conflictError } = await supabase
      .from('appointments')
      .select('id, appointment_time, duration')
      .eq('business_id', businessId)
      .eq('stylist_id', stylistId)
      .eq('appointment_date', appointmentDate)
      .in('status', ['pending', 'confirmed']);

    if (!conflictError && conflictingAppointments && conflictingAppointments.length > 0) {
      // Check for time slot conflicts
      const requestedStartTime = appointmentTime;
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const requestedEndMinutes = hours * 60 + minutes + service.duration;
      const requestedEndTime = `${Math.floor(requestedEndMinutes / 60).toString().padStart(2, '0')}:${(requestedEndMinutes % 60).toString().padStart(2, '0')}`;

      for (const apt of conflictingAppointments) {
        const [aptHours, aptMinutes] = apt.appointment_time.split(':').map(Number);
        const aptStartMinutes = aptHours * 60 + aptMinutes;
        const aptEndMinutes = aptStartMinutes + (apt.duration || 30);

        const requestedStartMinutes = hours * 60 + minutes;
        
        // Check if times overlap
        if (requestedStartMinutes < aptEndMinutes && requestedEndMinutes > aptStartMinutes) {
          return res.status(400).json({ error: 'This time slot is already booked' });
        }
      }
    }

    // Check if customer exists, if not create one
    let customerId = uuidv4();
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', sanitizedCustomerEmail)
      .single();

    if (!existingCustomer) {
      const { error: customerError } = await supabase
        .from('customers')
        .insert([{
          id: customerId,
          name: sanitizedCustomerName,
          email: sanitizedCustomerEmail,
          phone: sanitizedCustomerPhone
        }]);

      if (customerError) throw customerError;
    } else {
      customerId = existingCustomer.id;
      
      // Update existing customer info
      await supabase
        .from('customers')
        .update({
          name: sanitizedCustomerName,
          phone: sanitizedCustomerPhone
        })
        .eq('id', customerId);
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
        special_requests: sanitizedSpecialRequests,
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

    // Validation
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Sanitize input
    const sanitizedStatus = sanitizeString(status);

    // Validate status value
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'rejected'];
    if (!validStatuses.includes(sanitizedStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const { data: lead, error } = await supabase
      .from('insurance_leads')
      .update({ status: sanitizedStatus, last_contacted: new Date().toISOString() })
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
    // Use admin client to access customer email (protected by RLS)
    const client = supabaseAdmin || supabase;
    const { data: appointments, error } = await client
      .from('appointments')
      .select(`
        *,
        businesses:business_id(business_name),
        services:service_id(name, price),
        stylists:stylist_id(name),
        customers:customer_id(name, phone, email)
      `)
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    res.json(appointments || []);

  } catch (error) {
    console.error('Admin appointments error:', error);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// Update Appointment Status (Admin)
app.put('/api/admin/appointments/:id/status', authenticateToken, requireAdminAuth, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Update appointment status
    const { data: appointment, error: updateError } = await supabase
      .from('appointments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        businesses:business_id(business_name, email, phone),
        services:service_id(name, price, duration),
        stylists:stylist_id(name),
        customers:customer_id(name, phone, email)
      `)
      .single();

    if (updateError) throw updateError;

    // Send email notification to customer
    try {
      await sendAppointmentEmail(appointment, status);
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      message: 'Appointment status updated successfully',
      appointment 
    });

  } catch (error) {
    console.error('Admin appointment status update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update appointment status' 
    });
  }
});

// Generate QR Code
app.get('/api/qr-code/:businessId', async (req, res) => {
  try {
    const businessId = req.params.businessId;
    const format = req.query.format || 'svg'; // Support both svg and png
    const qrUrl = `${req.protocol}://${req.get('host')}/customerauth?business=${businessId}`;
    
    if (format === 'png') {
      // Generate PNG format
      const qrPng = qr.image(qrUrl, { type: 'png', size: 10, margin: 2 });
      res.setHeader('Content-type', 'image/png');
      qrPng.pipe(res);
    } else {
      // Default to SVG format
      const qrSvg = qr.image(qrUrl, { type: 'svg' });
      res.setHeader('Content-type', 'image/svg+xml');
      qrSvg.pipe(res);
    }

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
function generateTimeSlots(openTime, closeTime, duration, existingAppointments, currentTime = null) {
  const slots = [];
  const start = new Date(`1970-01-01T${openTime}`);
  const end = new Date(`1970-01-01T${closeTime}`);
  
  let current = new Date(start);
  
  while (current < end) {
    const slotTime = current.toTimeString().slice(0, 5);
    const slotEnd = new Date(current.getTime() + duration * 60000);
    
    // Skip past time slots if currentTime is provided (for today's bookings)
    if (currentTime && slotTime <= currentTime) {
      current = new Date(current.getTime() + 30 * 60000); // 30-minute intervals
      continue;
    }
    
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