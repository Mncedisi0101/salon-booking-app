# Nodemailer Email Setup Guide

## Overview
We've switched from EmailJS to Nodemailer for reliable server-side email sending. This works with Gmail, Outlook, or any SMTP service.

## Step 1: Get Gmail App Password (Recommended)

### Why App Password?
Gmail requires an "App Password" for third-party apps to send emails securely. Your regular Gmail password won't work.

### Setup Instructions:

1. **Enable 2-Factor Authentication** (required for App Passwords)
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the setup wizard

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Or search "App Passwords" in your Google Account settings
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter name: **Salon Booking App**
   - Click **Generate**
   - Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

3. **Update Your .env File**
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```
   
   **Note:** `EMAIL_FROM` is no longer needed! The system automatically uses each business owner's email as the sender.

4. **Update Vercel Environment Variables**
   - Go to: https://vercel.com/mncedisi0101s-projects/salon-booking-app/settings/environment-variables
   - Add these new variables (Production, Preview, Development):
     - `EMAIL_SERVICE` = `gmail`
     - `EMAIL_USER` = your Gmail address (used for SMTP authentication)
     - `EMAIL_PASSWORD` = your 16-character app password
   - **Note:** `EMAIL_FROM` is no longer needed. The system now automatically uses the business owner's email as the sender, so when customers reply, it goes directly to the business owner, not you!
   - Delete old EmailJS variables (no longer needed):
     - EMAILJS_PUBLIC_KEY
     - EMAILJS_PRIVATE_KEY
     - EMAILJS_SERVICE_ID
     - EMAILJS_TEMPLATE_CONFIRMED
     - EMAILJS_TEMPLATE_CANCELLED

## Alternative: Other Email Services

### Outlook/Office 365
```
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Custom SMTP (Any provider)
```
EMAIL_SERVICE=custom
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
```

**Note:** For all services, business owner emails are used automatically for the "From" and "Reply-To" fields.

## What Changed?

### Environment Variables
**Old (EmailJS):**
- EMAILJS_PUBLIC_KEY
- EMAILJS_PRIVATE_KEY
- EMAILJS_SERVICE_ID
- EMAILJS_TEMPLATE_CONFIRMED
- EMAILJS_TEMPLATE_CANCELLED

**New (Nodemailer):**
- EMAIL_SERVICE (default: gmail) - Your email provider
- EMAIL_USER (your email address) - Used for SMTP authentication
- EMAIL_PASSWORD (app password) - Used for SMTP authentication
- ~~EMAIL_FROM~~ - **No longer needed!** Each business owner's email is used automatically

### How Email Sending Works Now
When a business confirms/cancels an appointment:
1. **SMTP Authentication**: Uses your Gmail (`EMAIL_USER` and `EMAIL_PASSWORD`) to send the email
2. **From Address**: Displays as the business owner's email to the customer
3. **Reply-To**: Set to the business owner's email
4. **Result**: When customers reply, it goes directly to the business owner, not to you!

Example:
- Your Gmail: `admin@yourdomain.com` (used for sending)
- Business Owner Email: `salon123@gmail.com`
- Customer sees email from: `salon123@gmail.com`
- Customer replies to: `salon123@gmail.com` ✓

### Benefits of Nodemailer
✓ No "browser-only" restrictions
✓ Works perfectly on server-side
✓ Free with your existing email
✓ Beautiful HTML email templates built-in
✓ More reliable for production use
✓ No external API dependencies
✓ **Automatic reply-to routing** - Customer replies go directly to business owners!

## Testing Locally

After updating your `.env` file, test with:
```bash
node test-emailjs.js
```

## Next Steps

1. ✅ Generate Gmail App Password
2. ✅ Update local `.env` file
3. ✅ Test locally
4. ✅ Update Vercel environment variables
5. ✅ Deploy to production
6. ✅ Test on live site

## Troubleshooting

### "Invalid login" error
- Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Factor Authentication is enabled on your Google account

### "Less secure app" error
- Use App Password instead (safer and recommended by Google)

### Emails going to spam
- Add SPF/DKIM records to your domain (if using custom domain)
- For Gmail, emails should arrive in inbox by default

## Email Preview

Customers will receive beautiful HTML emails with:
- ✓ Professional header with status indicator
- ✓ All appointment details (business, service, stylist, date, time)
- ✓ Color-coded for confirmed (green) or cancelled (red)
- ✓ Mobile-responsive design
- ✓ Business contact information
- ✓ **Reply button goes directly to business owner's email**
