# EmailJS Setup Guide - Secure Server-Side Implementation

This guide explains how to set up email notifications for appointment confirmations and cancellations using EmailJS with credentials stored securely on the server (Vercel environment variables).

## 🔒 Security Architecture

**Important:** All EmailJS credentials are stored on the **server-side** (Vercel environment variables), NOT in the frontend code. This ensures:
- ✅ Credentials are never exposed to users
- ✅ API keys remain private
- ✅ Secure email sending through server
- ✅ No risk of credential theft from client-side code

---

## Step 1: Create EmailJS Account

1. Visit [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click **"Sign Up"** and create a free account (200 emails/month)
3. Verify your email address
4. Log in to your dashboard

---

## Step 2: Set Up Email Service

1. In your EmailJS dashboard, go to **"Email Services"**
2. Click **"Add New Service"**
3. Choose your email provider:
   - **Gmail** (recommended for easy setup)
   - Outlook
   - Yahoo
   - Custom SMTP
4. Follow the connection wizard for your chosen provider
5. **Save your Service ID** (example: `service_abc1234`)

### Gmail Setup Tips:
- Use an App Password (not your regular Gmail password)
- Enable 2-factor authentication
- Generate app password at: https://myaccount.google.com/apppasswords

---

## Step 3: Create Email Templates

You need to create **two email templates** in EmailJS.

### Template 1: Appointment Confirmed ✅

1. Go to **"Email Templates"** in the sidebar
2. Click **"Create New Template"**
3. Name: `Appointment Confirmed`
4. **Copy the Template ID** (e.g., `template_confirm123`)

**Subject Line:**
```
Appointment Confirmed - {{business_name}}
```

**Email Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .details p { margin: 10px 0; }
        .details strong { color: #4CAF50; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; border-radius: 0 0 10px 10px; }
        .important { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Appointment Confirmed</h1>
        </div>
        <div class="content">
            <p>Dear {{to_name}},</p>
            <p>Great news! Your appointment has been confirmed.</p>
            
            <div class="details">
                <h3 style="color: #4CAF50; margin-top: 0;">📋 Appointment Details</h3>
                <p><strong>Business:</strong> {{business_name}}</p>
                <p><strong>Service:</strong> {{service_name}}</p>
                <p><strong>Stylist:</strong> {{stylist_name}}</p>
                <p><strong>Date:</strong> {{appointment_date}}</p>
                <p><strong>Time:</strong> {{appointment_time}}</p>
                <p><strong>Duration:</strong> {{service_duration}} minutes</p>
                <p><strong>Price:</strong> ${{service_price}}</p>
            </div>
            
            <div class="important">
                <strong>⏰ Important:</strong> Please arrive 10 minutes before your scheduled time.
            </div>
            
            <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
            
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 5px;">
                <h4 style="margin-top: 0;">📞 Contact Information</h4>
                <p><strong>Phone:</strong> {{business_phone}}</p>
                <p><strong>Address:</strong> {{business_address}}</p>
            </div>
        </div>
        <div class="footer">
            <p>Thank you for choosing {{business_name}}!</p>
            <p style="margin-top: 10px;">This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

---

### Template 2: Appointment Cancelled ❌

1. Click **"Create New Template"** again
2. Name: `Appointment Cancelled`
3. **Copy the Template ID** (e.g., `template_cancel123`)

**Subject Line:**
```
Appointment Cancelled - {{business_name}}
```

**Email Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; }
        .details { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #f44336; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .details p { margin: 10px 0; }
        .details strong { color: #f44336; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; border-radius: 0 0 10px 10px; }
        .rebook { background: #e3f2fd; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✗ Appointment Cancelled</h1>
        </div>
        <div class="content">
            <p>Dear {{to_name}},</p>
            <p>We're sorry to inform you that your appointment has been cancelled.</p>
            
            <div class="details">
                <h3 style="color: #f44336; margin-top: 0;">📋 Cancelled Appointment Details</h3>
                <p><strong>Business:</strong> {{business_name}}</p>
                <p><strong>Service:</strong> {{service_name}}</p>
                <p><strong>Stylist:</strong> {{stylist_name}}</p>
                <p><strong>Date:</strong> {{appointment_date}}</p>
                <p><strong>Time:</strong> {{appointment_time}}</p>
            </div>
            
            <p>We apologize for any inconvenience this may cause.</p>
            
            <div class="rebook">
                <strong>💡 Want to rebook?</strong> We'd love to see you! Contact us to schedule a new appointment.
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 5px;">
                <h4 style="margin-top: 0;">📞 Contact Information</h4>
                <p><strong>Phone:</strong> {{business_phone}}</p>
                <p><strong>Address:</strong> {{business_address}}</p>
            </div>
        </div>
        <div class="footer">
            <p>We hope to see you soon at {{business_name}}!</p>
            <p style="margin-top: 10px;">This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
```

---

## Step 4: Get Your Credentials

### A. Public Key
1. Go to **"Account"** → **"General"**
2. Find **"Public Key"**
3. Copy it (e.g., `AbCdEf123456789`)

### B. Private Key
1. Go to **"Account"** → **"General"**
2. Find **"Private Key"**
3. Copy it (e.g., `XyZ987654321abc`)

### C. Service ID
- From Step 2 (e.g., `service_abc1234`)

### D. Template IDs
- Confirmed template (e.g., `template_confirm123`)
- Cancelled template (e.g., `template_cancel123`)

---

## Step 5: Configure Vercel Environment Variables

### Option A: Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add these variables:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `EMAILJS_PUBLIC_KEY` | Your public key | `AbCdEf123456789` |
| `EMAILJS_PRIVATE_KEY` | Your private key | `XyZ987654321abc` |
| `EMAILJS_SERVICE_ID` | Your service ID | `service_abc1234` |
| `EMAILJS_TEMPLATE_CONFIRMED` | Confirmed template ID | `template_confirm123` |
| `EMAILJS_TEMPLATE_CANCELLED` | Cancelled template ID | `template_cancel123` |

4. Click **"Save"** for each variable
5. Redeploy your application

### Option B: Local Development (.env file)

Create or update your `.env` file:

```env
# EmailJS Configuration (Server-Side)
EMAILJS_PUBLIC_KEY=your_public_key_here
EMAILJS_PRIVATE_KEY=your_private_key_here
EMAILJS_SERVICE_ID=service_abc1234
EMAILJS_TEMPLATE_CONFIRMED=template_confirm123
EMAILJS_TEMPLATE_CANCELLED=template_cancel123

# Your existing variables
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

**⚠️ Important:** Never commit `.env` to version control!

---

## Step 6: Install Dependencies

Run this command to install the EmailJS server SDK:

```bash
npm install
```

This installs `@emailjs/nodejs` which is already added to `package.json`.

---

## Step 7: Deploy to Vercel

### First Time Deployment:

```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Deploy
vercel
```

### Update Existing Deployment:

```bash
vercel --prod
```

After deployment, Vercel will automatically use the environment variables you configured.

---

## Step 8: Test Email Functionality

1. **Log in as a business owner**
2. Go to **"Appointments"** section
3. Find a pending appointment
4. Click **"Confirm"** or **"Cancel"**
5. **Check:**
   - ✓ Success message appears
   - ✓ Customer receives email
   - ✓ Email contains correct details
   - ✓ Email design looks professional

---

## 🎯 How It Works

```
Business Owner                Server (Vercel)              EmailJS
     |                              |                         |
     |--Click "Confirm"------------>|                         |
     |                              |                         |
     |                              |--Update DB             |
     |                              |                         |
     |                              |--Send Email Request---->|
     |                              |   (with credentials)    |
     |                              |                         |
     |                              |<--Email Sent------------|
     |                              |                         |
     |<--Success Message------------|                         |
     |                              |                         |
Customer Email <----------------------------------------------|
```

**Key Security Feature:** EmailJS credentials are ONLY on the server, never exposed to the browser.

---

## 📧 Email Template Variables

Your templates have access to these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{to_email}}` | Customer email | `john@example.com` |
| `{{to_name}}` | Customer name | `John Doe` |
| `{{business_name}}` | Business name | `Elegant Salon` |
| `{{service_name}}` | Service booked | `Haircut & Styling` |
| `{{stylist_name}}` | Assigned stylist | `Jane Smith` |
| `{{appointment_date}}` | Formatted date | `Jan 15, 2024` |
| `{{appointment_time}}` | Time | `10:00 AM` |
| `{{appointment_status}}` | Status | `confirmed` |
| `{{status_message}}` | Custom message | Auto-generated |
| `{{business_phone}}` | Phone number | `(555) 123-4567` |
| `{{business_address}}` | Address | `123 Main St` |
| `{{service_duration}}` | Duration | `60` (minutes) |
| `{{service_price}}` | Price | `50.00` |

---

## 🔧 Troubleshooting

### Emails Not Sending?

**Check Server Logs:**
```bash
vercel logs
```

Look for:
- ❌ "EmailJS not configured" → Add environment variables
- ❌ "Customer email not available" → Customer record missing email
- ❌ "Email sending failed" → Check EmailJS dashboard for errors

### Common Issues:

| Issue | Solution |
|-------|----------|
| No email received | Check spam/junk folder |
| Wrong template | Verify template IDs in Vercel settings |
| Service error | Check service ID and email service connection |
| Monthly limit reached | Upgrade EmailJS plan or wait for reset |
| Invalid credentials | Re-check public/private keys |

### Verify Configuration:

1. **Vercel Dashboard:**
   - Settings → Environment Variables
   - Ensure all 5 variables are set

2. **EmailJS Dashboard:**
   - Check email service is connected
   - Verify templates exist
   - Check monthly quota usage

3. **Database:**
   - Ensure customer records have email addresses
   - Check appointment has all required relationships

---

## 💰 Pricing

### EmailJS Free Tier:
- ✅ 200 emails/month
- ✅ Perfect for small businesses
- ✅ All features included
- ✅ No credit card required

### Paid Plans (if needed):
- **Personal:** $7/month - 1,000 emails
- **Professional:** $15/month - 5,000 emails
- **Business:** $45/month - 20,000 emails

---

## 🔐 Security Best Practices

✅ **DO:**
- Store credentials in Vercel environment variables
- Use private key for server-side sending
- Validate email addresses before sending
- Log email errors for debugging
- Monitor monthly usage

❌ **DON'T:**
- Commit `.env` file to Git
- Expose credentials in frontend code
- Send emails from client-side
- Share API keys publicly
- Hardcode credentials in code

---

## 📚 Additional Resources

- **EmailJS Docs:** [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)
- **Node.js SDK:** [https://www.emailjs.com/docs/sdk/nodejs/](https://www.emailjs.com/docs/sdk/nodejs/)
- **Vercel Env Vars:** [https://vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables)
- **Support:** [https://www.emailjs.com/support/](https://www.emailjs.com/support/)

---

## ✅ Setup Checklist

- [ ] Created EmailJS account
- [ ] Set up email service (Gmail/Outlook/etc.)
- [ ] Created "Appointment Confirmed" template
- [ ] Created "Appointment Cancelled" template
- [ ] Copied Public Key
- [ ] Copied Private Key
- [ ] Copied Service ID
- [ ] Copied both Template IDs
- [ ] Added all 5 environment variables to Vercel
- [ ] Ran `npm install`
- [ ] Deployed to Vercel with `vercel --prod`
- [ ] Tested by confirming an appointment
- [ ] Tested by cancelling an appointment
- [ ] Verified emails received with correct details

---

## 🎉 You're All Set!

Your salon booking app now sends professional email notifications automatically when appointments are confirmed or cancelled. Emails are sent securely from the server with no credential exposure!

**Need help?** Check the troubleshooting section or EmailJS documentation.
