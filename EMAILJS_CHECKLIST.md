# EmailJS Setup Checklist

Quick reference guide for setting up email notifications.

## ✅ Pre-Setup Checklist

- [ ] Have Vercel account ready
- [ ] Have access to email account (Gmail/Outlook)
- [ ] Project deployed to Vercel (or ready to deploy)

---

## 📝 Step-by-Step Setup

### Step 1: EmailJS Account
- [ ] Go to https://www.emailjs.com/
- [ ] Create free account
- [ ] Verify email address
- [ ] Log in to dashboard

### Step 2: Email Service
- [ ] Click "Email Services"
- [ ] Click "Add New Service"
- [ ] Choose email provider (Gmail recommended)
- [ ] Connect and authorize
- [ ] **Copy Service ID:** `_________________`

### Step 3: Confirmed Template
- [ ] Go to "Email Templates"
- [ ] Click "Create New Template"
- [ ] Name: "Appointment Confirmed"
- [ ] Copy template HTML from EMAILJS_SETUP.md
- [ ] Set subject: `Appointment Confirmed - {{business_name}}`
- [ ] Save template
- [ ] **Copy Template ID:** `_________________`

### Step 4: Cancelled Template
- [ ] Click "Create New Template" again
- [ ] Name: "Appointment Cancelled"
- [ ] Copy template HTML from EMAILJS_SETUP.md
- [ ] Set subject: `Appointment Cancelled - {{business_name}}`
- [ ] Save template
- [ ] **Copy Template ID:** `_________________`

### Step 5: Get Credentials
- [ ] Go to "Account" → "General"
- [ ] **Copy Public Key:** `_________________`
- [ ] **Copy Private Key:** `_________________`

### Step 6: Vercel Environment Variables
- [ ] Go to Vercel project dashboard
- [ ] Settings → Environment Variables
- [ ] Add `EMAILJS_PUBLIC_KEY` = _______________
- [ ] Add `EMAILJS_PRIVATE_KEY` = _______________
- [ ] Add `EMAILJS_SERVICE_ID` = _______________
- [ ] Add `EMAILJS_TEMPLATE_CONFIRMED` = _______________
- [ ] Add `EMAILJS_TEMPLATE_CANCELLED` = _______________
- [ ] Save all variables

### Step 7: Install & Deploy
- [ ] Run `npm install`
- [ ] Test locally with `.env` file (optional)
- [ ] Deploy: `vercel --prod`
- [ ] Wait for deployment to complete

### Step 8: Testing
- [ ] Log in as business owner
- [ ] Go to Appointments section
- [ ] Create test appointment with your email
- [ ] Click "Confirm" on appointment
- [ ] **Check:** Email received? ✓
- [ ] **Check:** Correct details? ✓
- [ ] **Check:** Professional design? ✓
- [ ] Click "Cancel" on another appointment
- [ ] **Check:** Cancellation email received? ✓

---

## 🎯 Quick Reference

### EmailJS Dashboard URLs
- Dashboard: https://dashboard.emailjs.com/
- Services: https://dashboard.emailjs.com/admin
- Templates: https://dashboard.emailjs.com/admin/templates
- Account: https://dashboard.emailjs.com/admin/account

### Environment Variables Format
```
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_PRIVATE_KEY=your_private_key
EMAILJS_SERVICE_ID=service_xxxxx
EMAILJS_TEMPLATE_CONFIRMED=template_xxxxx
EMAILJS_TEMPLATE_CANCELLED=template_xxxxx
```

---

## 🔍 Verification Checklist

- [ ] All 5 environment variables added to Vercel
- [ ] Variables have correct values (no spaces/typos)
- [ ] Email service connected in EmailJS
- [ ] Both templates created with correct HTML
- [ ] Templates use correct variable names ({{to_name}}, etc.)
- [ ] Application redeployed after adding variables
- [ ] Test emails received successfully
- [ ] Emails not in spam folder

---

## 🐛 Troubleshooting Quick Checks

### No emails received?
- [ ] Check Vercel environment variables exist
- [ ] Check variable names are exactly correct
- [ ] Check EmailJS service is connected
- [ ] Check customer has email in database
- [ ] Check spam/junk folder
- [ ] Check EmailJS dashboard for errors

### Wrong email content?
- [ ] Verify template IDs are correct
- [ ] Check template variables match code
- [ ] Refresh EmailJS dashboard
- [ ] Test template preview in EmailJS

### Server errors?
- [ ] Run `vercel logs` to see errors
- [ ] Check all 5 variables are set
- [ ] Verify keys don't have extra spaces
- [ ] Confirm npm install completed

---

## 💰 Cost Tracking

### Free Tier Limits:
- [ ] Tracking email usage
- [ ] Current month: _____ / 200 emails
- [ ] Set up upgrade if approaching limit

---

## 📅 Maintenance

### Monthly:
- [ ] Check EmailJS usage
- [ ] Verify email delivery rates
- [ ] Review customer feedback

### As Needed:
- [ ] Update email templates
- [ ] Adjust messaging
- [ ] Monitor spam complaints

---

## 🎉 Success Indicators

You know it's working when:
- ✅ Business owner sees "email sent" message
- ✅ Customer receives email within seconds
- ✅ Email has correct appointment details
- ✅ Email design looks professional
- ✅ No errors in Vercel logs
- ✅ EmailJS dashboard shows successful sends

---

## 📚 Documentation Files

Quick links to other docs:
- **EMAILJS_SETUP.md** - Detailed setup with templates
- **EMAIL_IMPLEMENTATION.md** - Technical details
- **.env.example** - Environment variable template
- **README.md** - Project overview

---

## ✍️ Notes

Use this space for your specific IDs:

**Service ID:** ______________________________

**Confirmed Template ID:** ______________________________

**Cancelled Template ID:** ______________________________

**Public Key:** ______________________________

**Private Key:** ______________________________

**Deployment Date:** ______________________________

**Last Tested:** ______________________________

---

## 🚀 Ready to Launch?

Final checklist before going live:
- [ ] All setup steps completed
- [ ] All checkboxes above marked
- [ ] Test emails sent and received successfully
- [ ] Business owner knows email feature exists
- [ ] Monitoring plan in place
- [ ] Documentation accessible to team

**You're ready to start sending professional emails!** 🎉
