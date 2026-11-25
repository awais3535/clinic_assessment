# Pearl Dental — Clinic Management

A responsive staff workspace for managing doctors and patient appointments. React/Vite and Express run separately in **one repository**, backed by PostgreSQL. All clinic data comes from the API and persists in PostgreSQL. Development and final commits belong on `develop`. No GitHub Actions are used.

## Quick start

Requirements: Node.js **24**, npm, and PostgreSQL **14+**. Start PostgreSQL before continuing.

```sh
git switch develop
npm ci
npm ci --prefix backend
npm ci --prefix frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
createdb clinic
createdb clinic_test
```

Edit `backend/.env` with your local PostgreSQL connection URL, a random JWT secret of at least 32 characters, and your chosen staff email/password (at least 10 characters). Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Set `TEST_DATABASE_URL` to the separate `clinic_test` database.

```sh
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev
```

Open **http://localhost:5173** and sign in with the `STAFF_EMAIL` and `STAFF_PASSWORD` you configured. API health: **http://localhost:4000/api/health**. Use `localhost` consistently because CORS permits the exact configured frontend origin.

The optional root development command starts both processes. They also work independently:

```sh
npm run dev --prefix backend
npm run dev --prefix frontend
```

The seed creates four doctors and nine appointments around the day it first runs. Subsequent seeds preserve edits and deletions. Changing the staff password environment variable does not overwrite the existing account; change its hash deliberately in the database, or recreate your disposable local database. Never recreate a deployed database to reset a password.

## Layout and architecture

```text
frontend/     React Router pages, shared components, auth context, API service
backend/      Express routes, services, validation, authentication, SQL database
docs/         Screenshots, submission links, project PDF, Loom checklist
tests/        Browser workflows against the real API and database
render.yaml   Render static site + Express service + PostgreSQL blueprint
```

Frontend pages call a single fetch-based service. Express validates requests, applies scheduling rules, and runs parameterized SQL through a pooled PostgreSQL connection. SQL migrations are versioned. Doctor-row locks serialize appointment overlap checks so two simultaneous bookings cannot reserve the same doctor/time.

Reusable UI includes layout/navigation, buttons, fields, dialogs, feedback, badges, availability controls, and the appointment table. React escapes rendered values. Native dialogs provide focus containment, keyboard dismissal, and focus restoration. Tables scroll within their container on small screens.

The original MongoDB/payment boilerplate is excluded from this application and ignored by Git; it remains locally for reference. There are no payment, upload, or email-service dependencies in the implemented application.

## Environment variables

| Application   | Variable                         | Purpose                                                   |
| ------------- | -------------------------------- | --------------------------------------------------------- |
| Backend       | `PORT`                           | API port; default 4000; Render supplies its port          |
| Backend       | `DATABASE_URL`                   | PostgreSQL connection string                              |
| Backend       | `JWT_SECRET`                     | Random signing secret, minimum 32 characters              |
| Backend       | `FRONTEND_URL`                   | Exact frontend origin, without trailing slash             |
| Backend       | `STAFF_EMAIL` / `STAFF_PASSWORD` | Initial seeded staff credentials                          |
| Backend       | `CLINIC_TIMEZONE`                | IANA clinic timezone; default `Asia/Karachi`              |
| Backend/tests | `TEST_DATABASE_URL`              | Separate disposable PostgreSQL database ending in `_test` |
| Frontend      | `VITE_API_URL`                   | API base URL including `/api`; public build-time value    |

Only `.env.example` files are committed. `VITE_*` variables are public and must never contain secrets. Configure production credentials in Render, never in the source or PDF.

## Data model and scheduling rules

- `staff`: ID, unique email, bcrypt password hash.
- `doctors`: ID, name, specialization, phone/email (at least one required), active status, weekly availability JSON, creation timestamp.
- `appointments`: ID, patient name/contact, doctor foreign key, start/end timestamps, reason, status, creation timestamp.
- Internal `schema_migrations` and `seed_runs` tables record applied setup steps.

