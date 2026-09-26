import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = join(import.meta.dirname, '..', 'test-results', 'tour');

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
    await expect(dialog).toContainText('Welcome to NameTrace');
    await expect(dialog).toContainText('Step 1 of 9');
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    await page.screenshot({ path: join(SHOTS, `${name}-1.png`) });

    await dialog.getByRole('button', { name: 'Start' }).click();
    await expect(dialog).toContainText('Add your files');
    await dialog.getByRole('button', { name: 'Load sample files' }).click();
    await expect(dialog).toContainText('Sample files added');
    await expect(page.locator('[data-testid=file-row][data-status=done]')).toHaveCount(4, { timeout: 20_000 });
    await page.screenshot({ path: join(SHOTS, `${name}-2.png`) });

    await page.keyboard.press('ArrowRight'); // keyboard navigation works too
    await expect(dialog).toContainText('Type a name');
    await dialog.getByRole('button', { name: 'Search for “Sarah Connor”' }).click();
    await expect(page.locator('#nt-results-title')).toHaveText(/^Found \d+ entries matching “Sarah Connor”/);
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(SHOTS, `${name}-3.png`) });

    const titles = ['Read the results', 'See it in context', 'Narrow it down', 'Check your files', 'Export what you found', 'You’re ready'];
    for (const [i, t] of titles.entries()) {
      await dialog.getByRole('button', { name: 'Next' }).click();
      await expect(dialog).toContainText(t);
      await expect(dialog).toContainText(`Step ${i + 4} of 9`);
      // The card always stays fully on screen.
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      await page.waitForTimeout(700); // let scrolling and the spotlight finish moving
      await page.screenshot({ path: join(SHOTS, `${name}-${i + 4}.png`) });
    }
    await page.keyboard.press('ArrowLeft');
    await expect(dialog).toContainText('Export what you found');
    await page.keyboard.press('ArrowRight');
    await dialog.getByRole('button', { name: 'Finish' }).click();
    await expect(page.getByTestId('tour')).toHaveCount(0);
    await expect(opener).toBeFocused();

    // Esc closes it from any step.
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
