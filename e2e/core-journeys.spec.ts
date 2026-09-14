import { expect, test } from '@playwright/test';

const mutationsEnabled = process.env.THRESHOLD_E2E_MUTATIONS === '1';

function isoDaysFromToday(days: number) {
  const value = new Date();
  value.setUTCHours(12, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

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

test('@projects creates, edits, reschedules, and archives a project', async ({ page }) => {
  test.skip(!mutationsEnabled, 'Mutation journeys require a disposable or explicitly resettable fixture backend.');
  const name = `DEV QA E2E Project ${Date.now()}`;
  const editedName = `${name} edited`;
  const activityName = `${name} activity`;
  const start = isoDaysFromToday(10);
  const end = isoDaysFromToday(30);
  const activityStart = isoDaysFromToday(12);
  const activityDue = isoDaysFromToday(14);
  const movedEnd = isoDaysFromToday(37);
  const movedActivityStart = isoDaysFromToday(19);
  const movedActivityDue = isoDaysFromToday(21);

  await page.goto('/projects');
  await page.getByRole('button', { name: /Add project/ }).click();
  const createDialog = page.getByRole('dialog', { name: 'Project' });
  await createDialog.getByRole('button', { name: /Start a blank project/ }).click();
  await createDialog.getByLabel('Name').fill(name);
  await createDialog.getByLabel('Description').fill('Disposable project lifecycle fixture.');
  await createDialog.getByLabel('Type').selectOption({ label: 'DEV Event' });
  await createDialog.getByLabel('Status').selectOption('on_track');
  await createDialog.getByLabel('Start date').fill(start);
  await createDialog.getByLabel('End date').fill(end);
  await createDialog.getByRole('button', { name: 'Add team member' }).click();
  const memberPicker = createDialog.getByRole('dialog', { name: 'Add team members' });
  await memberPicker.getByLabel('DEV Avery Morgan').check();
  await memberPicker.getByRole('button', { name: 'Save team members' }).click();
  await createDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Project saved.');

  await page.getByLabel('Search projects').fill(name);
  const createdProject = page.getByRole('link', { name, exact: true }).first();
  await expect(createdProject).toBeVisible();
  const projectRow = createdProject.locator('xpath=ancestor::tr');
  await expect(projectRow).toContainText('DEV Event');
  await expect(projectRow).toContainText('On track');
  await expect(projectRow.getByTitle('DEV Avery Morgan')).toBeVisible();
  await createdProject.click();
  await expect(page.getByRole('heading', { name })).toBeVisible();

  await page.getByRole('button', { name: 'Add activity' }).click();
  const activityDialog = page.getByRole('dialog', { name: 'Activity' });
  await activityDialog.getByLabel('Activity name').fill(activityName);
  await activityDialog.getByText('Schedule and notes', { exact: true }).click();
  await activityDialog.getByLabel('Start date').fill(activityStart);
  await activityDialog.getByLabel('Due date').fill(activityDue);
  await activityDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Activity saved.');
  const activityRow = page.locator('.project-activity-row').filter({ hasText: activityName });
  await expect(activityRow).toBeVisible();

  await page.getByRole('button', { name: 'Edit project' }).click();
  await page.getByLabel('Name').fill(editedName);
  await page.getByLabel('Description').fill('Edited project lifecycle fixture.');
  await page.getByLabel('End date').fill(isoDaysFromToday(9));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('#end-error')).toHaveText('End date must be on or after the start date.');
  await page.getByLabel('End date').fill(end);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Project changes saved.');
  await expect(page.getByRole('heading', { name: editedName })).toBeVisible();
  await expect(page.getByText('Edited project lifecycle fixture.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: editedName })).toBeVisible();

  await page.getByRole('button', { name: 'Edit project' }).click();
  await page.getByLabel('End date').fill(movedEnd);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Move entire schedule' });
  await expect(preview.getByText('Original project window')).toBeVisible();
  await expect(preview.getByText('Entered project window')).toBeVisible();
  await expect(preview.getByText(activityName, { exact: true })).toBeVisible();
  await expect(preview).toContainText('Activity dates move 7 calendar days later.');
  await preview.getByRole('button', { name: 'Confirm schedule' }).click();
  await expect(page.getByRole('status')).toContainText('Project changes saved.');

  await activityRow.click();
  const activityEditor = page.getByRole('dialog').filter({ has: page.getByLabel('Activity name') });
  await expect(activityEditor.getByLabel('Start date')).toHaveValue(movedActivityStart);
  await expect(activityEditor.getByLabel('Due date')).toHaveValue(movedActivityDue);
  await activityEditor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Edit project' }).click();
  await expect(page.getByLabel('End date')).toHaveValue(movedEnd);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  page.once('dialog', confirmation => confirmation.accept());
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.getByLabel('Search projects').fill(editedName);
  await expect(page.getByRole('link', { name: editedName, exact: true })).toHaveCount(0);
  await page.getByLabel('Archived', { exact: true }).check();
  await expect(page.getByRole('link', { name: editedName, exact: true }).first()).toBeVisible();
});

test('@templates authors, validates, edits, and archives a template', async ({ page }) => {
  test.skip(!mutationsEnabled, 'Mutation journeys require a disposable or explicitly resettable fixture backend.');
  const name = `DEV QA E2E Template ${Date.now()}`;
  const editedName = `${name} edited`;
  const anchorName = `${name} anchor`;
  const dependentName = `${name} dependent`;
  const disconnectedName = `${name} disconnected`;

  await page.goto('/templates');
  await page.getByRole('button', { name: /Create template/ }).click();
  const templateDialog = page.getByRole('dialog', { name: 'Project template' });
  await templateDialog.getByLabel('Name').fill(name);
  await templateDialog.getByLabel('Project type').selectOption({ label: 'DEV Event' });
  await templateDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.locator('.template-readiness-card')).toContainText('Needs setup');

  async function addActivity(activityName: string, duration: string, rule: { type: string; offset: string; reference?: string } | null) {
    await page.getByRole('button', { name: /Add activity/ }).first().click();
    const editor = page.getByRole('dialog', { name: 'Template activity' });
    await editor.getByLabel('Name').fill(activityName);
    await editor.getByLabel('Duration in calendar days').fill(duration);
    if (rule) {
      await editor.getByRole('button', { name: /Add schedule rule/ }).click();
      const ruleDialog = page.getByRole('dialog', { name: 'Schedule rule' });
      await ruleDialog.getByLabel('Rule').selectOption(rule.type);
      if (rule.reference) await ruleDialog.locator('#template-reference').selectOption({ label: rule.reference });
      await ruleDialog.getByLabel('Offset in calendar days').fill(rule.offset);
      await ruleDialog.getByRole('button', { name: 'Save', exact: true }).click();
    }
    await editor.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Template activity saved.');
  }

  await addActivity(anchorName, '3', { type: 'finish_before_project_end', offset: '2' });
  await addActivity(dependentName, '2', { type: 'start_after_activity_finish', offset: '1', reference: anchorName });
  await expect(page.locator('.template-readiness-card')).toContainText('Ready');
  await expect(page.getByText(`Can’t start until ${anchorName} is complete · 1 day offset`)).toBeVisible();

  await page.getByRole('button', { name: 'Edit template' }).click();
  const editTemplate = page.getByRole('dialog', { name: 'Project template' });
  await editTemplate.getByLabel('Name').fill(editedName);
  await editTemplate.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('heading', { name: editedName })).toBeVisible();
  await page.getByRole('button', { name: dependentName, exact: true }).click();
  const editActivity = page.getByRole('dialog', { name: 'Template activity' });
  await editActivity.getByLabel('Duration in calendar days').fill('4');
  await editActivity.locator('.template-rule-row .link-button').click();
  const editRule = page.getByRole('dialog', { name: 'Schedule rule' });
  await editRule.getByLabel('Offset in calendar days').fill('2');
  await editRule.getByRole('button', { name: 'Save', exact: true }).click();
  await editActivity.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`Can’t start until ${anchorName} is complete · 2 days offset`)).toBeVisible();
  await expect(page.getByRole('row').filter({ has: page.getByRole('button', { name: dependentName, exact: true }) })).toContainText('4 days');

  await addActivity(disconnectedName, '1', null);
  await expect(page.locator('.template-readiness-card')).toContainText('Needs setup');
  await page.getByRole('button', { name: disconnectedName, exact: true }).click();
  const repairEditor = page.getByRole('dialog', { name: 'Template activity' });
  await repairEditor.getByRole('button', { name: /Add schedule rule/ }).click();
  const repairRule = page.getByRole('dialog', { name: 'Schedule rule' });
  await repairRule.getByRole('button', { name: 'Save', exact: true }).click();
  await repairEditor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.template-readiness-card')).toContainText('Ready');

  await page.goto('/templates');
  await page.getByLabel('Search templates').fill(editedName);
  const row = page.getByRole('row').filter({ hasText: editedName });
  page.once('dialog', confirmation => confirmation.accept());
  await row.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByRole('link', { name: editedName, exact: true })).toHaveCount(0);
  await page.getByLabel('Archived', { exact: true }).check();
  await expect(page.getByRole('link', { name: editedName, exact: true })).toBeVisible();
});

