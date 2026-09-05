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

  const toggle = page.getByRole('button', { name: 'Filters', exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Filter by status').selectOption('completed');
  await expect(toggle).toHaveText(/Filters \(1\)/);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(toggle).toHaveText('Filters');
  await expect(page.getByLabel('Filter by status')).toHaveValue('all');
});
