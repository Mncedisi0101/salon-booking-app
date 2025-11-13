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
   EMAIL_FROM=your-email@gmail.com
   ```

4. **Update Vercel Environment Variables**
   - Go to: https://vercel.com/mncedisi0101s-projects/salon-booking-app/settings/environment-variables
   - Add these new variables (Production, Preview, Development):
     - `EMAIL_SERVICE` = `gmail`
     - `EMAIL_USER` = your Gmail address
     - `EMAIL_PASSWORD` = your 16-character app password
     - `EMAIL_FROM` = your Gmail address (optional, defaults to EMAIL_USER)
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
EMAIL_FROM=your-email@outlook.com
```

### Custom SMTP (Any provider)
```
EMAIL_SERVICE=custom
EMAIL_HOST=smtp.yourdomain.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@yourdomain.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=your-email@yourdomain.com
```

## What Changed?

### Environment Variables
**Old (EmailJS):**
- EMAILJS_PUBLIC_KEY
- EMAILJS_PRIVATE_KEY
- EMAILJS_SERVICE_ID
- EMAILJS_TEMPLATE_CONFIRMED
- EMAILJS_TEMPLATE_CANCELLED

**New (Nodemailer):**
- EMAIL_SERVICE (default: gmail)
- EMAIL_USER (your email address)
- EMAIL_PASSWORD (app password)
- EMAIL_FROM (sender name/email, optional)

### Benefits of Nodemailer
✓ No "browser-only" restrictions
✓ Works perfectly on server-side
✓ Free with your existing email
✓ Beautiful HTML email templates built-in
✓ More reliable for production use
✓ No external API dependencies

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
