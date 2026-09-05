import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
});

test('uses route-aware bottom navigation and an accessible More dialog', async ({ page }) => {
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.sidebar')).toBeHidden();

  const more = navigation.getByRole('button', { name: 'More' });
  await more.click();
  const menu = page.getByRole('dialog', { name: 'More navigation' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Close menu' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
});

test('keeps project team and form actions visible and contained', async ({ page }) => {
  await page.getByRole('button', { name: /New project/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Project' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close editor' })).toBeVisible();
  await expect(dialog.getByText('Project team members')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Add team member' })).toBeVisible();

  const modalBox = await dialog.boundingBox();
  expect(modalBox).not.toBeNull();
  for (const name of ['Cancel', 'Save']) {
    const button = dialog.getByRole('button', { name, exact: true });
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(modalBox!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(modalBox!.x + modalBox!.width + 1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
});

test('presents linked validation errors and focuses the first invalid field', async ({ page }) => {
  await page.getByRole('button', { name: /New project/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Project' });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  const summary = dialog.getByRole('alert').filter({ hasText: 'Check the highlighted fields' });
  await expect(summary).toBeVisible();
  const name = dialog.getByLabel(/Name/);
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAttribute('aria-describedby', 'name-error');
  await expect(dialog.locator('#name-error')).toHaveText('This field is required.');
  await expect(name).toBeFocused();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('uses mobile activity cards and supports filter disclosure and reset', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Activities' }).click();
  await expect(page.getByRole('heading', { name: 'Activities', exact: true })).toBeVisible();
  await expect(page.locator('.table-card')).toBeHidden();
  await expect(page.locator('.mobile-list')).toBeVisible();

  const toggle = page.locator('.activity-filter-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const archived = page.getByLabel('Archived', { exact: true });
  await expect(archived).toBeVisible();
  const archivedBox = await archived.boundingBox();
  expect(archivedBox?.width).toBe(20);
  expect(archivedBox?.height).toBe(20);
  await page.getByLabel('Filter by status').selectOption('completed');
  await expect(toggle).toHaveText(/Filters \(1\)/);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(toggle).toHaveText('Filters');
  await expect(page.getByLabel('Filter by status')).toHaveValue('all');
});

test('contains project filters and keeps desktop-only timeline ranges off mobile', async ({ page }) => {
  const filters = page.locator('.project-filters');
  await expect(filters).toBeVisible();
  await expect(page.getByLabel('Sort projects')).toBeVisible();
  await expect(page.getByLabel('Show archived')).toBeVisible();
  const archiveBox = await page.getByLabel('Show archived').boundingBox();
  expect(archiveBox?.width).toBe(20);
  expect(archiveBox?.height).toBe(20);

  for (const control of [page.getByLabel('Search projects'), page.getByLabel('Sort projects'), page.getByLabel('Show archived')]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Overview' }).click();
  await expect(page.getByRole('heading', { name: 'Active projects' })).toBeVisible();
  await expect(page.locator('.range-tabs')).toBeHidden();
  await expect(page.getByLabel('Draft')).toBeVisible();
  await expect(page.getByLabel('Completed')).toBeVisible();
  await expect(page.locator('.project-cards')).toBeVisible();
});

test('contains detail summaries and administration rows on narrow screens', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Activities' }).click();
  const activity = page.locator('.mobile-list a[href^="/activities/"]').first();
  await expect(activity, 'The E2E account must contain at least one activity').toHaveCount(1);
  await activity.click();
  for (const value of await page.locator('.activity-summary>div').all()) {
    const cell = await value.boundingBox();
    const content = await value.locator('strong,.status-pill').first().boundingBox();
    if (cell && content) expect(content.x + content.width).toBeLessThanOrEqual(cell.x + cell.width + 1);
  }

  await page.goto('/administration');
  await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const row of await page.locator('.admin-row').all()) {
    const box = await row.boundingBox();
    if (box) expect(box.x + box.width).toBeLessThanOrEqual(390);
  }
});

test('keeps project schedule month labels distinct on narrow screens', async ({ page }) => {
  const project = page.locator('.mobile-list a[href^="/projects/"]').first();
  await expect(project, 'The E2E account must contain at least one active project').toHaveCount(1);
  await project.click();
  const schedule = page.locator('.project-schedule-scroll');
  if (!await schedule.count()) return;
  await expect(schedule).toBeVisible();
  const boxes = await page.locator('.schedule-header-track span').evaluateAll((labels) => labels.map((label) => label.getBoundingClientRect()).map(({ x, width }) => ({ x, width })));
  for (let index = 1; index < boxes.length; index += 1) expect(boxes[index - 1].x + boxes[index - 1].width).toBeLessThanOrEqual(boxes[index].x + 1);
});
