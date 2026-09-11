# Meta Lead Ads Integration for Nova CRM

This integration connects Facebook & Instagram Instant Forms (Lead Ads) for **Komu Infra** directly to **Nova CRM** (`crm.nrinnovium.online`). When someone submits a lead form on Facebook or Instagram, it is immediately captured and displayed in Nova CRM under **Komu Infra > Online Leads**.

---

## 1. Overview of Integration Endpoints

Nova CRM provides two endpoints on your live server:

### A. Meta Webhook Endpoint (Direct Meta-to-CRM)
- **Callback URL**: `https://crm.nrinnovium.online/api/webhooks/meta`
- **Verify Token**: Configured in `backend/.env` (`META_VERIFY_TOKEN`)
- **GET**: Responds to Meta's verification challenge during webhook setup.
- **POST**: Receives incoming `leadgen` events, calls the Meta Graph API to fetch full lead data (name, phone, email, questions), and creates an Online Lead task under Komu Infra.

### B. Leads Intake API (For External Scripts / Webhook Relays)
- **URL**: `POST https://crm.nrinnovium.online/api/leads`
- **Authentication**: `Authorization: Bearer <CRM_LEADS_API_KEY>` or `X-API-Key: <CRM_LEADS_API_KEY>`
- **Body**:
  ```json
  {
    "name": "Arjun Sharma",
    "phone": "+919876543210",
    "email": "arjun@example.com",
    "company": "Komu Infra",
    "project": "Shades of Green",
    "source": "Meta Ads - Shades of Green",
    "created_at": "2026-09-11T13:30:00.000Z",
    "remarks": "Villa Inquiry - 3BHK"
  }
  ```

---

## 2. Meta Setup Step-by-Step (Without App Review)

> **Important**: Because this integration is for your own Page and Business Manager, you **do not** need to submit your Meta App for public App Review. Generating a permanent Page Access Token via a **System User** avoids App Review completely.

### Step 1: Open or Create your Meta App
1. Go to [developers.facebook.com](https://developers.facebook.com/) > **My Apps** > **Create App**.
2. Select **Other** > **Business** (or Business App type).
3. Connect it to your **Komu Infra** Business Account.

### Step 2: Configure the Webhook in Meta App Dashboard
1. In your Meta App Dashboard, go to **Add Product** > find **Webhooks** and click **Set Up**.
2. Select **Page** from the dropdown and click **Subscribe to this object**.
3. Fill in:
   - **Callback URL**: `https://crm.nrinnovium.online/api/webhooks/meta`
   - **Verify Token**: `<META_VERIFY_TOKEN>` (from your `backend/.env`)
4. Click **Verify and Save**. Meta will send a GET challenge to your server, which verifies automatically.
5. In the list of Page fields, locate **`leadgen`** and click **Subscribe**.

### Step 3: Generate Permanent System User Token
1. Go to [Meta Business Settings](https://business.facebook.com/settings).
2. Under **Users** > **System Users**, click **Add**.
3. Name: `Nova CRM Leads Sync`, Role: `Admin`.
4. Click **Assign Assets**:
   - Under **Pages**: Select **Shades Of Green** > enable **Full Control** (or Manage Page / Ads).
   - Under **Accounts**: Assign the Komu Infra ad account if listed.
5. Under **Integrations** > **Leads Access**:
   - Select the **Shades Of Green** Page.
   - Assign the **System User** and **App** so they have permission to access leads.
6. Click **Generate New Token**:
   - Select your App.
   - Token Expiration: **Never**.
   - Check the following permissions:
     - `leads_retrieval`
     - `pages_manage_ads`
     - `pages_read_engagement`
     - `pages_show_list`
7. Copy the token and save it into `backend/.env` as:
   ```env
   META_PAGE_ACCESS_TOKEN="your_permanent_system_user_token"
   ```

### Step 4: Subscribe the Facebook Page to the App
Facebook requires explicitly subscribing the Page to the App for `leadgen` events.

Run the helper script:
```bash
PAGE_ID="<your_page_id>" PAGE_ACCESS_TOKEN="<your_page_token>" ./subscribe-page.sh
```

Or execute via curl:
```bash
curl -X POST "https://graph.facebook.com/v21.0/<PAGE_ID>/subscribed_apps?subscribed_fields=leadgen&access_token=<PAGE_ACCESS_TOKEN>"
```

Expected response: `{"success": true}`.

---

## 3. Testing the Integration

### Method 1: Using Meta's Official Lead Ads Testing Tool
1. Visit the [Meta Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing).
2. Select:
   - **Page**: Shades Of Green
   - **Form**: Untitled form 09/09/2026, 17:22 (`1693236231771414`)
3. Click **Create Lead**.
4. Within 5 seconds, log in to `https://crm.nrinnovium.online` and navigate to **Online Leads**.
5. Switch the company filter to **Komu Infra** — the test lead will appear in the queue with name, phone, and email!

### Method 2: Testing via curl (Direct Leads API)
```bash
curl -X POST https://crm.nrinnovium.online/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_CRM_LEADS_API_KEY>" \
  -d '{
    "name": "Nitin Test",
    "phone": "+919876543210",
    "email": "test@komuinfra.com",
    "company": "Komu Infra",
    "project": "Shades of Green",
    "source": "Meta Ads - Shades of Green"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Lead received and recorded successfully.",
  "data": {
    "id": "...",
    "title": "Online lead: Nitin Test",
    "customerName": "Nitin Test",
    "customerPhone": "+919876543210",
    "customerEmail": "test@komuinfra.com",
    "company": "Komu Infra",
    "projectName": "Shades of Green",
    "status": "ON_HOLD"
  }
}
```
