import { jsPDF } from 'jspdf';
import { autoTable, type Styles } from 'jspdf-autotable';
import type { SearchHit } from '../model/types';
import { matchLabel, matchedText } from './common';
import { toPdfText } from './pdfText';

const OBSIDIAN: [number, number, number] = [9, 13, 11];
const SURFACE: [number, number, number] = [20, 36, 27];
const MINT: [number, number, number] = [52, 211, 153];
const INK: [number, number, number] = [236, 253, 245];
const CONTENT_LIMIT = 700;

export interface TableReport {
  title: string;
  headline: string;
  breakdown: string;
  head: string[];
  body: string[][];
  columnStyles?: Record<number, Partial<Styles>>;
}

/** Landscape A4 report: dark title band, a table, page numbers. Shared by both views. */
export function buildTablePdf(report: TableReport): { bytes: ArrayBuffer; replaced: boolean } {
  let replaced = false;
  const t = (s: string) => {
    const r = toPdfText(s);
    replaced ||= r.replaced;
    return r.text;
  };
  const trim = (s: string) => (s.length > CONTENT_LIMIT ? `${s.slice(0, CONTENT_LIMIT)}…` : s);
  const body = report.body.map((row) => row.map((c) => t(trim(c))));
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;

  doc.setFillColor(...OBSIDIAN);
  doc.rect(0, 0, W, 92, 'F');
  doc.setFillColor(...MINT);
  doc.rect(0, 92, W, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(t(report.title), M, 38, { maxWidth: W - 2 * M });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...MINT);
  doc.text(t(report.headline), M, 60, { maxWidth: W - 2 * M });
  doc.setTextColor(190, 205, 198);
  doc.text(t(`${report.breakdown} · Created ${new Date().toLocaleString('en-ZA')} · Files stayed on the device that made this report.`), M, 78, {
    maxWidth: W - 2 * M,
  });

  const totalPagesExp = '{total_pages_count_string}';
  autoTable(doc, {
    startY: 110,
    margin: { left: M, right: M, bottom: 44 },
    head: [report.head.map(t)],
    body,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, overflow: 'linebreak', valign: 'top', textColor: [30, 41, 36], lineColor: [214, 226, 220], lineWidth: 0.5 },
    headStyles: { fillColor: SURFACE, textColor: INK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 250, 247] },
    columnStyles: report.columnStyles,
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 125);
      doc.text(`Page ${page} of ${totalPagesExp}`, W - M, H - 20, { align: 'right' });
      if (replaced) doc.text('Some characters couldn’t be shown in this PDF and appear as “?”. Use the CSV export for the exact text.', M, H - 20);
    },
  });
  doc.putTotalPages(totalPagesExp);
  return { bytes: doc.output('arraybuffer'), replaced };
}

/** Search results report. */
export function buildPdf(hits: SearchHit[], query: string, headline: string, breakdown: string): { bytes: ArrayBuffer; replaced: boolean } {
  return buildTablePdf({
    title: `NameTrace results for “${query.trim()}”`,
    headline,
    breakdown,
    head: ['File', 'Location', 'Match', 'Matched text', 'Content'],
    body: hits.map((h) => [
      h.record.fileName,
      h.record.source,
      matchLabel(h),
      matchedText(h),
      h.record.fields ? h.record.fields.map(([k, v]) => `${k}: ${v}`).join('\n') : h.record.text,
    ]),
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 120 }, 2: { cellWidth: 70 }, 3: { cellWidth: 110 }, 4: { cellWidth: 'auto' } },
  });
}
