
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const { initFirebase } = require('./firebase');
const { installUrl, exchangeToken, registerWebhook, verifyShopifyWebhook } = require('./shopify');
const { processOrder } = require('./qrcodeHandler');

initFirebase();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cookieSession({
  name: 'shopify_oauth',
  secret: process.env.SHOPIFY_API_SECRET || 'replace_me',
  maxAge: 10 * 60 * 1000,
}));

app.get('/health', (_req,res)=> res.json({ ok: true, uptime: process.uptime() }));

// 1) Kick off OAuth: /auth?shop=<your-shop>.myshopify.com
app.get('/auth', (req, res) => {
  const shop = (req.query.shop || '').toString();
  if (!shop.endsWith('.myshopify.com')) return res.status(400).send('Invalid shop');
  const url = installUrl(shop);
  res.redirect(url);
});

// 2) OAuth callback
app.get('/auth/callback', async (req, res) => {
  try {
    const { shop, code } = req.query;
    if (!shop || !code) return res.status(400).send('Missing shop or code');
    await exchangeToken(shop.toString(), code.toString());

    // Register webhook orders/create
    const address = `${process.env.SHOPIFY_APP_URL}/webhooks/orders-create`;
    await registerWebhook(shop.toString(), 'orders/create', address);

    res.send('✅ App installiert & Webhook registriert. Du kannst dieses Fenster schließen.');
  } catch (e) {
    console.error('OAuth callback error:', e);
    res.status(500).send('OAuth error: ' + e.message);
  }
});

// 3) Webhook endpoint (raw body for HMAC)
app.post('/webhooks/orders-create', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    if (!verifyShopifyWebhook(req.body, hmac)) {
      return res.status(401).json({ ok: false, error: 'HMAC verification failed' });
    }
    const order = JSON.parse(req.body.toString('utf8'));
    const results = await processOrder(order);
    return res.status(200).json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// 4) Manual test (no Shopify)
app.use(express.json());
app.post('/test/generate', async (req, res) => {
  try {
    const fakeOrder = {
      id: 'manual-' + Date.now(),
      name: 'manual',
      line_items: [{ id: 'test', product_id: parseInt(process.env.SHOPIFY_PRODUCT_ID || '0', 10) || 0, variant_id: 0, quantity: 1 }],
      email: 'test@example.com'
    };
    const results = await processOrder(fakeOrder);
    res.json({ ok: true, results });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => console.log(`✅ Shopify QR App (2026-ready) listening on :${PORT}`));
