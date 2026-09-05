import { chromium, type FullConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { loadEnvFile } from 'node:process';

const authFile = 'e2e/.auth/user.json';

export default async function globalSetup(config: FullConfig) {
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  const email = process.env.THRESHOLD_E2E_EMAIL;
  const password = process.env.THRESHOLD_E2E_PASSWORD;
  if (!email || !password) {
    throw new Error('Set THRESHOLD_E2E_EMAIL and THRESHOLD_E2E_PASSWORD to run the browser smoke suite.');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: config.projects[0].use.baseURL });
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const outcome = await Promise.race([
    page.waitForURL(url => !url.pathname.endsWith('/sign-in')).then(() => 'signed-in' as const),
    page.locator('.auth-message').waitFor({ state: 'visible' }).then(() => 'error' as const),
  ]);
  if (outcome === 'error') {
    const message = await page.locator('.auth-message').textContent();
    throw new Error(`E2E sign-in failed: ${message?.trim() || 'Unknown authentication error'}`);
  }
  await page.getByRole('heading', { name: 'Threshold at a glance' }).waitFor();
  await mkdir(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
  await browser.close();
}
