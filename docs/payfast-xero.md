# PayFast and Xero Integration

## 1. PayFast Integration

### Step 1: Sign Up for PayFast
- Go to [PayFast](https://www.payfast.co.za/) and create an account.
- Obtain your **Merchant ID**, **Merchant Key**, and test credentials.

### Step 2: Install Required Libraries
Use `axios` or `node-fetch` for API requests. Install dependencies:

```bash
npm install axios body-parser crypto
```

### Step 3: Create PayFast Payment Route

In `routes/payments.js`, create a route for initiating payments.

```javascript
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// PayFast credentials
const merchantId = process.env.PAYFAST_MERCHANT_ID;
const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
const returnUrl = process.env.PAYFAST_RETURN_URL; // e.g., https://yourdomain.com/return
const cancelUrl = process.env.PAYFAST_CANCEL_URL; // e.g., https://yourdomain.com/cancel
const notifyUrl = process.env.PAYFAST_NOTIFY_URL; // e.g., https://yourdomain.com/notify

// Generate PayFast payment URL
router.post('/payfast', (req, res) => {
  const { amount, name, email } = req.body;

  const data = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    amount,
    item_name: "Payment for Service",
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    email_address: email,
  };

  // Generate signature
  const signatureString = Object.keys(data)
    .map((key) => `${key}=${encodeURIComponent(data[key])}`)
    .join('&');
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  // Redirect to PayFast
  const payFastUrl = `https://sandbox.payfast.co.za/eng/process?${signatureString}&signature=${signature}`;
  res.json({ url: payFastUrl });
});

module.exports = router;
```

### Step 4: Add Payment Notifications

PayFast will send a notification when a payment is completed. Add a notification handler in your backend.

```javascript
router.post('/payfast/notify', (req, res) => {
  const payload = req.body;

  // Verify payload (check PayFast docs for validation logic)
  console.log('Payment Notification Received:', payload);

  // Update database with payment status
  // Example: Save the transaction to Payments collection
  // const payment = new Payment(payload);
  // payment.save();

  res.status(200).send('OK'); // Respond to PayFast
});
```

### Step 5: Update Frontend
Send the payment request to your backend and redirect the user to PayFast:

```javascript
import axios from 'axios';

const initiatePayment = async (paymentData) => {
  try {
    const response = await axios.post('/api/payments/payfast', paymentData);
    window.location.href = response.data.url; // Redirect to PayFast
  } catch (error) {
    console.error(error);
  }
};
```

---

## 2. Xero Accounting Integration

### Step 1: Sign Up and Create Xero App
1. Go to [Xero Developer](https://developer.xero.com/) and create an app.
2. Get your **Client ID** and **Client Secret**.
3. Add a redirect URI (e.g., `http://localhost:5000/api/xero/callback`).

### Step 2: Install Xero Node SDK
Install the Xero Node SDK:

```bash
npm install @xeroapi/xero-node
```

### Step 3: Set Up Authentication
In `routes/xero.js`, set up OAuth2 authentication.

```javascript
const express = require('express');
const { XeroClient } = require('xero-node');
const router = express.Router();

const xero = new XeroClient({
  clientId: process.env.XERO_CLIENT_ID,
  clientSecret: process.env.XERO_CLIENT_SECRET,
  redirectUris: [process.env.XERO_REDIRECT_URI],
  scopes: 'openid profile email accounting.transactions',
});

router.get('/connect', async (req, res) => {
  const consentUrl = await xero.buildConsentUrl();
  res.redirect(consentUrl);
});

router.get('/callback', async (req, res) => {
  const tokenSet = await xero.apiCallback(req.url);
  await xero.updateTenants();
  res.json({ message: 'Connected to Xero', tokenSet });
});

module.exports = router;
```

### Step 4: Create Invoice
Once connected, create invoices in Xero when payments are successful.

```javascript
router.post('/create-invoice', async (req, res) => {
  const { amount, description, email } = req.body;

  try {
    const invoice = {
      Type: 'ACCREC',
      Contact: {
        EmailAddress: email,
      },
      LineItems: [
        {
          Description: description,
          Quantity: 1,
          UnitAmount: amount,
        },
      ],
      Date: new Date().toISOString(),
      DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      Status: 'AUTHORISED',
    };

    const result = await xero.accountingApi.createInvoices(xero.tenants[0].tenantId, { Invoices: [invoice] });
    res.json({ message: 'Invoice created', result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});
```

---

## 3. Environment Variables
Create a `.env` file and add:

```plaintext
PAYFAST_MERCHANT_ID=your_payfast_merchant_id
PAYFAST_MERCHANT_KEY=your_payfast_merchant_key
PAYFAST_RETURN_URL=https://yourdomain.com/return
PAYFAST_CANCEL_URL=https://yourdomain.com/cancel
PAYFAST_NOTIFY_URL=https://yourdomain.com/notify

XERO_CLIENT_ID=your_xero_client_id
XERO_CLIENT_SECRET=your_xero_client_secret
XERO_REDIRECT_URI=http://localhost:5000/api/xero/callback
```

---

## 4. Update Database (Optional)

### Payment Schema
Add models for payments and invoices to track in MongoDB.

```javascript
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
  transaction_id: { type: String },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Payment', PaymentSchema);
```

---

## 5. Testing
- Test PayFast in **sandbox mode**.
- Ensure Xero connection tokens are refreshed automatically (Xero SDK handles this).
- Log payment statuses and troubleshoot with Postman or Insomnia.