test('@templates @projects materializes a project from a ready template', async ({ page }) => {
  test.skip(!mutationsEnabled, 'Mutation journeys require a disposable or explicitly resettable fixture backend.');
  const name = `DEV QA E2E Project from template ${Date.now()}`;
  const end = isoDaysFromToday(45);
  const expectedDue = isoDaysFromToday(43);
  const expectedStart = isoDaysFromToday(41);

  await page.goto('/projects');
  await page.getByRole('button', { name: /Add project/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Project' });
  await dialog.getByRole('button', { name: 'Start from template' }).click();
  await dialog.getByRole('button', { name: /DEV Gala template/ }).click();
  await dialog.getByLabel('Project name').fill(name);
  await dialog.getByLabel('Project end date').fill(end);
  await expect(dialog.getByRole('heading', { name: 'Schedule preview' })).toBeVisible();
  await expect(dialog.getByText('DEV Prepare gala brief', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('DEV Event · Active project')).toBeVisible();
  await expect(page.getByText('Draft', { exact: true })).toBeVisible();
  const activityRow = page.locator('.project-activity-row').filter({ hasText: 'DEV Prepare gala brief' });
  await expect(activityRow).toContainText('Not started');
  await activityRow.click();
  const activityEditor = page.getByRole('dialog').filter({ has: page.getByLabel('Activity name') });
  await expect(activityEditor.getByLabel('Start date')).toHaveValue(expectedStart);
  await expect(activityEditor.getByLabel('Due date')).toHaveValue(expectedDue);
  await activityEditor.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.locator('.project-activity-row').filter({ hasText: 'DEV Prepare gala brief' })).toBeVisible();

  page.once('dialog', confirmation => confirmation.accept());
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page).toHaveURL(/\/projects$/);
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
