import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
});

test('retains the desktop sidebar, tables, and expanded filters', async ({ page }) => {
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeHidden();
  await expect(page.locator('.table-card')).toBeVisible();
  await expect(page.locator('.mobile-list')).toBeHidden();

  await page.locator('.sidebar').getByRole('link', { name: /Activities/ }).click();
  await expect(page.locator('.table-card')).toBeVisible();
  await expect(page.getByLabel('Filter by status')).toBeVisible();
  await expect(page.locator('.activity-filter-toggle')).toBeHidden();
});

test('retains desktop project filters and portfolio range controls', async ({ page }) => {
  await expect(page.getByLabel('Sort projects')).toBeVisible();
  await expect(page.getByLabel('Show archived')).toBeVisible();
  const checkbox = await page.getByLabel('Show archived').boundingBox();
  expect(checkbox?.width).toBe(20);
  expect(checkbox?.height).toBe(20);
  await page.locator('.sidebar').getByRole('link', { name: /Overview/ }).click();
  const ranges = page.locator('.range-tabs');
  await expect(ranges).toBeVisible();
  await ranges.getByRole('button', { name: 'Quarter' }).click();
  await expect(ranges.getByRole('button', { name: 'Quarter' })).toHaveAttribute('aria-pressed', 'true');
});

test('keeps the desktop project editor contained without changing data', async ({ page }) => {
  await page.getByRole('button', { name: /New project/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Project' });
  await expect(dialog.getByRole('button', { name: 'Add team member' })).toBeVisible();

  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  for (const name of ['Cancel', 'Save']) {
    const box = await dialog.getByRole('button', { name, exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);
  }
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('retains project schedule and a single activity creation action', async ({ page }) => {
  const project = page.locator('.table-card tbody a[href^="/projects/"]').first();
  await expect(project, 'The E2E account must contain at least one active project').toHaveCount(1);
  await project.click();
  await expect(page.getByRole('heading', { name: 'Activity sequence' })).toBeVisible();
  const schedule = page.locator('.project-schedule-scroll');
  if (await schedule.count()) {
    await expect(schedule).toBeVisible();
    const majorLines = await page.locator('.schedule-header-track .schedule-grid-major').evaluateAll((items) => items.slice(0, 2).map((item) => item.getBoundingClientRect().x));
    if (majorLines.length > 1) expect(majorLines[1] - majorLines[0]).toBeCloseTo(126, 0);
    await expect(page.locator('.project-end-marker span')).not.toHaveText('Project end');
  }
  else await expect(page.getByText('No activities yet', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Add activity/ })).toHaveCount(1);
});
