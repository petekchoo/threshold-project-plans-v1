import { expect, test } from '@playwright/test';

const mutationsEnabled = process.env.THRESHOLD_E2E_MUTATIONS === '1';

test('@auth redirects an unauthenticated visitor and preserves an authenticated session', async ({ browser, page }, testInfo) => {
  const anonymous = await browser.newContext({
    baseURL: String(testInfo.project.use.baseURL),
    storageState: { cookies: [], origins: [] },
  });
  const anonymousPage = await anonymous.newPage();
  await anonymousPage.goto('/projects');
  await expect(anonymousPage).toHaveURL(/\/sign-in$/);
  await anonymous.close();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Threshold at a glance' })).toBeVisible();
});

test('@overview exposes the core portfolio interactions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Threshold at a glance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Active projects' })).toBeVisible();
  await page.getByRole('button', { name: 'Quarter' }).click();
  await expect(page.getByRole('button', { name: 'Quarter' })).toHaveAttribute('aria-pressed', 'true');
});

test('@activities @dependencies creates, edits, relates, and archives an activity', async ({ page }) => {
  test.skip(!mutationsEnabled, 'Mutation journeys require a disposable or explicitly resettable fixture backend.');
  const name = `QA activity ${Date.now()}`;
  const editedName = `${name} edited`;

  await page.goto('/activities');
  await expect(page.getByText('DEV Confirm gala brief', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /Add activity/ }).first().click();
  const dialog = page.getByRole('dialog').filter({ has: page.getByLabel('Activity name') });
  await dialog.getByLabel('Activity name').fill(name);
  await dialog.getByLabel('Project').selectOption({ label: 'DEV Gala' });
  await dialog.getByText('Schedule and notes', { exact: true }).click();
  await dialog.getByLabel('Start date').fill(new Date().toISOString().slice(0, 10));
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 1);
  await dialog.getByLabel('Due date').fill(due.toISOString().slice(0, 10));
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Activity saved.');

  await page.getByPlaceholder('Search activities').fill(name);
  await page.getByRole('link', { name: new RegExp(name) }).first().click();
  await page.getByRole('button', { name: 'Edit activity' }).click();
  await page.getByLabel('Activity name').fill(editedName);
  await page.getByText('Schedule and notes', { exact: true }).click();
  await page.getByRole('button', { name: /Add scheduling rule/ }).click();
  const rule = page.getByRole('dialog', { name: 'Schedule rule' });
  await rule.locator('#activity-rule').selectOption('start_after_activity_finish');
  await rule.getByRole('button', { name: 'Activity', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Choose an activity' });
  await picker.getByPlaceholder('Search activity name').fill('DEV Confirm gala brief');
  await picker.getByRole('button', { name: /DEV Confirm gala brief/ }).click();
  await rule.getByRole('button', { name: 'Check rule' }).click();
  const apply = rule.getByRole('button', { name: 'Apply rule and update dates' });
  if (await apply.isVisible()) await apply.click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Activity changes saved.');
  await expect(page.getByRole('heading', { name: editedName })).toBeVisible();

  page.once('dialog', confirmation => confirmation.accept());
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page).toHaveURL(/\/activities$/);
});

test('@administration creates, renames, and archives a reference value', async ({ page }) => {
  test.skip(!mutationsEnabled, 'Mutation journeys require a disposable or explicitly resettable fixture backend.');
  const name = `DEV QA E2E Activity Type ${Date.now()}`;
  const editedName = `${name} edited`;
  await page.goto('/administration');
  const card = page.locator('.admin-card').filter({ has: page.getByRole('heading', { name: 'Activity types' }) });
  await expect(card.getByText('DEV Planning', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: /Add/ }).click();
  await card.getByPlaceholder('Name').fill(name);
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText('Activity type added.');
  const row = card.locator('.admin-row').filter({ hasText: name });
  await row.getByRole('button', { name: 'Edit' }).click();
  const edit = card.locator('.admin-row-edit');
  await edit.locator('input').fill(editedName);
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText('Activity type updated.');
  page.once('dialog', confirmation => confirmation.accept());
  await card.locator('.admin-row').filter({ hasText: editedName }).getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByRole('status')).toContainText(`${editedName} archived.`);
});
