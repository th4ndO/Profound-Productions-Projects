import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = join(import.meta.dirname, '..', 'test-results', 'tour');
const TITLES = [
  'Welcome to NameTrace',
  'Add your roster',
  'Choose a leader at 1728',
  'Everyone under that leader',
  'Export the list',
  'Find a person',
  'Read the search results',
  'Check your files',
  'You’re ready',
];

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test(`guided tour walks through the app (${name})`, async ({ page, baseURL }) => {
    mkdirSync(SHOTS, { recursive: true });
    const offOrigin: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith(baseURL!) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) offOrigin.push(r.url());
    });
    await page.setViewportSize(viewport);
    await page.goto('/');

    const opener = page.getByRole('button', { name: /Take the tour|^Tour$/ });
    await opener.click();
    const dialog = page.getByRole('dialog');
    const shot = async (i: number) => {
      await page.waitForTimeout(700); // let scrolling and the spotlight settle
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({ path: join(SHOTS, `${name}-${i}.png`) });
    };
    const next = async (i: number) => {
      await dialog.getByRole('button', { name: 'Next' }).click();
      await expect(dialog).toContainText(TITLES[i - 1]);
      await expect(dialog).toContainText(`Step ${i} of ${TITLES.length}`);
    };

    await expect(dialog).toContainText(TITLES[0]);
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    await shot(1);

    await dialog.getByRole('button', { name: 'Start' }).click();
    await expect(dialog).toContainText(TITLES[1]);
    await dialog.getByRole('button', { name: 'Load sample files' }).click();
    await expect(dialog).toContainText('Sample files added');
    await expect(page.locator('[data-testid=file-row][data-status=done]')).toHaveCount(4, { timeout: 20_000 });
    await shot(2);

    await page.keyboard.press('ArrowRight');
    await expect(dialog).toContainText(TITLES[2]);
    await dialog.getByRole('button', { name: 'Show Thabo Nkosi’s people' }).click();
    await expect(page.locator('#nt-results-title')).toHaveText('Thabo Nkosi: 5 people under this leader at 1728');
    await expect(page.getByText('includes 1 record where the leader is written “Thabo (TK) Nkosi”', { exact: false })).toBeVisible();
    await shot(3);

    await next(4);
    await shot(4);
    await next(5);
    await shot(5);
    await next(6);
    await dialog.getByRole('button', { name: 'Search for “Sarah Connor”' }).click();
    await expect(page.locator('#nt-results-title')).toHaveText(/^Found \d+ entries matching “Sarah Connor”/);
    await shot(6);
    for (const i of [7, 8, 9]) {
      await next(i);
      await shot(i);
    }
    await dialog.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByTestId('tour')).toHaveCount(0);
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tour')).toHaveCount(0);
    expect(offOrigin).toEqual([]);
  });
}

test('the empty screen offers the tour', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'New here? Take a 1-minute tour' }).click();
  await expect(page.getByRole('dialog')).toContainText('Welcome to NameTrace');
});
