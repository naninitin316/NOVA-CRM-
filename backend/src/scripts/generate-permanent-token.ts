import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { metaLeadService } from '../services/meta-lead.service';

const APP_ID = process.env.META_APP_ID || '38383600324588081';
const PAGE_ID = process.env.META_PAGE_ID || '1349016364953227';
const FORM_ID = process.env.META_FORM_ID || '1693236231771414';

async function generatePermanentToken(appSecret: string, inputToken: string) {
  console.log('========================================================');
  console.log('   Generating Permanent Never-Expiring Meta Token');
  console.log('========================================================');

  // Step 1: Exchange short-lived token for long-lived user token (60 days)
  console.log('Step 1: Exchanging for long-lived token...');
  const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${appSecret}&fb_exchange_token=${inputToken}`;
  
  const exchangeRes = await fetch(exchangeUrl);
  const exchangeData = (await exchangeRes.json()) as any;

  if (!exchangeRes.ok || exchangeData.error) {
    throw new Error(`Failed to exchange token: ${exchangeData.error?.message || exchangeRes.statusText}`);
  }

  const longLivedUserToken = exchangeData.access_token;
  console.log('✓ Long-lived user token obtained successfully.');

  // Step 2: Fetch Page Access Token using long-lived user token
  // Page tokens generated from long-lived user tokens NEVER expire!
  console.log(`Step 2: Fetching permanent Page token for Page ID ${PAGE_ID}...`);
  const pageTokenUrl = `https://graph.facebook.com/v21.0/${PAGE_ID}?fields=access_token,name&access_token=${longLivedUserToken}`;

  const pageTokenRes = await fetch(pageTokenUrl);
  const pageTokenData = (await pageTokenRes.json()) as any;

  if (!pageTokenRes.ok || pageTokenData.error) {
    throw new Error(`Failed to get page token: ${pageTokenData.error?.message || pageTokenRes.statusText}`);
  }

  const permanentPageToken = pageTokenData.access_token;
  const pageName = pageTokenData.name || 'Shades of Green / Komu Infra';
  console.log(`✓ Permanent Page Access Token obtained for "${pageName}"!`);

  // Step 3: Verify token debug info
  console.log('Step 3: Verifying token expiry with Meta Debug API...');
  const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${permanentPageToken}&access_token=${APP_ID}|${appSecret}`;
  const debugRes = await fetch(debugUrl);
  const debugData = (await debugRes.json()) as any;

  const data = debugData.data;
  console.log('--------------------------------------------------------');
  console.log('Token Type:', data?.type);
  console.log('Target Page:', data?.profile_id);
  console.log('Is Valid:', data?.is_valid);
  console.log('Expires At:', data?.expires_at === 0 ? 'NEVER (Permanent)' : new Date(data?.expires_at * 1000));
  console.log('Scopes Granted:', data?.scopes?.join(', '));
  console.log('--------------------------------------------------------');

  // Step 4: Automatically save to backend/.env
  const envPath = path.resolve(__dirname, '../../.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  if (envContent.includes('META_PAGE_ACCESS_TOKEN=')) {
    envContent = envContent.replace(/META_PAGE_ACCESS_TOKEN=.*/, `META_PAGE_ACCESS_TOKEN="${permanentPageToken}"`);
  } else {
    envContent += `\nMETA_PAGE_ACCESS_TOKEN="${permanentPageToken}"\n`;
  }

  if (envContent.includes('META_APP_SECRET=')) {
    envContent = envContent.replace(/META_APP_SECRET=.*/, `META_APP_SECRET="${appSecret}"`);
  } else {
    envContent += `\nMETA_APP_SECRET="${appSecret}"\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✓ Successfully saved permanent token to backend/.env!');

  // Step 5: Automatically sync all leads now!
  console.log('\nStep 5: Importing all leads into Nova CRM...');
  const synced = await metaLeadService.syncFormLeads(FORM_ID, permanentPageToken);
  console.log(`✓ SUCCESS: ${synced.length} leads imported and assigned to Chandana G!`);
}

const args = process.argv.slice(2);
const appSecret = args[0];
const inputToken = args[1];

if (!appSecret || !inputToken) {
  console.error('Usage: ts-node src/scripts/generate-permanent-token.ts <APP_SECRET> <USER_OR_PAGE_TOKEN>');
  process.exit(1);
}

generatePermanentToken(appSecret, inputToken).catch((err) => {
  console.error('\nError:', err.message || err);
  process.exit(1);
});
