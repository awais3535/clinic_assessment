# Assessment walkthrough and handoff

Record the video yourself and explain the code in your own words. Use synthetic data only and hide `.env`, passwords, tokens, and account billing pages.

## Recording sequence

1. Show the public frontend URL and sign in with your seeded staff account. Show the dashboard counts and upcoming list.
2. Navigate to Doctors. Search, add a doctor, open details and weekly availability, edit contact/availability, reload, and show persistence. Show delete confirmation and cancel it.
3. Navigate to Appointments. Add a visit using your doctor, open details, edit the reason, change status, filter by date/doctor/status, and reload to show persistence.
4. Attempt another visit for the same doctor/time. Explain the helpful overlap error and retained form values. Try a time outside availability and show validation.
5. Try deleting a doctor who has an appointment. Explain the reference protection and deactivation alternative. Delete your demonstration appointment, then delete your demonstration doctor after confirming both actions.
6. Search for an unknown doctor/patient to show empty states. Use browser developer tools to block an API request, reload to show an error, unblock it, and retry. Resize to a phone viewport and show navigation/forms.
7. Open the live backend `/api/health`. Show that direct frontend route navigation works. Explain the frontend and backend service settings and PostgreSQL connection without exposing secrets.
8. Show the single repository on `develop`, separate frontend/backend folders, API service layer, reusable components, route protection, validation, SQL model, transaction locking, and test results. Explain why SQL parameters prevent injection and why a row lock prevents concurrent double booking.
9. Mention the assessment limits and Render free-tier expiry. Finish with the working public app.

## Final submission checklist

- [ ] Public GitHub repository contains final code on `develop` and readable setup instructions.
- [ ] Render frontend and API URLs are publicly accessible and CRUD survives reload/restart.
- [ ] Record Loom, set its sharing to allow reviewers, and verify it in a signed-out browser.
- [ ] Fill actual GitHub/frontend/health/Loom URLs in `docs/submission.json`.
- [ ] Run `npm run docs:pdf`; inspect the PDF and click its Loom link.
- [ ] Upload the PDF, screenshot folder or ZIP, and supporting document to Google Drive.
- [ ] Set reviewer access to **Anyone with the link → Viewer** and verify while signed out.
- [ ] Add the actual Drive folder/document link to `docs/submission.json` and regenerate/re-upload the PDF if needed.
- [ ] Submit the same Loom URL in the case study form and PDF, together with GitHub, Render, and Drive URLs.
- [ ] Commit the final documents and push `develop`.
