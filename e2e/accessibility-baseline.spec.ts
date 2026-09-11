import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

type BaselineNode = {
  failureSummary?: string;
  target: string[];
};

type BaselineViolation = {
  description: string;
  help: string;
  helpUrl: string;
  id: string;
  impact: string | null;
  nodes: BaselineNode[];
};

async function recordAccessibilityBaseline(page: Page, testInfo: TestInfo, state: string) {
  await expect(page, `${state} must have a stable document title before auditing`).toHaveTitle(/Threshold Projects/);
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const violations: BaselineViolation[] = results.violations.map(violation => ({
    id: violation.id,
    impact: violation.impact ?? null,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map(node => ({
      target: node.target.map(target => String(target)),
      failureSummary: node.failureSummary,
    })),
  }));
  const blockingCandidates = violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical');
  testInfo.annotations.push({
    type: 'accessibility-baseline',
    description: `${state}: ${violations.length} violations; ${blockingCandidates.length} serious/critical candidates`,
  });
  const ruleSummary = violations.map(violation => `${violation.id}(${violation.nodes.length})`).join(', ') || 'none';
  process.stdout.write(`[accessibility baseline] ${testInfo.project.name} · ${state}: ${violations.length} violations; ${blockingCandidates.length} serious/critical; rules: ${ruleSummary}\n`);
  if (process.env.THRESHOLD_E2E_A11Y_DETAIL === '1' && violations.length) {
    process.stdout.write(`${JSON.stringify({ state, project: testInfo.project.name, violations }, null, 2)}\n`);
  }
  await testInfo.attach(`accessibility-${state.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`, {
    body: JSON.stringify({ state, project: testInfo.project.name, violations }, null, 2),
    contentType: 'application/json',
  });
  expect(
    blockingCandidates.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes,
    })),
    `${state} has serious or critical accessibility violations`,
  ).toEqual([]);
}

test.describe('@accessibility required audit', () => {
  test.setTimeout(60_000);

  test('audits public and authenticated page states', async ({ browser, page }, testInfo) => {
    const anonymous = await browser.newContext({
      baseURL: String(testInfo.project.use.baseURL),
      storageState: { cookies: [], origins: [] },
    });
    const signIn = await anonymous.newPage();
    await signIn.goto('/sign-in');
    await expect(signIn.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
    await recordAccessibilityBaseline(signIn, testInfo, 'sign-in');
    await anonymous.close();

    const states = [
      { path: '/', heading: 'Threshold at a glance', name: 'overview', readyText: 'DEV Gala' },
      { path: '/projects', heading: 'Projects', name: 'projects-list', readyText: 'DEV Gala' },
      { path: '/projects/74000000-0000-0000-0000-000000000001', heading: 'DEV Gala', name: 'project-detail' },
      { path: '/activities', heading: 'Activities', name: 'activities-list', readyText: 'DEV Confirm gala brief' },
      { path: '/activities/75000000-0000-0000-0000-000000000002', heading: 'DEV Finalize guest requirements', name: 'activity-detail' },
      { path: '/templates', heading: 'Templates', name: 'templates-list', readyText: 'Ready' },
      { path: '/administration', heading: 'Administration', name: 'administration', readyText: 'DEV Planning' },
    ];

    for (const state of states) {
      await page.goto(state.path);
      await expect(page.getByRole('heading', { name: state.heading, exact: true }).first()).toBeVisible();
      if (state.readyText) await expect(page.getByText(state.readyText, { exact: true }).filter({ visible: true }).first()).toBeVisible();
      await recordAccessibilityBaseline(page, testInfo, state.name);
    }

    await page.goto('/templates');
    const templateLink = page.locator('a[href^="/templates/"]').first();
    const templateName = (await templateLink.textContent())?.trim();
    expect(templateName, 'The E2E account must contain a template fixture').toBeTruthy();
    await templateLink.click();
    await expect(page.getByRole('heading', { name: templateName!, exact: true })).toBeVisible();
    await recordAccessibilityBaseline(page, testInfo, 'template-detail');
  });

  test('audits representative top-level and nested dialogs without changing data', async ({ page }, testInfo) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: /Add project/ }).click();
    const projectDialog = page.getByRole('dialog', { name: 'Project' });
    await expect(projectDialog).toBeVisible();
    await recordAccessibilityBaseline(page, testInfo, 'project-choice-dialog');
    await projectDialog.getByRole('button', { name: 'Start a blank project' }).click();
    await expect(projectDialog.getByLabel(/Name/)).toBeVisible();
    await recordAccessibilityBaseline(page, testInfo, 'project-editor-dialog');
    await projectDialog.getByRole('button', { name: 'Add team member' }).click();
    await expect(page.getByRole('dialog', { name: 'Add team members' })).toBeVisible();
    await recordAccessibilityBaseline(page, testInfo, 'team-member-picker-dialog');

    await page.goto('/templates');
    await page.locator('a[href^="/templates/"]').first().click();
    await page.getByRole('button', { name: /Add activity/ }).first().click();
    const templateActivity = page.getByRole('dialog', { name: 'Template activity' });
    await expect(templateActivity).toBeVisible();
    await recordAccessibilityBaseline(page, testInfo, 'template-activity-dialog');
    await templateActivity.getByRole('button', { name: /Add schedule rule/ }).click();
    await expect(page.getByRole('dialog', { name: 'Schedule rule' })).toBeVisible();
    await recordAccessibilityBaseline(page, testInfo, 'nested-schedule-rule-dialog');

    if (testInfo.project.name === 'mobile-chromium') {
      await page.goto('/projects');
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('dialog', { name: 'Main menu' })).toBeVisible();
      await recordAccessibilityBaseline(page, testInfo, 'mobile-navigation-dialog');
    }
  });
});
