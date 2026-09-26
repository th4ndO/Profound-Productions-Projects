import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as XLSX from 'xlsx';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');
const ALL = readdirSync(FIXTURES).map((f) => join(FIXTURES, f));
const SHOTS = join(import.meta.dirname, '..', 'test-results', 'screens');

const SMART_HEADLINE = 'Found 31 entries matching “Sarah Connor” across 3 paragraphs, 2 paths, 6 sheets, 2 pages, 2 tables and 2 sections in 11 files';
const SMART_BREAKDOWN = '16 exact, 12 name variants, 3 possible typos';
const EXACT_HEADLINE = 'Found 16 entries matching “Sarah Connor” across 2 paragraphs, 2 paths, 3 sheets, 1 page, 1 table and 2 sections in 10 files';

/** Every request must stay on this origin: documents never leave the browser. */
function trackRequests(page: Page, baseURL: string) {
  const offOrigin: string[] = [];
  const all: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    all.push(url);
    if (!url.startsWith(baseURL) && !url.startsWith('data:') && !url.startsWith('blob:')) offOrigin.push(url);
  });
  return { offOrigin, all };
}

async function loadAll(page: Page) {
  await page.getByTestId('file-input').setInputFiles(ALL);
  await expect(page.getByTestId('file-row')).toHaveCount(ALL.length);
  await expect(page.locator('[data-testid=file-row][data-status=parsing], [data-testid=file-row][data-status=queued]')).toHaveCount(0, { timeout: 30_000 });
}

/** Rosters open in the Leaders view; name search lives under "Find a person". */
async function toSearch(page: Page) {
  const tab = page.getByRole('button', { name: 'Find a person' });
  if (await tab.count()) await tab.click();
}

