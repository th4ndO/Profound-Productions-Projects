import { type ParseContext, type ParseOutput, RecordSink, decodeText } from './common';

const BULLET = /^\s*(?:[-*+•·▪◦‣]|\d{1,3}[.)])\s+/;
const MD_HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

interface Block {
  line: number; // 1-based line of the block's first line
  text: string;
}

/**
 * Plain text, Markdown and logs. Blocks are separated by blank lines; a file
 * with no blank lines, or a block made only of bullet lines, is split line by
 * line. Markdown headings become the group, like sections in a Word document.
 */
export function parseText(buf: ArrayBuffer, ctx: ParseContext): ParseOutput {
  const lines = decodeText(buf).replace(/^﻿/, '').split(/\r\n|\r|\n/);
  const sink = new RecordSink(ctx);
  const isMarkdown = /\.(md|markdown)$/i.test(ctx.fileName);
  const hasBlank = lines.some((l) => l.trim() === '');

  let heading: string | null = null;
  let headings = 0;
  let paragraph = 0;
  const emit = (b: Block) => {
    paragraph += 1;
    const where = hasBlank ? `Paragraph ${paragraph} (line ${b.line})` : `Line ${b.line}`;
    const group = heading ?? (hasBlank ? `Paragraph ${paragraph}` : `Line ${b.line}`);
    sink.text(group, heading ? `${heading}, ${where.charAt(0).toLowerCase()}${where.slice(1)}` : where, b.text);
  };

  let current: { line: number; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const allBullets = current.lines.every((l) => BULLET.test(l));
    if (!hasBlank || (allBullets && current.lines.length > 1)) {
      current.lines.forEach((l, i) => emit({ line: current!.line + i, text: l }));
    } else {
      emit({ line: current.line, text: current.lines.map((l) => l.trim()).join('\n') });
    }
    current = null;
  };

  lines.forEach((line, i) => {
    const h = isMarkdown ? MD_HEADING.exec(line) : null;
    if (h) {
      flush();
      heading = h[2].trim();
      headings += 1;
      paragraph = 0;
      sink.text(heading, `${heading}, heading (line ${i + 1})`, heading);
      return;
    }
    if (line.trim() === '') {
      flush();
      return;
    }
    if (!current) current = { line: i + 1, lines: [] };
    current.lines.push(line);
    if (!hasBlank) flush();
  });
  flush();
  ctx.progress(1);

  return {
    records: sink.records,
    warnings: sink.records.length ? [] : ['This file has no text to search.'],
    unit: headings ? { one: 'section', many: 'sections' } : { one: 'paragraph', many: 'paragraphs' },
  };
}
