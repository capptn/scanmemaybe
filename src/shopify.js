
const fetch = require('node-fetch');
const crypto = require('crypto');
const { db } = require('./firebase');

const API_VERSION = '2024-10';

function installUrl(shop) {
  const scopes = (process.env.SHOPIFY_SCOPES || '').split(',').map(s=>s.trim()).join(',');
  const redirect = encodeURIComponent(`${process.env.SHOPIFY_APP_URL}/auth/callback`);
  const apiKey = process.env.SHOPIFY_API_KEY;
  return `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirect}`;
}

async function exchangeToken(shop, code) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${res.statusText} ${JSON.stringify(json)}`);
  await db().collection('shops').doc(shop).set({
    accessToken: json.access_token,
    scopes: json.scope,
    installedAt: new Date().toISOString()
  }, { merge: true });
  return json.access_token;
}

async function getToken(shop) {
  const doc = await db().collection('shops').doc(shop).get();
  return doc.exists ? doc.data().accessToken : null;
}

async function registerWebhook(shop, topic, address) {
  const token = await getToken(shop);
  if (!token) throw new Error('No token stored for shop ' + shop);
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ webhook: { topic, address, format: 'json' } })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Webhook register failed: ${res.status} ${res.statusText} ${JSON.stringify(json)}`);
  return json.result || json;
}

function verifyShopifyWebhook(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;
  if (!secret) throw new Error('SHOPIFY_WEBHOOK_SECRET missing');
  const digest = require('crypto').createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  const received = Buffer.from(hmacHeader || '', 'utf8');
  const calculated = Buffer.from(digest, 'utf8');
  if (received.length !== calculated.length) return false;
  try { return crypto.timingSafeEqual(received, calculated); } catch { return false; }
}

module.exports = { installUrl, exchangeToken, getToken, registerWebhook, verifyShopifyWebhook };
