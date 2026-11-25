import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const submission = JSON.parse(await readFile(path.join(root, 'docs/submission.json'), 'utf8'));
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
function link(label, url) {
  if (!url)
    return `<tr><td>${escape(label)}</td><td class="pending">Pending — requires account access or recording</td></tr>`;
  if (!/^https:\/\//.test(url)) throw new Error(`${label} must be an HTTPS URL.`);
  return `<tr><td>${escape(label)}</td><td><a href="${escape(url)}">${escape(url)}</a></td></tr>`;
}
const screenshots = [
  ['dashboard.png', 'Dashboard', 'Database-backed counts and upcoming appointments.'],
  [
    'doctors.png',
    'Doctor management',
    'Searchable care team, active status, contacts, and availability.',
  ],
  [
    'appointments.png',
    'Appointment management',
    'Patient visits with doctor, date, status, and filters.',
  ],
  [
    'conflict.png',
    'Useful scheduling errors',
    'Overlapping appointments are rejected without clearing the form.',
  ],
  [
    'mobile-dashboard.png',
    'Responsive workspace',
    'Mobile navigation, cards, and contained table scrolling.',
  ],
  ['empty-state.png', 'Empty states', 'Clear guidance when a search has no matching records.'],
  [
    'error-state.png',
    'Recoverable errors',
    'API failures explain the problem and provide a retry action.',
  ],
];
const figures = [];
for (const [file, title, description] of screenshots) {
  const bytes = await readFile(path.join(root, 'docs/screenshots', file));
  figures.push(
    `<section class="screenshot-page"><h2>${title}</h2><p>${description}</p><img class="${file.startsWith('mobile') || file.includes('state') ? 'mobile' : ''}" src="data:image/png;base64,${bytes.toString('base64')}" alt="${escape(title)} screenshot" /></section>`,
  );
}
const date = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeZone: 'Asia/Karachi',
}).format(new Date());
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pearl Dental — Project Document</title><style>
@page{size:A4;margin:17mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#243b44;font-size:11px;line-height:1.65;margin:0}h1{font-size:40px;line-height:1.12;letter-spacing:-1.7px;margin:30px 0 14px}h2{font-size:20px;color:#087f72;letter-spacing:-.5px;margin:0 0 12px}h3{font-size:13px;margin:22px 0 8px}p{margin:8px 0}a{color:#087f72;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;margin:15px 0}td,th{border:1px solid #dce8e3;text-align:left;padding:8px;vertical-align:top}th{background:#edf6f2}.eyebrow{letter-spacing:2px;color:#087f72;font-size:10px;font-weight:bold}.lede{font-size:16px;color:#647e79;max-width:520px}.box{border-left:4px solid #087f72;padding:14px 18px;background:#eff7f4;margin:25px 0}.pending{color:#a76c24}section{break-before:page}section.cover{break-before:auto}pre{white-space:pre-wrap;background:#f3f6f7;border-radius:8px;padding:15px;font-size:10px;line-height:1.8}code{font-size:10px}ul,ol{padding-left:19px}li{margin:6px 0}.screenshot-page img{width:100%;max-height:210mm;object-fit:contain;object-position:top;border:1px solid #e1eae6;border-radius:8px;margin-top:14px}.screenshot-page img.mobile{display:block;width:auto;max-width:100%;height:205mm;margin:20px auto 0}.small{font-size:10px;color:#78918a}.architecture{font-size:13px;line-height:2.2;text-align:center;padding:35px 20px;background:#eff7f4;border:1px solid #d7e9e2;border-radius:10px}.architecture strong{color:#087f72}
</style></head><body>
<section class="cover"><p class="eyebrow">FULL-STACK ASSESSMENT · ${escape(date)}</p><h1>Pearl Dental<br>Clinic Management</h1><p class="lede">One organized workspace for doctors, appointments, and a calmer clinic day.</p><div class="box"><strong>Implementation:</strong> React + Vite · Express REST API · PostgreSQL<br><strong>Repository:</strong> Separate frontend and backend applications in one repository, on develop. No GitHub Actions.<br><strong>Data:</strong> Synthetic demonstration records only.</div><h2>Submission links</h2><table><thead><tr><th>Deliverable</th><th>Public URL / status</th></tr></thead><tbody>${link('GitHub repository', submission.github)}${link('Render frontend', submission.frontend)}${link('API health check', submission.health)}${link('Loom video walkthrough', submission.loom)}${link('Google Drive submission', submission.drive)}</tbody></table><p class="small">Pending links are not claims of completed external delivery. Add the real URLs to docs/submission.json and regenerate this document before submission. The Loom URL will be clickable in both HTML and PDF.</p><h3>Implemented capabilities</h3><p>Staff sign-in and protected navigation; dashboard summaries; doctor and appointment create/read/update/delete; availability; search and filters; status changes; loading, empty, success, and error states; delete confirmation; persistent storage; responsive screens and accessible forms.</p></section>
<section><h2>Architecture and project structure</h2><div class="architecture"><strong>React / Vite / React Router</strong><br>Shared components · Auth context · API service<br>↓ HTTPS JSON + Bearer token ↓<br><strong>Express API</strong><br>Routes · Joi validation · Services · Central error handling<br>↓ Parameterized SQL + Transactions ↓<br><strong>PostgreSQL</strong><br>Staff · Doctors · Appointments</div><h3>Separation of responsibilities</h3><p>The frontend owns presentation, routing, form feedback, and local filtering. The backend owns authentication, validation, scheduling rules, database access, and consistent responses. PostgreSQL owns persistence, foreign keys, and transaction locking. Mock records are database seeds; they never replace real CRUD calls.</p><pre>frontend/  src/pages, src/components, auth, api, hooks, styles
backend/   src/routes in app.js, services, validation, auth, db
           db/SQL migration and seed; test/API integration tests
tests/     Playwright user workflows
docs/      Screenshots, submission links, PDF, Loom checklist
render.yaml  Separate Render services + managed PostgreSQL</pre><h3>Authentication and errors</h3><p>The seeded staff password is bcrypt-hashed. Eight-hour JWTs protect clinic routes and are kept in browser session storage. Logout clears the token; expired sessions return to login. Login attempts are rate limited. Validation errors include field messages; unexpected server errors use a generic response and server-side logging.</p><h3>Concurrency decision</h3><p>Appointment writes lock the selected doctor row inside a database transaction, then check for overlapping non-cancelled visits. Concurrent requests for the same doctor wait and recheck after the first commit. Adjacent visits remain valid. Foreign keys prevent orphan appointments.</p></section>
<section><h2>Database model and API</h2><table><tr><th>Table</th><th>Fields / relationship</th></tr><tr><td>staff</td><td>id, unique email, password_hash</td></tr><tr><td>doctors</td><td>id, name, specialization, phone, email, availability JSONB, active, created_at</td></tr><tr><td>appointments</td><td>id, patient_name, patient_contact, doctor_id → doctors.id, starts_at, ends_at, reason, status, created_at</td></tr></table><p><strong>Relationship:</strong> One doctor has many appointments. Doctor deletion is restricted while referenced; staff can deactivate the doctor. Availability has ISO weekday keys and local start/end intervals. PostgreSQL timestamps represent UTC instants; UI display and date filters use Asia/Karachi by default.</p><table><tr><th>Method</th><th>Route</th><th>Purpose</th></tr><tr><td>GET</td><td>/api/health</td><td>Public database readiness</td></tr><tr><td>POST / GET</td><td>/api/auth/login · /api/auth/me</td><td>Login / session check</td></tr><tr><td>GET</td><td>/api/dashboard</td><td>Counts and upcoming visits</td></tr><tr><td>GET / POST</td><td>/api/doctors</td><td>List/search / create</td></tr><tr><td>GET / PATCH / DELETE</td><td>/api/doctors/:id</td><td>Detail / edit / delete</td></tr><tr><td>GET / POST</td><td>/api/appointments</td><td>List/filter / create</td></tr><tr><td>GET / PATCH / DELETE</td><td>/api/appointments/:id</td><td>Detail / edit / delete</td></tr></table><p>Appointment filters: date, doctor_id, status, and patient search. Statuses: pending, confirmed, completed, cancelled. Required fields are validated in both UI and API. Durations default to 30 minutes, must be positive and at most eight hours, and must fit the active doctor's availability when scheduling. Cancelled visits release their slot.</p><pre>Success: { "success": true, "data": ... }
Error:   { "success": false, "message": "...", "fields": { ... } }
HTTP: 200, 201, 400, 401, 404, 409, 429, 500, 503</pre></section>
<section><h2>Local setup and deployment</h2><p>Install Node.js 24, npm, and PostgreSQL 14+. Copy each application's .env.example, configure credentials, and create clinic and clinic_test databases.</p><pre>npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev</pre><p>Frontend: http://localhost:5173. API: http://localhost:4000/api. Sign in with the configured STAFF_EMAIL and STAFF_PASSWORD. Use independent dev commands inside either application when needed.</p><table><tr><th>Backend environment</th><th>Frontend environment</th></tr><tr><td>DATABASE_URL, JWT_SECRET, FRONTEND_URL, STAFF_EMAIL, STAFF_PASSWORD, PORT, CLINIC_TIMEZONE, TEST_DATABASE_URL</td><td>VITE_API_URL (public API URL ending in /api)</td></tr></table><h3>Render</h3><p>Push develop to GitHub, connect a Render Blueprint using render.yaml, and supply environment values. Backend root: backend; build: npm ci; start: npm run start:render; health: /api/health. Frontend root: frontend; build: npm ci &amp;&amp; npm run build; publish: dist; rewrite /* to /index.html. Managed PostgreSQL is connected through DATABASE_URL. Verify assigned origins and redeploy after environment changes. No GitHub Actions are needed.</p><h3>Checks and limitations</h3><pre>npm run lint
npm test
npm run build
npm run test:e2e</pre><p>Backend coverage: authentication, JWT expiry, request validation, doctor/appointment CRUD, joins and filters, inactive doctors, availability boundaries, overlapping and concurrent requests, reference protection, seed preservation, and dashboard counts. Browser coverage: protected navigation, all CRUD actions, persistence after refresh, conflict feedback, confirmation cancellation, mobile layout, keyboard dismissal, error recovery, and expired sessions. Screenshots on the following pages are captured from the running local application.</p><p>One staff role; no password reset, account administration, billing, reminders, pagination, holiday exceptions, or audit log. Existing visits are not moved when availability changes. Public deployment checks, the candidate's Loom recording, and Drive sharing remain pending until real account URLs are recorded. Free Render services have cold starts; free PostgreSQL expires after 30 days. See <a href="https://render.com/docs/free">Render resource limitations</a>.</p></section>
${figures.join('')}
</body></html>`;
const htmlPath = path.join(root, 'docs/project-document.html');
await writeFile(htmlPath, html);
const browser = await chromium.launch(
  process.platform === 'darwin'
    ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }
    : {},
);
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.pdf({
    path: path.join(root, 'docs/project-document.pdf'),
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="font-size:8px;color:#7c928b;width:100%;padding:0 17mm;display:flex;justify-content:space-between"><span>Pearl Dental · Assessment project</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    margin: { top: '17mm', right: '17mm', bottom: '19mm', left: '17mm' },
  });
  console.log('Created docs/project-document.html and docs/project-document.pdf');
  const pending = Object.entries(submission)
    .filter(([, url]) => !url)
    .map(([key]) => key);
  if (pending.length) console.log(`Submission links still pending: ${pending.join(', ')}`);
} finally {
  await browser.close();
}
