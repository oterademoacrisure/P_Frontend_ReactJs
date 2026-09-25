import { escapeHtml, renderMultiFormatOutputForWord } from './textRenderers.js';

export function downloadWord(lastGenerated) {
  if (!lastGenerated) return;

  const titleSafe = escapeHtml(lastGenerated.title);
  const bodyHtml = renderMultiFormatOutputForWord(lastGenerated.text);
  const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset="utf-8"><title>${titleSafe}</title>
      <style>
        @page{ margin:1in; }
        body{ font-family:Aptos, Calibri, sans-serif; font-size:9.5pt; color:#111827; }
      </style>
      </head>
      <body>
        <h1 style="font-family:'Aptos Display',Calibri,sans-serif;font-size:20pt;font-weight:bold;color:#183A59;border-bottom:1pt solid #4F81BD;padding-bottom:6pt;margin-bottom:14pt;">${titleSafe}</h1>
        ${bodyHtml}
      </body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${lastGenerated.title.replace(/[^a-z0-9]+/gi, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
