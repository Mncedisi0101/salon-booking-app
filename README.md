# SalonPro - Professional Salon Booking System

A comprehensive salon booking application with automated email notifications.

## 🌟 Features

- **Business Management Dashboard**
  - Manage services, stylists, and business hours
  - View and manage appointments
  - QR code generation for easy booking

- **Customer Booking System**
  - Easy step-by-step booking process
  - Select services, stylists, and time slots
  - Real-time availability checking

- **Email Notifications** ✉️
  - Automatic confirmation emails
  - Cancellation notifications
  - Professional HTML templates
  - Secure server-side implementation

- **Admin Panel**
  - Business management
  - System-wide oversight
  - Lead tracking

## 📧 Email Notifications

This app uses **EmailJS** for sending professional email notifications to customers when appointments are confirmed or cancelled.

**Key Features:**
- ✅ Secure server-side email sending
- ✅ Credentials stored in environment variables (Vercel)
- ✅ Professional HTML email templates
- ✅ Automatic triggering on status changes
- ✅ Zero credential exposure in frontend

**Setup Guide:** See [`EMAILJS_SETUP.md`](./EMAILJS_SETUP.md) for complete instructions.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required variables:
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- EmailJS credentials (see setup guide)

### 3. Run Locally
```bash
npm start
```

### 4. Deploy to Vercel
```bash
npm install -g vercel
vercel
```

## 📚 Documentation

- [`EMAILJS_SETUP.md`](./EMAILJS_SETUP.md) - Complete EmailJS setup guide with templates
- [`EMAIL_IMPLEMENTATION.md`](./EMAIL_IMPLEMENTATION.md) - Implementation details and architecture
- [`.env.example`](./.env.example) - Environment variables template

## 🔐 Security

- All EmailJS credentials are stored server-side in environment variables
- No API keys or secrets exposed in frontend code
- JWT-based authentication
- Input validation and sanitization
- Rate limiting

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript, Bootstrap 5
- **Backend:** Node.js, Express
- **Database:** Supabase (PostgreSQL)
- **Email:** EmailJS (server-side SDK)
- **Deployment:** Vercel
- **Authentication:** JWT

## 📦 Dependencies

Key packages:
- `express` - Web framework
- `@supabase/supabase-js` - Database client
- `@emailjs/nodejs` - Email service
- `jsonwebtoken` - Authentication
- `bcryptjs` - Password hashing

## 🎯 Email Workflow

```
Business Owner → Confirms/Cancels Appointment
         ↓
Server Updates Database
         ↓
Server Sends Email (with secure credentials)
         ↓
Customer Receives Professional Email
```

## 💡 Usage

### For Business Owners:
1. Register your business
2. Add services and stylists
3. Set business hours
4. Manage appointments (confirm/cancel/complete)
5. Automatic emails sent to customers

### For Customers:
1. Scan QR code or visit booking link
2. Select service and stylist
3. Choose date and time
4. Enter contact information
5. Receive confirmation email

## 🔧 Configuration

### EmailJS Setup (Required for Email Notifications)

1. Create EmailJS account at https://www.emailjs.com/
2. Set up email service (Gmail, Outlook, etc.)
3. Create email templates (provided in setup guide)
4. Add credentials to Vercel environment variables:
   - `EMAILJS_PUBLIC_KEY`
   - `EMAILJS_PRIVATE_KEY`
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_TEMPLATE_CONFIRMED`
   - `EMAILJS_TEMPLATE_CANCELLED`

See [`EMAILJS_SETUP.md`](./EMAILJS_SETUP.md) for detailed instructions.

## 📧 Email Templates

Two professional HTML email templates included:
- **Appointment Confirmed** - Green success theme
- **Appointment Cancelled** - Red alert theme

Full template code provided in setup guide.

## 🐛 Troubleshooting

### Emails not sending?
1. Check Vercel environment variables
2. Verify EmailJS service connection
3. Check customer has valid email address
4. Review server logs: `vercel logs`

See [`EMAILJS_SETUP.md`](./EMAILJS_SETUP.md) troubleshooting section for more help.

## 📄 License

MIT

## 👥 Support

For issues or questions:
- Check documentation files
- Review EmailJS dashboard
- Check Vercel logs
- Verify environment variables

---

**Note:** Email notifications require EmailJS account and proper configuration. See setup guide for details.