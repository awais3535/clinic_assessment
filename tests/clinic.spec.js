import { test, expect } from '@playwright/test';
import { DateTime } from 'luxon';

const email = process.env.STAFF_EMAIL;
const password = process.env.STAFF_PASSWORD;
if (!email || !password)
  throw new Error(
    'Set STAFF_EMAIL and STAFF_PASSWORD for browser tests. Use synthetic demo data only.',
  );
async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening), team/ }),
  ).toBeVisible();
  await expect(page.getByText('Loading your clinic data…')).toBeHidden();
}
test('protected navigation, complete CRUD, persistence, conflicts, confirmations, and screenshots', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto('/doctors');
  await expect(page).toHaveURL(/login/);
  await page.goto('/login');
  await page.screenshot({ path: 'docs/screenshots/login.png', fullPage: true });
  await login(page);
  await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });
  await page.getByRole('link', { name: 'Doctors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dr. Sarah Ahmed' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/doctors.png', fullPage: true });
  const unique = `Dr. Browser ${Date.now()}`;
  await page.getByRole('button', { name: 'Add doctor', exact: true }).first().click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Full name *', { exact: true }).fill(unique);
  await modal.getByLabel('Specialization *', { exact: true }).fill('General Dentistry');
  await modal.getByLabel('Phone number', { exact: true }).fill('+92 300 111 2222');
  await modal.getByRole('button', { name: 'Add doctor', exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByText('Doctor added to your care team.')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search doctors' }).fill(unique);
  await expect(page.getByRole('heading', { name: unique })).toBeVisible();
  await page.getByRole('button', { name: `Edit ${unique}`, exact: true }).click();
  await modal.getByLabel('Email address', { exact: true }).fill('browser@clinic.demo');
  await modal.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(modal).toBeHidden();
  await page.reload();
  await page.getByRole('searchbox', { name: 'Search doctors' }).fill(unique);
  await expect(page.getByText('browser@clinic.demo', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View details' }).click();
  await expect(modal.getByText('Monday', { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('link', { name: 'Appointments', exact: true }).click();
  await expect(page.getByText('Loading your clinic data…')).toBeHidden();
  await page.screenshot({ path: 'docs/screenshots/appointments.png', fullPage: true });
  let day = DateTime.now().setZone('Asia/Karachi').plus({ days: 14 });
  while (day.weekday > 5) day = day.plus({ days: 1 });
  const patient = `Browser Patient ${Date.now()}`;
  async function fillBooking() {
    await modal.getByLabel('Patient name *', { exact: true }).fill(patient);
    await modal.getByLabel('Patient contact *', { exact: true }).fill('03001234567');
    await modal
      .getByLabel('Doctor *', { exact: true })
      .selectOption({ label: `${unique} · General Dentistry` });
    await modal.getByLabel('Date *', { exact: true }).fill(day.toISODate());
    await modal.getByLabel('Start time *', { exact: true }).fill('10:00');
    await modal.getByLabel('Reason for visit *', { exact: true }).fill('Browser-tested checkup');
  }
  await page.getByRole('button', { name: 'New appointment', exact: true }).first().click();
  await fillBooking();
  await modal.getByRole('button', { name: 'Book appointment', exact: true }).click();
  await expect(modal).toBeHidden();
  await page.getByRole('searchbox', { name: 'Search patients' }).fill(patient);
  await expect(page.getByText(patient, { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('searchbox', { name: 'Search patients' }).fill(patient);
  await expect(page.getByText(patient, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Edit appointment for ${patient}`, exact: true }).click();
  await modal.getByLabel('Status', { exact: true }).selectOption('confirmed');
  await modal.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole('cell', { name: 'confirmed', exact: true })).toBeVisible();
  await page.getByLabel('Date', { exact: true }).fill(day.toISODate());
  await page.getByLabel('Doctor', { exact: true }).selectOption({ label: unique });
  await page.getByLabel('Status', { exact: true }).selectOption('confirmed');
  await expect(page.getByText('1 appointment shown', { exact: true })).toBeVisible();
  await expect(page.getByText(patient, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search patients' }).fill(patient);
  await page.getByRole('button', { name: `View appointment for ${patient}`, exact: true }).click();
  await expect(modal.getByText('Browser-tested checkup', { exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'New appointment', exact: true }).first().click();
  await fillBooking();
  await modal.getByRole('button', { name: 'Book appointment', exact: true }).click();
  await expect(modal.getByRole('alert')).toContainText('already has an appointment');
  await expect(modal.getByLabel('Patient name *', { exact: true })).toHaveValue(patient);
  await page.screenshot({ path: 'docs/screenshots/conflict.png', fullPage: true });
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('button', { name: `Delete appointment for ${patient}`, exact: true })
    .click();
  await modal.getByRole('button', { name: 'Keep record', exact: true }).click();
  await expect(page.getByText(patient, { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: `Delete appointment for ${patient}`, exact: true })
    .click();
  await modal.getByRole('button', { name: 'Delete record', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matching appointments' })).toBeVisible();
  await page.getByRole('link', { name: 'Doctors', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search doctors' }).fill(unique);
  await page.getByRole('button', { name: `Delete ${unique}`, exact: true }).click();
  await modal.getByRole('button', { name: 'Delete record', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matching doctors' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/login/);
  expect(errors).toEqual([]);
});
test('mobile layout, keyboard dialog behavior, empty/error states, and expired sessions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.screenshot({ path: 'docs/screenshots/mobile-dashboard.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'Doctors', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dr. Sarah Ahmed' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/mobile-doctors.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Add doctor', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('searchbox', { name: 'Search doctors' }).fill('no-such-doctor');
  await expect(page.getByRole('heading', { name: 'No matching doctors' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/empty-state.png', fullPage: true });
  await page.route('**/api/doctors', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Test server error. Please try again.' }),
    }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Test server error');
  await page.screenshot({ path: 'docs/screenshots/error-state.png', fullPage: true });
  await page.unroute('**/api/doctors');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dr. Sarah Ahmed' })).toBeVisible();
  await page.getByRole('link', { name: 'Appointments', exact: true }).click();
  await expect(page.getByText('Loading your clinic data…')).toBeHidden();
  await page.screenshot({ path: 'docs/screenshots/mobile-appointments.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => sessionStorage.setItem('clinic_token', 'expired-token'));
  await page.reload();
  await expect(page).toHaveURL(/login/);
  await expect(page.getByRole('alert')).toContainText('expired');
});

test('dashboard and appointment loading, empty, error, and retry states', async ({ page }) => {
  await login(page);
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total_doctors: 0,
          upcoming: 0,
          today: 0,
          pending: 0,
          appointments: [],
          timezone: 'Asia/Karachi',
        },
      }),
    }),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A little breathing room' })).toBeVisible();
  await page.unroute('**/api/dashboard');
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Dashboard unavailable for test.' }),
    }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Dashboard unavailable');
  await page.unroute('**/api/dashboard');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Upcoming appointments', exact: true }),
  ).toBeVisible();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/appointments*', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
  await page.getByRole('link', { name: 'Appointments', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Loading your clinic data');
  release();
  await expect(
    page.getByRole('heading', { name: 'Your schedule is ready for its first visit' }),
  ).toBeVisible();
  await page.unroute('**/api/appointments*');
  await page.route('**/api/appointments*', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Appointments unavailable for test.' }),
    }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Appointments unavailable');
  await page.unroute('**/api/appointments*');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
});