async function search(page: Page, q: string) {
  await toSearch(page);
  const box = page.getByRole('searchbox', { name: 'Name to find' });
  await box.fill(q);
  await box.press('Enter');
}

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = bad.map((v) => `${v.impact} ${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).slice(0, 5).join('\n  ')}`).join('\n');
  expect(bad, `axe (${label}):\n${report}`).toEqual([]);
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('first load ships only the UI and makes no off-origin requests', async ({ page, baseURL }) => {
    const req = trackRequests(page, baseURL!);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Add a file to start' })).toBeVisible();
    const scripts = req.all.filter((u) => /\.m?js(\?|$)/.test(u));
    expect(scripts.some((u) => /pdf|xlsx|mammoth|docx|papaparse|jspdf|worker/i.test(u.split('/').pop()!))).toBe(false);
    await expect(page.getByText('Files stay on this device')).toBeVisible();
    await axe(page, 'empty');
    expect(req.offOrigin).toEqual([]);
  });

  test('searches every fixture type, toggles Exact, and exports CSV', async ({ page, baseURL }) => {
    const req = trackRequests(page, baseURL!);
    await page.goto('/');
    await loadAll(page);

    // Errors and warnings are shown per file.
    await expect(page.getByText('This PDF is password-protected.', { exact: false })).toBeVisible();
    await expect(page.getByText('Save as → .docx', { exact: false })).toBeVisible();
    await expect(page.getByText('This PDF looks scanned', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Choose a leader' })).toBeVisible();
    await toSearch(page);
    await expect(page.getByRole('heading', { name: 'Type a name to search' })).toBeVisible();

    await search(page, 'Sarah Connor');
    const headline = page.locator('#nt-results-title');
    await expect(headline).toHaveText(SMART_HEADLINE);
    await expect(page.getByText(SMART_BREAKDOWN)).toBeVisible();
    await expect(page.getByRole('list', { name: 'Results' }).locator(':scope > li')).toHaveCount(31);
    await expect(page.locator('mark.hl-fuzzy').first()).toBeVisible();

    // Selecting a result shows it in the side-by-side preview with context.
    await page.getByRole('button', { name: /^Preview Page 1, paragraph 2/ }).click();
    const preview = page.getByRole('complementary', { name: 'Page 1, paragraph 2' });
    await expect(preview).toContainText('Attendance was taken by Sarah Connor');
    await expect(preview).toContainText('Page 1, paragraph 1');
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: join(SHOTS, 'desktop-1440.png') });
    await axe(page, 'results');

    await page.getByRole('switch', { name: 'Exact match only' }).click();
    await expect(headline).toHaveText(EXACT_HEADLINE);
    await expect(page.getByText('16 exact', { exact: true })).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download results as CSV' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^nametrace-sarah-connor-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = readFileSync(await download.path());
    expect([...csv.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // UTF-8 BOM
    const lines = csv.toString('utf8').slice(1).split('\r\n');
    expect(lines[0].startsWith('File,Location,Match type,Matched text,Content,')).toBe(true);
    expect(lines[0]).toContain('Leader at 1728');
    expect(lines.filter(Boolean)).toHaveLength(17); // header + 16 rows

    // PDF export and Copy all work too.
    const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download results as PDF' }).click()]);
    expect(readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe('%PDF-');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy all results' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.split('\n')[0]).toBe(EXACT_HEADLINE);

    expect(req.offOrigin).toEqual([]);
  });

  test('Leaders view lists everyone under one leader at 1728', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(join(FIXTURES, 'roster-export.xls'));
    await expect(page.locator('[data-testid=file-row][data-status=done]')).toHaveCount(1);
    // Rosters open in the Leaders view; spellings of one leader are grouped, and the
    // Payroll sheet (no leader column) is left out.
    await expect(page.getByRole('button', { name: 'Leaders', pressed: true })).toBeVisible();
    const list = page.getByRole('list', { name: 'Leaders in Leader at 1728' });
    await expect(list.getByRole('button')).toHaveText([/^Sarah Connor.*Also written as “Sarah Conner”.*2 people$/, /^Thabo Nkosi.*2 people$/]);
    await list.getByRole('button', { name: /^Thabo Nkosi/ }).click();
    await expect(page.locator('#nt-results-title')).toHaveText('Thabo Nkosi: 2 people under this leader at 1728');
    await expect(page.getByText('2 records', { exact: true })).toBeVisible();
    const people = page.getByRole('list', { name: 'People under Thabo Nkosi' });
    await expect(people.locator(':scope > li h3')).toHaveText(['Sarah Connor', 'Sipho Khumalo']);
    await expect(people).toContainText('0820000003');
    await expect(people).toContainText('Sunday service');

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download people as CSV' }).click()]);
    const lines = readFileSync(await download.path()).toString('utf8').slice(1).split('\r\n').filter(Boolean);
    expect(lines[0].startsWith('Name,Leader at 1728,Visits,First visit,Last visit,Mobile Number,Email,Address,Events')).toBe(true);
    expect(lines.slice(1).map((l) => l.split(',')[0])).toEqual(['Sarah Connor', 'Sipho Khumalo']);

    await list.getByRole('button', { name: /^Sarah Connor/ }).click();
    await expect(page.getByText('includes 1 record where the leader is written “Sarah Conner”', { exact: false })).toBeVisible();
    await expect(page.getByText('Leader written “Sarah Conner”')).toBeVisible();
    await axe(page, 'leaders view');
  });

  test('column filter in Find a person still works', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(join(FIXTURES, 'roster-export.xls'));
    await expect(page.locator('[data-testid=file-row][data-status=done]')).toHaveCount(1);
    await toSearch(page);
    await page.getByLabel('Column').selectOption('Leader at 1728');
    await page.getByRole('button', { name: /^Sarah Connor 1$/ }).click();
    await expect(page.locator('#nt-results-title')).toHaveText('Found 2 entries matching “Sarah Connor” across 1 sheet in 1 file');
  });

  test('hotkeys, clear, and zero-match suggestions', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles(join(FIXTURES, 'notes.txt'));
    await expect(page.locator('[data-testid=file-row][data-status=done]')).toHaveCount(1);
    const box = page.getByRole('searchbox', { name: 'Name to find' });
    await page.locator('body').click();
    await page.keyboard.press('/');
    await expect(box).toBeFocused();
    await page.locator('body').click();
    await page.keyboard.press('Control+k');
    await expect(box).toBeFocused();

    await page.keyboard.type('Zelda Fitzgerald');
    await expect(page.getByRole('heading', { name: 'No matches for “Zelda Fitzgerald”' })).toBeVisible(); // debounced, no Enter
    await expect(page.getByRole('button', { name: 'Fitzgerald' })).toBeVisible();
    await page.getByRole('switch', { name: 'Case sensitive' }).click();
    await expect(page.getByRole('button', { name: 'Turn off Case sensitive' })).toBeVisible();
    await page.getByRole('button', { name: 'Turn off Case sensitive' }).click();
    await expect(page.getByRole('switch', { name: 'Case sensitive' })).toHaveAttribute('aria-checked', 'false');

    await box.press('Escape');
    await expect(box).toHaveValue('');
    await expect(page.getByRole('heading', { name: 'Type a name to search' })).toBeVisible();
  });

  test('removing a file mid-parse cancels it', async ({ page }, info) => {
    const rows: string[][] = [['Name', 'Notes']];
    for (let i = 0; i < 150_000; i++) rows.push([`Person ${i}`, 'Registered at the youth camp event with family']);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Big');
    const path = info.outputPath('big.xlsx');
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

    await page.goto('/');
    await page.getByTestId('file-input').setInputFiles([path, join(FIXTURES, 'notes.txt')]);
    await expect(page.locator('[data-testid=file-row][data-status=parsing]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Remove big.xlsx' }).click();
    await expect(page.getByTestId('file-row')).toHaveCount(1);
    await expect(page.locator('[data-testid=file-row][data-status=done]')).toHaveCount(1);
    await search(page, 'Sarah Connor');
    await expect(page.locator('#nt-results-title')).toHaveText('Found 2 entries matching “Sarah Connor” across 2 paragraphs in 1 file');
  });
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('single column with a bottom-sheet preview', async ({ page }) => {
    await page.goto('/');
    await loadAll(page);
    await search(page, 'Sarah Connor');
    await expect(page.locator('#nt-results-title')).toHaveText(SMART_HEADLINE);
    // No horizontal scrolling at phone width.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: join(SHOTS, 'mobile-390-results.png') });

    const opener = page.getByRole('button', { name: /^Preview Page 1, paragraph 2/ });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Page 1, paragraph 2' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Attendance was taken by Sarah Connor');
    await page.screenshot({ path: join(SHOTS, 'mobile-390-preview.png') });
    await axe(page, 'mobile drawer');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
    await axe(page, 'mobile results');
  });
});
