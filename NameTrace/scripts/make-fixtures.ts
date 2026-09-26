/**
 * Generates every fixture file in ./fixtures from code, so no binary is
 * hand-made. All names and details are invented.
 *
 *   npm run fixtures
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const OUT = join(import.meta.dirname, '..', 'fixtures');
mkdirSync(OUT, { recursive: true });
const write = (name: string, data: string | Uint8Array | ArrayBuffer) => {
  writeFileSync(join(OUT, name), typeof data === 'string' ? data : new Uint8Array(data as ArrayBuffer));
  console.log('wrote', name);
};

// ── CSV / TSV ────────────────────────────────────────────────────────────────
// Line 1 header; line 3–4 hold one row with a multi-line quoted cell, so the
// row after it starts on line 5.
write(
  'people.csv',
  [
    'Full Name,Leader at 1728,Email,Notes',
    'Sarah Connor,Thabo Nkosi,sarah.connor@example.com,Registered online',
    'Kyle Reese,Sarah Connor,kyle@example.com,"Met at the youth camp,',
    'follow up next week"',
    'John Connor,Thabo Nkosi,,Came with his mother',
    'Lerato Dlamini,Megan Botha,lerato@example.com,Asked about Connor Sarah',
    '',
  ].join('\r\n'),
);
write(
  'people.tsv',
  ['Name\tRole\tComment', 'Connor, Sarah\tLead\tFirst visit', 'Zanele Mokoena\tHelper\tWorked with S. Connor', 'Pieter Jacobs\tHelper\tNone'].join('\n') + '\n',
);

// ── Workbooks ────────────────────────────────────────────────────────────────
function rosterBook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const roster = [
    [], // blank first row: real row numbers must not equal array indexes
    ['Full Name', 'Leader at 12', 'Leader at 144', 'Leader at 1728', 'Address', 'Mobile Number', 'Email', 'Event Name', 'Event Type', 'First Visit'],
    ['Aisha Pillay', 'Grace Mahlangu', 'Peter Coetzee', 'Sarah Connor', '12 Oak Street', '0820000001', 'aisha@example.com', 'Youth night', 'Youth', 45301],
    ['Tariq Naidoo', 'Grace Mahlangu', 'Peter Coetzee', 'Sarah Conner', '4 Elm Road', '0820000002', '', 'Sunday service', 'Service', 45308],
    ['Sarah Connor', 'Grace Mahlangu', 'Peter Coetzee', 'Thabo Nkosi', '9 Pine Avenue', '0820000003', 'sconnor@example.com', 'Sunday service', 'Service', '2024/01/14'],
    [],
    ['Sipho Khumalo', 'Grace Mahlangu', 'Peter Coetzee', 'Thabo Nkosi', '', '0820000004', 'sipho@example.com', 'Youth night', 'Youth', 45322],
  ];
  const ws = XLSX.utils.aoa_to_sheet(roster);
  // Date serials formatted as dates, like real exports (text dates stay text).
  for (const r of [3, 4, 7]) ws[`J${r}`].z = 'm/d/yyyy';
  XLSX.utils.book_append_sheet(wb, ws, 'Roster');
  const payroll = XLSX.utils.aoa_to_sheet([
    ['Employee', 'Department', 'Amount'],
    ['Connor, Sarah', 'Outreach', 1200],
    ['David van der Merwe', 'Finance', 900],
  ]);
  XLSX.utils.book_append_sheet(wb, payroll, 'Payroll');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Sheet2');
  return wb;
}
// Real exports are often .xlsx content with a .xls name.
write('roster-export.xls', XLSX.write(rosterBook(), { type: 'array', bookType: 'xlsx' }));
write('roster.ods', XLSX.write(rosterBook(), { type: 'array', bookType: 'ods' }));
write('legacy-biff8.xls', XLSX.write(rosterBook(), { type: 'array', bookType: 'biff8' }));

// ── Plain text ───────────────────────────────────────────────────────────────
write(
  'notes.txt',
  [
    'Meeting notes for the outreach team.',
    '',
    'Sarah Connor opened the meeting and',
    'thanked everyone for coming.',
    '',
    '- Kyle Reese will call new visitors',
    '- Sarah J. Connor will book the venue',
    '- John Connor. Sarah Smith will bring snacks',
    '',
    'Next meeting: Tuesday.',
  ].join('\n'),
);
write(
  'plan.md',
  ['# Associates', '', 'Our main contact is José Álvarez.', '', '## Follow-ups', '', '1. Call Sarah Connor', '2. Email sarah_connor', '', 'Done.'].join('\n'),
);
write('app.log', ['2024-01-01 10:00 login user=sconnor', '2024-01-01 10:05 export by Sarah Connor', '2024-01-01 10:07 logout'].join('\n'));

// ── JSON ─────────────────────────────────────────────────────────────────────
write(
  'incidents.json',
  JSON.stringify(
    {
      title: 'Incident log',
      owner: 'Sarah Connor',
      meta: { region: 'Gauteng', reviewer: 'Kyle Reese' },
      incidents: [
        { id: 1, reported_by: { name: 'Sarah Connor', phone: '0820000003' }, tags: ['urgent', 'venue'] },
        { id: 2, reported_by: { name: 'John Connor' }, notes: [{ author: 'S. Connor', text: 'Checked' }] },
        { id: 3, reported_by: { name: 'Thabo Nkosi' } },
      ],
    },
    null,
    2,
  ),
);

// ── DOCX ─────────────────────────────────────────────────────────────────────
const cell = (t: string) => new TableCell({ children: [new Paragraph(t)], width: { size: 3000, type: WidthType.DXA } });
const docx = new Document({
  sections: [
    {
      children: [
        new Paragraph({ children: [new TextRun('Quarterly report')] }),
        new Paragraph({ text: 'Associates', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun('This section lists everyone who helped, including '), new TextRun({ text: 'Sarah Connor', bold: true }), new TextRun('.')] }),
        new Paragraph({ text: 'Kyle Reese coordinated transport.', bullet: { level: 0 } }),
        new Paragraph({ text: 'Connor, Sarah handled registration.', bullet: { level: 0 } }),
        new Table({
          rows: [
            new TableRow({ children: [cell('Name'), cell('Role')] }),
            new TableRow({ children: [cell('Thabo Nkosi'), cell('Driver')] }),
            new TableRow({ children: [cell('Sarah Connor'), cell('Lead')] }),
          ],
        }),
        new Paragraph({ text: 'Finances', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: 'No issues this quarter.', alignment: AlignmentType.LEFT }),
      ],
    },
  ],
});
Packer.toBuffer(docx).then((b) => write('report.docx', b));

// ── PDFs ─────────────────────────────────────────────────────────────────────
function textPdf(): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const L = 14; // line height
  let y = 72;
  const line = (t: string) => {
    doc.text(t, 72, y);
    y += L;
  };
  const gap = () => (y += L);
  // Page 1: two paragraphs, then bullets.
  line('The outreach committee met on Tuesday evening to review');
  line('the plans for the coming quarter and agreed on budgets.');
  line('Transport will be handled by the youth team this year.');
  gap();
  line('Attendance was taken by Sarah Connor, who also shared');
  line('the updated contact list with the rest of the commit-');
  line('tee members before the meeting closed.');
  gap();
  line('• Kyle Reese will follow up with first-time visitors');
  line('• Connor, Sarah will confirm the venue booking');
  // Page 2: nothing about her.
  doc.addPage();
  y = 72;
  line('Budget review: no changes were requested.');
  line('Venue costs remain the same as last year.');
  // Page 3: split across items on one line to test spacing from x-gaps.
  doc.addPage();
  y = 72;
  doc.text('Signed by', 72, y);
  doc.text('S. Connor', 72 + doc.getTextWidth('Signed by '), y);
  y += L;
  doc.text('Ref:', 72, y);
  doc.text('A-17', 72 + doc.getTextWidth('Ref:'), y); // no gap: must not add a space
  return doc.output('arraybuffer');
}
write('minutes.pdf', textPdf());

function scannedPdf(): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  for (let p = 0; p < 2; p++) {
    if (p) doc.addPage();
    doc.setFillColor(40, 40, 40);
    for (let i = 0; i < 12; i++) doc.rect(72, 72 + i * 16, 300 + (i % 3) * 40, 9, 'F');
  }
  return doc.output('arraybuffer');
}
write('scanned.pdf', scannedPdf());

function lockedPdf(): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', encryption: { userPassword: 'secret', ownerPassword: 'owner', userPermissions: ['print'] } });
  doc.text('Confidential: Sarah Connor', 72, 72);
  return doc.output('arraybuffer');
}
write('locked.pdf', lockedPdf());

// ── Unsupported ──────────────────────────────────────────────────────────────
const ole = new Uint8Array(1024);
ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
write('old-format.doc', ole);
