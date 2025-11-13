# Email Troubleshooting Guide

## Issue: Customers Not Receiving Emails

I've added detailed logging to help diagnose the email sending issue. Here's what to do:

### Step 1: Restart Your Server

Stop the current server (Ctrl+C in terminal) and restart it:

```bash
npm start
```

### Step 2: Test Email Sending

1. **Log in as a business owner**
2. **Go to Appointments section**
3. **Click "Confirm" or "Cancel" on an appointment**
4. **Watch your terminal/console logs**

You should see detailed logs like:

```
🔔 Starting email send process...
Status: confirmed
Appointment ID: xxxx-xxxx-xxxx

📧 EmailJS Configuration Check:
  Service ID: ✓ Set
  Private Key: ✓ Set
  Public Key: ✓ Set
  Template ID: ✓ Set (template_7g9efuo)

👤 Customer Info:
  Name: John Doe
  Email: john@example.com

📋 Appointment Details:
  Business: Your Salon Name
  Service: Haircut
  Stylist: Jane Smith
  Date: Nov 10, 2025
  Time: 10:00 AM

📤 Sending email...
  To: john@example.com
  Template: template_7g9efuo
  Service: service_bzm41ty

✅ Email sent successfully!
```

### Step 3: Check for Common Issues

#### Issue 1: "EmailJS not configured"
**Problem:** Environment variables not loaded

**Solution:**
```bash
# Make sure .env file exists with these variables:
EMAILJS_PUBLIC_KEY=GCgrGxx8In7JQHpWE
EMAILJS_PRIVATE_KEY=ToH_zelLpIny81qAOmOAB
EMAILJS_SERVICE_ID=service_bzm41ty
EMAILJS_TEMPLATE_CONFIRMED=template_7g9efuo
EMAILJS_TEMPLATE_CANCELLED=template_2r2v3a3
```

Restart server after adding/updating .env file.

#### Issue 2: "Customer email not available"
**Problem:** Customer record missing email address

**Check:** Go to Supabase → customers table → verify email column has values

**Fix:** Update customer records to include email addresses

#### Issue 3: "Template not found" or 401 Unauthorized
**Problem:** EmailJS credentials incorrect or template doesn't exist

**Solutions:**
1. Verify credentials in EmailJS dashboard match .env file
2. Check templates exist: https://dashboard.emailjs.com/admin/templates
3. Ensure template IDs are correct (no typos)
4. Verify email service is connected: https://dashboard.emailjs.com/admin

#### Issue 4: Email sends but customer doesn't receive
**Problem:** Email in spam or delivery issue

**Check:**
1. Spam/junk folder
2. EmailJS dashboard logs: https://dashboard.emailjs.com/admin/logs
3. Email service connection status
4. Monthly quota (200 emails/month on free plan)

### Step 4: Verify EmailJS Dashboard

1. Go to https://dashboard.emailjs.com/
2. Check **Email Services** → Verify service is connected (green checkmark)
3. Check **Email Templates** → Both templates exist:
   - `template_7g9efuo` (Confirmed)
   - `template_2r2v3a3` (Cancelled)
4. Check **Email Logs** → See if emails are being sent from EmailJS

### What I Fixed

1. **Added detailed logging** throughout the email sending process
2. **Fixed business name field** - Changed from `businesses.name` to `businesses.business_name` (matches database schema)
3. **Added error details** in catch blocks for better debugging

### Testing Checklist

- [ ] Server restarted with new logging
- [ ] .env file has all 5 EmailJS variables
- [ ] Appointment has customer with valid email
- [ ] EmailJS service connected in dashboard
- [ ] Templates exist in EmailJS dashboard
- [ ] Monthly quota not exceeded (check dashboard)
- [ ] Logs show email sending attempt
- [ ] Check EmailJS dashboard logs for delivery status

### If Still Not Working

**Share the terminal output** when you confirm/cancel an appointment. The detailed logs will show exactly where the process is failing.

Common log indicators:
- ✅ `Email sent successfully!` → Email was sent from server
- ❌ `EmailJS not configured` → Missing environment variables
- ❌ `Customer email not available` → Database missing email
- ❌ `Error sending email` → Check error details in logs
- ⚠️ `Cannot send email: Missing appointment data` → Database query issue

### Quick Test Command

You can also check if environment variables are loaded:

```bash
# PowerShell
Get-Content .env | Select-String "EMAILJS"
```

Should show all 5 EmailJS variables with values.

---

## Summary of Changes Made

1. **server.js**: Added comprehensive logging to track email sending
2. **server.js**: Fixed `business_name` field reference
3. Enhanced error reporting with detailed error objects
4. Added status checks at every step of email process

The issue is likely one of:
1. ✅ **Fixed:** Wrong database field name (`name` vs `business_name`)
2. Missing or incorrect EmailJS credentials
3. Customer records without email addresses
4. EmailJS service not connected
5. Monthly quota exceeded

**Next:** Restart your server and test confirming an appointment. The detailed logs will tell us exactly what's happening!
