/**
 * Standalone Meta Lead Ads Webhook Receiver
 *
 * This standalone script can be deployed as an independent microservice
 * or serverless function (AWS Lambda, Cloudflare Worker, Vercel, Render)
 * to receive Meta Lead Ads webhooks and forward parsed leads to Nova CRM.
 *
 * NOTE: Nova CRM also includes this functionality BUILT-IN at:
 * https://crm.nrinnovium.online/api/webhooks/meta
 */

const http = require('http');

// Environment Configuration
const PORT = process.env.PORT || 4000;
const CRM_API_URL = process.env.CRM_API_URL || 'https://crm.nrinnovium.online/api/leads';
const CRM_API_KEY = process.env.CRM_API_KEY || '8da95b6b8ae504851cfe59f5ed9fc093ac67626f4527072e7efe8fd4b84d0f1a';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'f5ae5913ebde6130bd3dc9602b7e219553de847683e73e61';
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';

// Known form mappings
const FORM_MAPPINGS = {
  '1693236231771414': {
    company: 'Komu Infra',
    project: 'Shades of Green',
    source: 'Meta Ads - Shades of Green',
  },
};

/**
 * Fetch lead details from Meta Graph API
 */
async function fetchMetaLead(leadgenId, pageAccessToken) {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}?access_token=${encodeURIComponent(pageAccessToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta Graph API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Parse field_data array returned by Meta
 */
function parseFieldData(fieldData = []) {
  let name = '';
  let firstName = '';
  let lastName = '';
  let phone = '';
  let email = '';
  const customQuestions = [];

  for (const item of fieldData) {
    const key = (item.name || '').toLowerCase().trim();
    const val = (item.values?.[0] || '').trim();
    if (!val) continue;

    if (['full_name', 'name', 'your_name'].includes(key)) {
      name = val;
    } else if (['first_name', 'given_name'].includes(key)) {
      firstName = val;
    } else if (['last_name', 'surname'].includes(key)) {
      lastName = val;
    } else if (['phone_number', 'phone', 'mobile_number', 'contact_number'].includes(key)) {
      phone = val;
    } else if (['email', 'email_address'].includes(key)) {
      email = val;
    } else {
      customQuestions.push(`${item.name.replace(/_/g, ' ')}: ${item.values.join(', ')}`);
    }
  }

  if (!name && (firstName || lastName)) {
    name = [firstName, lastName].filter(Boolean).join(' ');
  }

  return { name, phone, email, questions: customQuestions.join('\n') };
}

/**
 * Send parsed lead to Nova CRM
 */
async function sendToNovaCrm(leadPayload) {
  const res = await fetch(CRM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CRM_API_KEY}`,
    },
    body: JSON.stringify(leadPayload),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Nova CRM API error ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'meta-crm-bridge' }));
    return;
  }

  // Meta Webhook Verification (GET /webhook)
  if (req.method === 'GET' && (parsedUrl.pathname === '/webhook' || parsedUrl.pathname === '/')) {
    const mode = parsedUrl.searchParams.get('hub.mode');
    const token = parsedUrl.searchParams.get('hub.verify_token');
    const challenge = parsedUrl.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('[Meta Bridge] Webhook verification challenge passed');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
      return;
    }

    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: Invalid verify token');
    return;
  }

  // Meta Webhook Event Receiver (POST /webhook)
  if (req.method === 'POST' && (parsedUrl.pathname === '/webhook' || parsedUrl.pathname === '/')) {
    let rawBody = '';
    req.on('data', (chunk) => { rawBody += chunk; });
    req.on('end', async () => {
      // Immediately acknowledge receipt
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('EVENT_RECEIVED');

      try {
        const payload = JSON.parse(rawBody || '{}');
        if (payload.object !== 'page' || !Array.isArray(payload.entry)) return;

        for (const entry of payload.entry) {
          if (!Array.isArray(entry.changes)) continue;

          for (const change of entry.changes) {
            if (change.field !== 'leadgen' || !change.value?.leadgen_id) continue;

            const { leadgen_id, form_id, created_time, page_id } = change.value;
            console.log(`[Meta Bridge] New lead received: ${leadgen_id} on form ${form_id}`);

            if (!META_PAGE_ACCESS_TOKEN) {
              console.error('[Meta Bridge] Error: META_PAGE_ACCESS_TOKEN is missing!');
              continue;
            }

            const metaDetails = await fetchMetaLead(leadgen_id, META_PAGE_ACCESS_TOKEN);
            const parsed = parseFieldData(metaDetails.field_data);

            const mapping = FORM_MAPPINGS[form_id] || {
              company: 'Komu Infra',
              project: 'Shades of Green',
              source: `Meta Ads (Form: ${form_id || 'Instant Form'})`,
            };

            const notes = [
              `Source: ${mapping.source}`,
              `Form ID: ${form_id || 'N/A'}`,
              `Meta Lead ID: ${leadgen_id}`,
              `Page ID: ${page_id || 'N/A'}`,
              parsed.questions ? `\nResponses:\n${parsed.questions}` : '',
            ].filter(Boolean).join('\n');

            const crmPayload = {
              name: parsed.name,
              phone: parsed.phone,
              email: parsed.email,
              company: mapping.company,
              project: mapping.project,
              source: mapping.source,
              remarks: notes,
              created_at: created_time ? new Date(created_time * 1000).toISOString() : new Date().toISOString(),
            };

            const result = await sendToNovaCrm(crmPayload);
            console.log('[Meta Bridge] Lead pushed to Nova CRM:', result);
          }
        }
      } catch (err) {
        console.error('[Meta Bridge] Error handling webhook payload:', err);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Meta Webhook Bridge running on port ${PORT}`);
  });
}

module.exports = { server, sendToNovaCrm, fetchMetaLead, parseFieldData };
