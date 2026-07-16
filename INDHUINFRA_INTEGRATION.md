# Indhu Infra Online Leads

This CRM already exposes a public lead intake endpoint:

`POST /api/online-leads`

The website `https://indhuinfra.com/` uses Contact Form 7. A bridge script is available here:

[`web/public/indhuinfra-online-leads.js`](/Users/nitin/CRM%20Project/web/public/indhuinfra-online-leads.js)

## WordPress setup

Recommended: install the WordPress plugin file:

[`integrations/indhu-crm-online-leads.php`](/Users/nitin/CRM%20Project/integrations/indhu-crm-online-leads.php)

Before activating it, replace this line with your deployed CRM API URL:

```php
const INDHU_CRM_API_URL = 'https://your-crm-api.example.com/api/online-leads';
```

The plugin hooks into Contact Form 7 after the message is sent and forwards the enquiry to CRM. This path does not depend on browser CORS.

Alternative: add this browser script to the website footer.

Add this config before the script:

```html
<script>
  window.indhuCrmLeadConfig = {
    apiBase: "https://your-crm-api.example.com/api",
    company: "INDHU Infra",
    source: "indhuinfra.com Contact Form 7"
  };
</script>
<script src="https://your-crm-web.example.com/indhuinfra-online-leads.js"></script>
```

The script listens for Contact Form 7's `wpcf7mailsent` event and forwards:

- `your-name` -> `name`
- `your-email` -> `email`
- `Phone` -> `phone`
- `your-message` -> `message`

Leads are created in CRM as `Online Lead` tasks for the company `INDHU Infra`.
