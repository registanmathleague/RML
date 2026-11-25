// API: Cloudflare Worker "rml-api" + D1 database "rml" (from 19.11.2026; before that Google Apps Script)
window.PORTAL_CONFIG = {
  apiUrl: 'https://rml-api.registan.workers.dev',
  // New design (app2.js + v2.css): 'test' = only with ?v2=1 (testers), true = everyone, false = nobody (rollback)
  v2: 'test'
};
