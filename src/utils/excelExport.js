import * as XLSX from 'xlsx-js-style';
import { dedupeAdjacentPipeRows } from './textRenderers.js';

// Splits the text into sections on "## N. Title" headings (e.g. "## 1. STTM
// Summary"), then puts each section on its own sheet instead of one flat
// "Output" sheet.
export function downloadExcel(lastGenerated) {
  if (!lastGenerated) return;

  const text = lastGenerated.text;
  const sectionRegex = /^##\s*\d+\.\s*(.+)$/gm;
  const sections = [];
  let match;
  let lastIndex = 0;
  let lastTitle = null;

  while ((match = sectionRegex.exec(text)) !== null) {
    if (lastTitle !== null) {
      sections.push({ title: lastTitle, body: text.slice(lastIndex, match.index) });
    }
    lastTitle = match[1].trim();
    lastIndex = sectionRegex.lastIndex;
  }
  if (lastTitle !== null) {
    sections.push({ title: lastTitle, body: text.slice(lastIndex) });
  }
  if (sections.length === 0) {
    // No "## N. ..." headings found -- fall back to a single sheet.
    sections.push({ title: 'Output', body: text });
  }

  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  // Header row (row 1): dark navy fill + bold white text -- matches the
  // reference STTM workbook's header style exactly.
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '003366' } },
    alignment: { wrapText: true, vertical: 'center' },
    border: thinBorder,
  };

  // Left-hand "label" column (column A, every data row): light-blue fill +
  // bold black text -- matches the reference workbook's Attribute/Type/
  // Review-Area column styling.
  const labelColStyle = {
    font: { bold: true, color: { rgb: '000000' } },
    fill: { fgColor: { rgb: 'D9E1F2' } },
    alignment: { wrapText: true, vertical: 'top' },
    border: thinBorder,
  };

  const wb = XLSX.utils.book_new();
  sections.forEach(({ title, body }) => {
    const lines = body.split('\n').filter((l) => l.trim() !== '');
    const rows = dedupeAdjacentPipeRows(
      lines.map((line) => (line.includes('|') ? line.split('|').map((cell) => cell.trim()) : [line]))
    );
    const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [['(no content)']]);
    ws['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 26 }, { wch: 26 }, { wch: 46 }];

    const range = XLSX.utils.decode_range(ws['!ref']);

    // Row 1 -> header style, every column.
    for (let col = range.s.c; col <= range.e.c; col++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = headerStyle;
    }

    // Column A, every row AFTER the header -> label style.
    for (let row = 1; row <= range.e.r; row++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: 0 });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      ws[addr].s = labelColStyle;
    }

    // Excel sheet names: max 31 chars, no \ / ? * [ ]
    const safeName = title.replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  XLSX.writeFile(wb, `${lastGenerated.title.replace(/[^a-z0-9]+/gi, '_')}.xlsx`);
}