Availability uses ISO weekday keys `1` (Monday) to `7` (Sunday), each containing zero to four `{ "start": "09:00", "end": "17:00" }` intervals in clinic local time. An empty array means unavailable. Intervals cannot overlap or cross midnight.

Timestamps include an explicit offset or `Z` and are stored as PostgreSQL `TIMESTAMPTZ`. The UI converts clinic time to UTC on submission and back on display. Appointment durations default to 30 minutes and must be positive and at most eight hours. Non-cancelled appointments cannot overlap; adjacent appointments are allowed. New/rescheduled visits must be within an active doctor's availability. Existing history remains editable when a doctor is later deactivated or their schedule changes. Cancelled appointments do not occupy a slot; reactivation checks availability and conflicts again. Historical dates are allowed for demonstration and record corrections.

Doctors referenced by any appointment cannot be deleted; deactivate them instead. Appointment deletion is permanent and requires UI confirmation. No real patient data should be entered in the public assessment demo.

## API reference

Responses: `{ "success": true, "data": ... }`; errors: `{ "success": false, "message": "...", "fields": { ... } }`. Field errors are returned when relevant. IDs are integers. `PATCH` accepts supported changed fields; the merged record is validated. IDs, joined labels, and timestamps generated by the server cannot be overwritten.

| Method           | Route                                                                       | Behavior                                                   |
| ---------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| GET              | `/api/health`                                                               | Public readiness check, including database connectivity    |
| POST             | `/api/auth/login`                                                           | Email/password; returns token, user, and clinic timezone   |
| GET              | `/api/auth/me`                                                              | Current user and timezone                                  |
| GET              | `/api/dashboard`                                                            | Doctor count, future/today/pending counts, next six visits |
| GET              | `/api/doctors?search=Sarah`                                                 | List/search doctors                                        |
| POST             | `/api/doctors`                                                              | Create doctor                                              |
| GET/PATCH/DELETE | `/api/doctors/:id`                                                          | Read, edit, or delete doctor                               |
| GET              | `/api/appointments?date=2026-12-01&doctor_id=1&status=pending&search=Amina` | List/filter appointments; date uses clinic timezone        |
| POST             | `/api/appointments`                                                         | Create appointment                                         |
| GET/PATCH/DELETE | `/api/appointments/:id`                                                     | Read, edit, or delete appointment                          |

Clinic routes require `Authorization: Bearer <token>`. Login tokens expire after eight hours; the frontend clears authentication on a 401. Tokens stay in session storage and logout clears them. Login is rate limited to 20 requests per 15 minutes per IP. There is no registration or password reset in this assessment.

Status codes: 200 successful read/update/delete, 201 created, 400 invalid request, 401 invalid/expired authentication, 404 unknown record/route, 409 scheduling or reference conflict, 429 login rate limit, 500 unexpected error, and 503 unhealthy database.

```sh
curl http://localhost:4000/api/health
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_STAFF_EMAIL","password":"YOUR_STAFF_PASSWORD"}'

# Set TOKEN to the token from the login response.
curl http://localhost:4000/api/doctors -H "Authorization: Bearer $TOKEN"
curl -X POST http://localhost:4000/api/doctors \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Dr. Demo","specialization":"General Dentistry","phone":"03001234567","email":"","active":true,"availability":{"1":[{"start":"09:00","end":"17:00"}]}}'

# Replace doctor_id with an active doctor available at the chosen time.
curl -X POST http://localhost:4000/api/appointments \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"patient_name":"Demo Patient","patient_contact":"03001234567","doctor_id":1,"starts_at":"2026-12-01T05:00:00Z","ends_at":"2026-12-01T05:30:00Z","reason":"Routine checkup","status":"pending"}'
curl -X PATCH http://localhost:4000/api/appointments/1 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"status":"confirmed"}'
curl -X DELETE http://localhost:4000/api/appointments/1 -H "Authorization: Bearer $TOKEN"
```

