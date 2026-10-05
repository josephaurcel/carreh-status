# Carreh status

The public status page for Carreh, Flight Board and carreh.com: https://status.carreh.com

- `index.html` is the page (GitHub Pages, separate from Carreh's own hosting, so it stays up when Carreh's servers do not).
- `.github/workflows/check.yml` checks every service every 5 minutes from GitHub's servers and writes the results to the `status-data` branch.
- `scripts/check.mjs` only reads public pages, Carreh's health probe and one public summary. It never reads customer data.
- Alerts: when a service changes state, an email goes to the founder and support (secret `RESEND_API_KEY`). Without that secret, a new outage fails the run so GitHub emails the owner.
