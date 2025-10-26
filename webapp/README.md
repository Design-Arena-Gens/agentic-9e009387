## Agentic Risk Monitor

Autonomous news intelligence console focused on the automotive industry. The agent ingests configurable sources, scores geopolitical and macro risks, stores output to Google Sheets, and dispatches alerts over email and WhatsApp.

### Quick start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the admin console, adjust sources/keywords, and trigger manual scans.

### Environment variables

Create a `.env.local` file with any credentials you want to enable:

```bash
NEWS_API_KEY=your_newsapi_key
OPENAI_API_KEY=optional_openai_key

GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_ID=spreadsheet_id

SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
SMTP_FROM="Risk Desk <risk@example.com>"

TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=twilio_auth
TWILIO_WHATSAPP_FROM=+14155238886

# Optional public defaults pushed to the client (comma separated)
NEXT_PUBLIC_DEFAULT_SOURCES=https://www.reuters.com,https://www.bloomberg.com
NEXT_PUBLIC_DEFAULT_KEYWORDS=geopolitical,economic downturn
NEXT_PUBLIC_ALERT_EMAILS=risk@example.com
NEXT_PUBLIC_ALERT_WHATSAPP=+15551234567
```

All credentials are optional—the UI and data pipeline fall back to sample data and skip notifications when variables are missing.

### Scheduled dispatches

Use Vercel cron (or any scheduler) to invoke `POST /api/scan` with `triggerMode` set to `daily` or `weekly`. Realtime alerts automatically route whenever severity rises above medium and WhatsApp/email notifications are enabled.

### Google Sheets backup

Create a sheet with a tab named `Reports` before running in production. Each scan appends the high-level summary plus the full JSON payload, enabling BI tooling or Looker Studio dashboards.

### WhatsApp & email alerts

WhatsApp delivery uses Twilio's sandbox or production number. Email delivery uses SMTP (Nodemailer). Add recipient lists directly in the admin console.

### Manual scans

The admin surface offers one-click manual, realtime, daily, and weekly dispatches. Results hydrate the dashboard immediately and persist to Google Sheets.
