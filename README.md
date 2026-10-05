# Carreh status

The public status page for Carreh, Flight Board and carreh.com: https://status.carreh.com

- `index.html` is the page (GitHub Pages, separate from Carreh's own hosting, so it stays up when Carreh's servers do not).
- `.github/workflows/check.yml` checks every service every 5 minutes from GitHub's servers and writes the results to the `status-data` branch.
- `scripts/check.mjs` only reads public pages, Carreh's health probe and one public summary. It never reads customer data.
- Alerts: when a service gets worse (down or slow, after two bad checks in a row), the run fails and GitHub emails the repository owner. This was the founder's choice on 6 Oct 2026: free, no daily cap, and independent of Carreh's servers. Recoveries show on the page only. To test: run the workflow by hand with `test_alert` ticked. Optional: a `RESEND_API_KEY` secret would also send a Resend email on every change.
