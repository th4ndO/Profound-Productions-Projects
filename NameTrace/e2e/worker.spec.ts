import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import * as XLSX from 'xlsx';

test('a 100k-row workbook parses without freezing the page', async ({ page }, info) => {
  const rows: (string | number)[][] = [['Full Name', 'Leader at 1728', 'Email', 'Notes']];
  for (let i = 0; i < 100_000; i++) rows.push([`Person ${i}`, i % 50 === 0 ? 'Sarah Connor' : `Leader ${i % 40}`, `p${i}@example.com`, 'Registered at the youth camp event']);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Big');
  const path = info.outputPath('big.xlsx');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

  await page.goto('/');
  // Record main-thread tasks over 50 ms while the worker parses.
  await page.evaluate(() => {
    (window as unknown as { longTasks: number[] }).longTasks = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) (window as unknown as { longTasks: number[] }).longTasks.push(e.duration);
    }).observe({ type: 'longtask', buffered: false });
  });
  const t0 = Date.now();
  await page.getByTestId('file-input').setInputFiles(path);
  await expect(page.locator('[data-testid=file-row][data-status=done]')).toHaveCount(1, { timeout: 60_000 });
  const parseMs = Date.now() - t0;
  await page.waitForTimeout(500);
  const longTasks = await page.evaluate(() => (window as unknown as { longTasks: number[] }).longTasks);
  console.log(`big.xlsx: ${parseMs} ms; main-thread long tasks: ${longTasks.length}, max ${Math.max(0, ...longTasks).toFixed(0)} ms`);
  await expect(page.getByTestId('file-row')).toContainText(/100[\s,\u00a0\u202f]000 rows/);
  // Before batching and interning, finishing this file froze the page for
  // ~1.1 s in one task. What remains is garbage collection of 100k records
  // (typically 80–140 ms here); the budget leaves room for slower machines.
  expect(Math.max(0, ...longTasks)).toBeLessThan(250);

  // Search latency on 100k rows, measured from Enter to the rendered summary.
  await page.getByRole('button', { name: 'Find a person' }).click();
  const box = page.getByRole('searchbox', { name: 'Name to find' });
  const timings: number[] = [];
  for (const q of ['Sarah Connor', 'Connor, Sarah', 'Person 4217', 'Sarah Conner']) {
    await box.fill(q);
    const ms = await page.evaluate(async (query) => {
      const input = document.querySelector<HTMLInputElement>('#nt-search')!;
      const heading = document.querySelector('#nt-results-title')!;
      const t = performance.now();
      input.form!.requestSubmit();
      await new Promise<void>((resolve) => {
        const check = () => (heading.textContent?.includes(`“${query}”`) ? resolve() : requestAnimationFrame(check));
        check();
      });
      return performance.now() - t;
    }, q);
    timings.push(ms);
  }
  console.log(`search on 100k rows (Enter → rendered): ${timings.map((t) => t.toFixed(0)).join(', ')} ms`);
  expect(Math.max(...timings)).toBeLessThan(1000);
});
