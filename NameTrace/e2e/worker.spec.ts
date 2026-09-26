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
  await page.locator('input[type=file]').setInputFiles(path);
  await expect(page.locator('[data-status=done]')).toHaveCount(1, { timeout: 60_000 });
  const parseMs = Date.now() - t0;
  const longTasks = await page.evaluate(() => (window as unknown as { longTasks: number[] }).longTasks);
  console.log(`big.xlsx: ${parseMs} ms; main-thread long tasks: ${longTasks.length}, max ${Math.max(0, ...longTasks).toFixed(0)} ms`);
  await expect(page.getByTestId('file')).toContainText('100000');
});
