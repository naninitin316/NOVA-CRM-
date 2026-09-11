import 'dotenv/config';
import { metaLeadService } from '../services/meta-lead.service';

async function run() {
  const formId = process.env.META_FORM_ID || '1693236231771414';
  const token = process.env.META_PAGE_ACCESS_TOKEN;

  console.log('========================================');
  console.log('   Syncing Meta Leads to Nova CRM');
  console.log('========================================');
  console.log(`Form ID: ${formId}`);

  if (!token) {
    console.error('\nERROR: META_PAGE_ACCESS_TOKEN is not set in backend/.env.');
    console.error('Please add your Meta Page Access Token or System User Token to backend/.env:');
    console.error('META_PAGE_ACCESS_TOKEN="your_token_here"\n');
    process.exit(1);
  }

  try {
    console.log('Fetching existing leads from Meta Graph API...');
    const leads = await metaLeadService.syncFormLeads(formId, token);
    console.log(`\nSUCCESS! Synced ${leads.length} lead(s) into Komu Infra > Online Leads.`);
    for (const lead of leads) {
      console.log(` - [${lead.id}] ${lead.customerName || 'N/A'} | ${lead.customerPhone || 'N/A'} | ${lead.customerEmail || 'N/A'}`);
    }
  } catch (error: any) {
    console.error('\nFailed to sync leads from Meta:', error.message || error);
    process.exit(1);
  }
}

void run();
