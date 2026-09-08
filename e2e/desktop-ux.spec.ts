import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
});

async function openBlankProjectEditor(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Add project/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Project' });
  await expect(dialog.getByRole('button', { name: 'Close editor' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Start a blank project' }).click();
  return dialog;
}

test('retains the desktop sidebar, tables, and expanded filters', async ({ page }) => {
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('.mobile-header')).toBeHidden();
  await expect(page.locator('.table-card')).toBeVisible();
  await expect(page.locator('.mobile-list')).toBeHidden();

  await page.locator('.sidebar').getByRole('link', { name: /Activities/ }).click();
  await expect(page.locator('.table-card')).toBeVisible();
  await expect(page.getByLabel('Filter by status')).toBeVisible();
  await expect(page.locator('.activity-filter-toggle')).toBeHidden();
});

test('retains desktop project filters and portfolio range controls', async ({ page }) => {
  await expect(page.getByLabel('Sort projects')).toBeVisible();
  await expect(page.getByLabel('Filter projects by status')).toBeVisible();
  await expect(page.getByLabel('Filter projects by team member')).toBeVisible();
  await expect(page.getByLabel('Filter projects by type')).toBeVisible();
  await expect(page.getByLabel('Filter projects by end date')).toBeVisible();
  await expect(page.getByLabel('Archived', { exact: true })).toBeVisible();
  await expect(page.locator('.project-filter-toggle')).toBeHidden();
  const checkbox = await page.getByLabel('Archived', { exact: true }).boundingBox();
  expect(checkbox?.width).toBe(20);
  expect(checkbox?.height).toBe(20);
  await page.locator('.sidebar').getByRole('link', { name: /Overview/ }).click();
  const ranges = page.locator('.range-tabs');
  await expect(ranges).toBeVisible();
  await ranges.getByRole('button', { name: 'Quarter' }).click();
  await expect(ranges.getByRole('button', { name: 'Quarter' })).toHaveAttribute('aria-pressed', 'true');
  const workload = page.getByRole('region', { name: 'Team workload' });
  await expect(workload.getByText(/Bar length shows/)).toBeVisible();
  await expect(workload.getByRole('list', { name: 'Activity status legend' })).toBeVisible();
  await expect(workload.getByRole('img').first()).toHaveAttribute('aria-label', /total activities/);
  const metricTiles = page.locator('.metric-tile');
  await expect(metricTiles).toHaveCount(3);
  await expect(metricTiles.first()).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.metric-icon')).toHaveCount(0);
});

test('keeps the desktop project editor contained without changing data', async ({ page }) => {
  const dialog = await openBlankProjectEditor(page);
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

test('shows activity scheduling context and previews archive impact without changing data', async ({ page }) => {
  await page.goto('/activities/75000000-0000-0000-0000-000000000002');
  await expect(page.getByRole('heading', { name: 'DEV Finalize guest requirements' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Used by' })).toBeVisible();
  await expect(page.locator('.relations-panel').getByRole('link', { name: /DEV Produce gala materials/ })).toBeVisible();
  const timeline = page.getByRole('region', { name: 'Project and relationship context' });
  await expect(timeline).toBeVisible();
  await expect(timeline.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  await expect(timeline.locator('.activity-context-label').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(timeline.locator('.activity-context-grid')).toHaveCSS('grid-template-columns', /220px/);
  await expect(timeline.locator('.activity-context-track').first()).toHaveCSS('min-height', '58px');
  const firstTrack = timeline.locator('.activity-context-track').first();
  const firstGridLine = firstTrack.locator('.schedule-grid-minor').first();
  const [trackBox, gridLineBox] = await Promise.all([firstTrack.boundingBox(), firstGridLine.boundingBox()]);
  expect(trackBox).not.toBeNull();
  expect(gridLineBox).not.toBeNull();
  expect(Math.abs(gridLineBox!.height - trackBox!.height)).toBeLessThanOrEqual(1);
  await expect(firstGridLine).toHaveCSS('clip-path', 'none');
  await expect(timeline.getByText(/Selected activity ·/)).toBeVisible();
  await expect(timeline.getByText(/dependent ·/i)).toBeVisible();
  await timeline.getByRole('button', { name: 'Dependents' }).click();
  await expect(timeline.getByRole('button', { name: 'Dependents' })).toHaveAttribute('aria-pressed', 'true');
  await expect(timeline.getByText(/dependent ·/i)).toBeVisible();
  const links = page.locator('.activity-links');
  await expect(links.getByRole('link', { name: /DEV brief/ })).toBeVisible();
  const workspaceBox = await page.locator('.activity-workspace').boundingBox();
  const linksBox = await links.boundingBox();
  expect(workspaceBox).not.toBeNull();
  expect(linksBox).not.toBeNull();
  expect(linksBox!.y).toBeGreaterThanOrEqual(workspaceBox!.y + workspaceBox!.height);

  let archiveMessage = '';
  page.once('dialog', async dialog => {
    archiveMessage = dialog.message();
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  expect(archiveMessage).toContain('DEV Produce gala materials');
  await expect(page.getByRole('heading', { name: 'DEV Finalize guest requirements' })).toBeVisible();

  await page.goto('/activities/75000000-0000-0000-0000-000000000005');
  await expect(page.getByRole('heading', { name: 'Schedule rule' })).toBeVisible();
  await expect(page.getByText('Finish after project end and within 7 calendar days.')).toBeVisible();
});

test('keeps relationship context contained at an intermediate width', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/activities/75000000-0000-0000-0000-000000000002');
  const timeline = page.getByRole('region', { name: 'Project and relationship context' });
  await expect(timeline).toBeVisible();
  const box = await timeline.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(820);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);
});

test('shows template lead-in and restores focus after closing the project editor', async ({ page }) => {
  const addProject = page.getByRole('button', { name: /Add project/ });
  await addProject.click();
  const dialog = page.getByRole('dialog', { name: 'Project' });
  await expect(dialog.getByRole('button', { name: 'Close editor' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Start from template' }).click();
  await expect(dialog.getByText(/calendar days? lead-in/).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await expect(addProject).toBeFocused();
});
