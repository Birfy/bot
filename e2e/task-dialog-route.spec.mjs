import { test, expect } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { harness, setup, account, repository } from '../test/helpers.mjs';
import { boardFixtures } from '../test/board-fixtures.mjs';

const shot = (page, name) => {
  mkdirSync('.tmp/task-dialog-route', { recursive: true });
  return page.screenshot({ path: `.tmp/task-dialog-route/${name}.png`, fullPage: true });
};

async function fixture() {
  const h = await harness(), { admin, password } = await setup(h), a = await account(admin);
  await repository(admin, a.id, '101');
  await repository(admin, a.id, '202');
  boardFixtures(h.store);
  return { h, password };
}

async function loginToBoard(page, url, password) {
  await page.goto(url + '/#/board');
  await page.getByLabel('用户名', { exact: true }).fill('administrator');
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.locator('#board-columns')).not.toHaveAttribute('aria-busy', 'true');
}

test('打开任务详情后切换到待处理会关掉对话框，同一地址重绘则保持打开', async ({ page }) => {
  const { h, password } = await fixture(), errors = [];
  page.on('pageerror', err => errors.push(err.message));
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await loginToBoard(page, h.admin, password);
    await page.locator('.board-card-title').first().click();
    const task = page.locator('#task-view');
    await expect(task).toBeVisible();
    await shot(page, '390-before-nav');
    // Same-address redraw must keep the overlay (poll / refresh).
    await page.evaluate(() => route());
    await expect(task).toBeVisible();
    await page.evaluate(() => { location.hash = '#/inbox'; });
    await expect(task).toBeHidden();
    await expect(page.locator('#console-page h1')).toHaveText('待处理');
    await shot(page, '390-after-inbox');

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.evaluate(() => { location.hash = '#/board'; });
    await expect(page.locator('#board-columns')).not.toHaveAttribute('aria-busy', 'true');
    await page.locator('.board-card-title').first().click();
    await expect(task).toBeVisible();
    await shot(page, '1280-before-nav');
    await page.evaluate(() => { location.hash = '#/inbox'; });
    await expect(task).toBeHidden();
    await expect(page.locator('#console-page h1')).toHaveText('待处理');
    await shot(page, '1280-after-inbox');
    expect(errors).toEqual([]);
  } finally {
    await h.stop();
    rmSync(h.directory, { recursive: true, force: true });
  }
});
