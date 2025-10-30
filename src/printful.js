
const fetch = require('node-fetch');
const FormData = require('form-data');

const API = 'https://api.printful.com';

function authHeader() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error('PRINTFUL_API_KEY missing');
  return { Authorization: `Bearer ${key}` };
}

async function uploadFile(buffer, filename='qr.png') {
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: 'image/png' });
  const res = await fetch(`${API}/files`, { method: 'POST', headers: { ...authHeader() }, body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(`Printful upload failed: ${res.status} ${res.statusText} ${JSON.stringify(json)}`);
  return json.result;
}

async function attachFileToProduct(templateId, fileId, placement) {
  const payload = {
    variant_ids: [],
    files: [{ id: fileId, type: 'front', placement }],
    format: 'png'
  };
  const res = await fetch(`${API}/mockup-generator/create-task/${templateId}`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Printful task failed: ${res.status} ${res.statusText} ${JSON.stringify(json)}`);
  return json.result;
}

module.exports = { uploadFile, attachFileToProduct };
