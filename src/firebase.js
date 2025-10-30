
const admin = require('firebase-admin');

let initialized = false;
function initFirebase() {
  if (initialized) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
  let json;
  try { json = JSON.parse(raw); } catch(e){ throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON: '+e.message); }
  admin.initializeApp({ credential: admin.credential.cert(json) });
  initialized = true;
}
function db(){ if(!initialized) initFirebase(); return admin.firestore(); }
module.exports = { initFirebase, db };
