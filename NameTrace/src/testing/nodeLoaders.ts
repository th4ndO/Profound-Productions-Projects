// Library loaders for running parsers under Node (tests and scripts only).
import type { Loaders } from '../parse/dispatch';

export const nodeLoaders: Loaders = {
  async pdfjs() {
    const lib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return { lib, options: { verbosity: 0 } };
  },
  async xlsx() {
    return await import('xlsx');
  },
  async mammoth() {
    const m = (await import('mammoth')).default;
    return {
      convertToHtml: ({ arrayBuffer }) => m.convertToHtml({ buffer: Buffer.from(arrayBuffer) }),
    };
  },
};
