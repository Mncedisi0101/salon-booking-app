# Quick Start: Switch to Nodemailer

## ✅ What's Been Done
- ✅ Installed Nodemailer package
- ✅ Replaced EmailJS with Nodemailer in server.js
- ✅ Created beautiful HTML email templates
- ✅ Added test script (test-emailjs.js)
- ✅ Created setup documentation (NODEMAILER_SETUP.md)

## 🎯 What You Need to Do Now

### Step 1: Get Gmail App Password (5 minutes)

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - App: **Mail**
   - Device: **Other (Custom)** → Name it "Salon Booking"
   - Copy the 16-character password (example: `abcd efgh ijkl mnop`)

### Step 2: Update Local .env File

Open `.env` and replace your email settings with:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=your-actual-email@gmail.com
```

### Step 3: Test Locally

Run the test to make sure it works:

```bash
node test-emailjs.js
```

You should see:
- ✅ SMTP connection verified
- ✅ Test email sent successfully
- Email arrives in your inbox

### Step 4: Update Vercel Environment Variables

Go to: https://vercel.com/mncedisi0101s-projects/salon-booking-app/settings/environment-variables

**Add these NEW variables** (for Production, Preview, Development):
- `EMAIL_SERVICE` = `gmail`
- `EMAIL_USER` = your Gmail address
- `EMAIL_PASSWORD` = your 16-character app password
- `EMAIL_FROM` = your Gmail address

**Delete these OLD variables** (no longer needed):
- `EMAILJS_PUBLIC_KEY` ❌
- `EMAILJS_PRIVATE_KEY` ❌
- `EMAILJS_SERVICE_ID` ❌
- `EMAILJS_TEMPLATE_CONFIRMED` ❌
- `EMAILJS_TEMPLATE_CANCELLED` ❌

### Step 5: Deploy to Production

After updating Vercel environment variables:

```bash
vercel --prod
```

### Step 6: Test on Live Site

1. Go to your live Vercel URL
2. Login as business owner
3. Confirm or cancel an appointment
4. Customer should receive a beautiful HTML email!

## 📧 What Customers Will Receive

Professional HTML emails with:
- ✓ Color-coded header (green for confirmed, red for cancelled)
- ✓ All appointment details (business, service, stylist, date, time)
- ✓ Business contact information
- ✓ Mobile-responsive design
- ✓ Professional footer

## 🆘 Troubleshooting

**"Invalid login" error?**
- Use App Password, not your regular Gmail password
- Make sure 2FA is enabled

**Test email not arriving?**
- Check spam folder
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Run `node test-emailjs.js` to see detailed error

**Still having issues?**
- See NODEMAILER_SETUP.md for detailed instructions
- Check Vercel logs for errors

## 🎉 Benefits of Nodemailer

✓ No "browser-only" restrictions
✓ Works perfectly on Vercel serverless
✓ Free with your existing Gmail
✓ Beautiful HTML emails built-in
✓ More reliable than EmailJS
✓ No external API dependencies