## Verification

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

Backend integration tests **clear clinic tables in `TEST_DATABASE_URL`**. They refuse a URL equal to `DATABASE_URL` or a database name not ending in `_test`. Use a disposable database. Tests cover login/session expiry, validation, CRUD, joins/filters, schedule boundaries, inactive doctors, concurrent conflicts, delete protection, dashboard data, and seed preservation.

Browser tests start both development servers when needed and operate on the main **synthetic demo database** using `STAFF_EMAIL`/`STAFF_PASSWORD` from `backend/.env`. They create uniquely named records and delete them on success. On macOS they use installed Google Chrome; elsewhere run `npx playwright install chromium` first. Screenshots are saved in `docs/screenshots/`; failure traces remain in ignored `test-results/`. Do not point browser tests at a real clinic database.

## Render deployment

1. Push this repository's `develop` branch to your public GitHub repository. In Render, choose **New → Blueprint** and select that repository/branch. The root `render.yaml` creates a static frontend, Node API, and managed PostgreSQL database. No GitHub Actions are needed.
2. Supply `STAFF_EMAIL`, a unique `STAFF_PASSWORD`, `FRONTEND_URL`, and `VITE_API_URL` when prompted. The two URLs must use the actual service hostnames assigned by Render: frontend origin for `FRONTEND_URL`, API origin plus `/api` for `VITE_API_URL`. If hostnames are not known until creation, update these settings afterward and redeploy both applications. The JWT secret and database connection are provided by the blueprint.
3. Backend root is `backend`, build is `npm ci`, start is `npm run start:render`, and health path is `/api/health`. Startup applies migrations and safe initial seed data before starting Express. Frontend root is `frontend`, build is `npm ci && npm run build`, publish directory is `dist`. The blueprint rewrites all frontend routes to `/index.html`.
4. Wait for healthy deployment. Open `/api/health`, sign in to the public frontend, and perform doctor and appointment CRUD. Reload after edits, open `/doctors` directly in a fresh tab, and check mobile layout. Confirm credentials and tokens are absent from repository files and screenshots.
5. Record the actual URLs and Loom link in `docs/submission.json`, then run `npm run docs:pdf` to refresh the submission document.

The same settings can be entered manually as a PostgreSQL database, Node web service, and static site. Use the database's internal connection URL when the API is deployed in the same Render region.

Free Render web services sleep after inactivity; the first request can take about a minute. Free PostgreSQL expires after 30 days. Ensure the assessment is reviewed before expiry or arrange a longer-lived database. See [Render free resources](https://render.com/docs/free), [Blueprint reference](https://render.com/docs/blueprint-spec), and [Express deployment](https://render.com/docs/deploy-node-express-app).

## Submission materials and limitations

Run `npm run docs:pdf` to generate `docs/project-document.html` and `docs/project-document.pdf` using Chrome/Playwright. Actual screenshots, architecture, database model, routes, testing notes, limitations, and submission links are included. Missing public URLs are explicitly marked pending rather than invented. Add the real Loom URL to `docs/submission.json` before regenerating the final PDF so it contains a clickable video link.

Follow `docs/WALKTHROUGH.md` for the recording and Google Drive submission checklist. The recording must be made by the candidate, who should be able to explain the implementation. Public deployment, the final Loom link, and publicly shared Drive files require the corresponding accounts and must be verified before submission.

Assessment limits: one staff role; no account management, reminders, billing, patient record system, pagination, recurring bookings, holiday overrides, or audit log. Availability edits affect future booking validation but do not move existing visits. Session storage tokens are appropriate for this short-lived demo; production needs a fuller session/revocation design. External Google Fonts are optional; the UI falls back to local sans-serif fonts if unavailable.
