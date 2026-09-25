// ===================================================================
// STRUCTURED OUTPUT RENDERING
//
// The backend returns plain text in one of two shapes:
//   - STTM-style: "## N. Section Title" headings followed by pipe-delimited
//     rows (first row = column headers, e.g. "Attribute|Detail").
//   - Narrative documents (FRD / Agile Artifact): a title line, optional
//     "Project:"/"Date:" metadata, "---" dividers, "N. Section" or
//     "FR-001: Title" headings (markdown "#"-prefixed or plain), "- bullet"
//     / "a) bullet" lists, plain paragraphs, optionally embedded GFM pipe
//     tables (e.g. a Stakeholders table), and an "End of Document" marker.
//
// These functions turn either shape into real HTML markup (tables/headings/
// lists instead of a raw text dump). They return HTML strings rather than
// JSX because the same parsing also feeds the Word-export path, which
// needs a literal HTML document string for the downloaded .doc file. The
// on-screen <OutputRenderer> component renders the string via
// dangerouslySetInnerHTML -- safe here because every value is escaped
// through escapeHtml() below before being concatenated in.
// ===================================================================

// The model has no reliable notion of "today" and tends to copy a static
// example date from its grounding sources into the STTM Summary's
// "Version / Date" row instead (e.g. always "1.0 / 2024-06-01") -- replace
// just the date portion with the real current date so the exported document
// doesn't carry stale, misleading metadata. Runs once on the raw text right
// after it's received from the backend, before it's split into slides or
// handed to the Excel/Word exporters, so all three consumers see the fix.
const VERSION_DATE_ROW_RE = /^(Version\s*\/\s*Date\|)(.*)$/gim;
const ISO_DATE_RE = /\d{4}-\d{2}-\d{2}/;
export function stampCurrentDate(text) {
  const today = new Date().toISOString().slice(0, 10);
  return text.replace(VERSION_DATE_ROW_RE, (_full, label, value) => {
    if (ISO_DATE_RE.test(value)) return label + value.replace(ISO_DATE_RE, today);
    const version = value.split('/')[0].trim() || '1.0';
    return `${label}${version} / ${today}`;
  });
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// GFM tables put a "|---|---|" alignment row right after the header --
// detect and drop it rather than rendering it as a data row.
export function isSeparatorRow(l) {
  return l.replace(/[|:\-\s]/g, '') === '' && l.includes('-');
}

// Splits a pipe-delimited row into cells. Handles both bare "a|b|c" rows
// (STTM-style, no surrounding pipes) and GFM-style "| a | b | c |" rows.
export function splitPipeRow(line) {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map((c) => c.trim());
}

// The backend occasionally repeats a mapping row back-to-back under a new
// sequential ID (e.g. M-015 and M-016 both "Status101 / Status indicator
// for claim processing state") when asked to add a single new column --
// collapse that down to one row by dropping a row whose cells after the
// first (ID) column exactly match the row directly above it.
export function dedupeAdjacentPipeRows(rows) {
  const out = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    const sameAsPrev = prev && r.length > 1 && prev.length === r.length && JSON.stringify(r.slice(1)) === JSON.stringify(prev.slice(1));
    if (sameAsPrev) continue;
    out.push(r);
  }
  return out;
}

function renderPipeTable(lines) {
  const rows = dedupeAdjacentPipeRows(lines.filter((l) => !isSeparatorRow(l.trim())).map(splitPipeRow));
  const headerRow = rows[0];
  const bodyRows = rows.slice(1);
  let html = '<div class="otbl-wrap"><table class="otbl"><thead><tr>';
  headerRow.forEach((h) => {
    html += `<th>${escapeHtml(h)}</th>`;
  });
  html += '</tr></thead><tbody>';
  bodyRows.forEach((r) => {
    html += '<tr>';
    for (let c = 0; c < headerRow.length; c++) {
      html += `<td>${escapeHtml(r[c] ?? '')}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

export function renderStructuredText(text) {
  const lines = text.split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const headingMatch = line.match(/^##\s*\d+\.\s*(.+)$/);
    if (headingMatch) {
      html += `<h3 class="otbl-heading">${escapeHtml(headingMatch[1].trim())}</h3>`;
      i++;
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.includes('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        tableLines.push(lines[i]);
        i++;
      }
      html += renderPipeTable(tableLines);
      continue;
    }
    html += `<p class="otbl-text">${escapeHtml(line)}</p>`;
    i++;
  }
  return html;
}

// ===================================================================
// WORD EXPORT RENDERING
// Same parsing as the on-screen renderers, emitting Word-compatible markup
// styled to match the enterprise reference doc (Healthcare_Payer_Data_
// Reporting_PI_Enterprise_Instruction_Document.docx): Aptos body font,
// navy #183A59 table headers with white bold text, #CBD5E1 thin borders,
// #1F4E79 / #0B6B57 heading colors.
// ===================================================================
function wordPipeTable(lines) {
  const rows = lines.filter((l) => !isSeparatorRow(l.trim())).map(splitPipeRow);
  const headerRow = rows[0];
  const bodyRows = rows.slice(1);
  const baseCell =
    'border:1px solid #CBD5E1;padding:6px 8px;font-family:Aptos,Calibri,sans-serif;font-size:9pt;vertical-align:top;';
  const headerCell = baseCell + 'background:#183A59;color:#FFFFFF;font-weight:bold;';
  let html = '<table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;margin:0 0 16pt;">';
  html += '<tr>';
  headerRow.forEach((h) => {
    html += `<td style="${headerCell}">${escapeHtml(h)}</td>`;
  });
  html += '</tr>';
  bodyRows.forEach((r, ri) => {
    const bodyCell = baseCell + 'color:#111827;' + (ri % 2 === 1 ? 'background:#F3F6F9;' : '');
    html += '<tr>';
    for (let c = 0; c < headerRow.length; c++) {
      html += `<td style="${bodyCell}">${escapeHtml(r[c] ?? '')}</td>`;
    }
    html += '</tr>';
  });
  html += '</table>';
  return html;
}

export function renderStructuredTextForWord(text) {
  const lines = text.split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const headingMatch = line.match(/^##\s*\d+\.\s*(.+)$/);
    if (headingMatch) {
      html += `<h3 style="font-family:'Aptos Display',Calibri,sans-serif;font-size:14pt;font-weight:bold;color:#1F4E79;margin:16pt 0 6pt;">${escapeHtml(headingMatch[1].trim())}</h3>`;
      i++;
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.includes('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        tableLines.push(lines[i]);
        i++;
      }
      html += wordPipeTable(tableLines);
      continue;
    }
    html += `<p style="font-family:Aptos,Calibri,sans-serif;font-size:9.5pt;color:#111827;">${escapeHtml(line)}</p>`;
    i++;
  }
  return html;
}

// ===================================================================
// NARRATIVE DOCUMENT PARSING (FRD / Agile Artifact)
// Handles: a title line, "Project:"/"Date:" metadata, "---" dividers,
// markdown "#"-prefixed or plain "N. Section" headings, "FR-001: Title"
// requirement headings, "- bullet" / "a) bullet" lists, embedded GFM pipe
// tables, plain paragraphs, and "End of Document".
// ===================================================================
function formatBulletText(text) {
  const m = text.match(/^([A-Za-z][A-Za-z0-9 /_-]{1,58}):\s+(.+)$/);
  if (m) return `<strong>${escapeHtml(m[1])}:</strong> ${escapeHtml(m[2])}`;
  return escapeHtml(text);
}

function parseDocStructure(text) {
  // Returns an array of typed blocks so both the on-screen renderer and
  // the Word-export renderer can share one parse of the same text.
  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  let titleSeen = false;
  const bulletRe = /^[-*]\s+(.+)$/;
  const letterBulletRe = /^[a-z]\)\s+(.+)$/;
  const sectionRe = /^\d+\.\s+(.+)$/;
  // Colon optional, 1-4 digit ID -- matches both "FR-001: Title" and the
  // Feature Template's colon-less "KC-1 Title" / "AC-1 Title" headings.
  const reqIdRe = /^([A-Z]{2,5}-\d{1,4}):?\s+(.+)$/;
  const metaRe = /^(Project|Date):\s*(.+)$/i;
  const dividerRe = /^-{3,}$/;
  const gherkinRe = /^(Feature|Background|Scenario(?:\s+Outline)?|Given|When|Then|And|But)\b[:\s]*(.*)$/i;

  while (i < lines.length) {
    let line = lines[i].trim();
    if (line === '') {
      i++;
      continue;
    }

    // Normalize markdown ATX heading prefixes ("### 2. Title" -> "2. Title")
    // so the same section/requirement patterns match regardless of how
    // many '#' the backend used. Keep the hash count -- a heading whose
    // text matches neither the numbered-section nor the ID pattern (e.g.
    // "## Key Capabilities") still needs to render as a heading, not fall
    // through to a plain paragraph.
    const hashMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const hashCount = hashMatch ? hashMatch[1].length : 0;
    if (hashMatch) line = hashMatch[2];

    if (dividerRe.test(line)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }
    if (/^end of document$/i.test(line)) {
      blocks.push({ type: 'end' });
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (!l.startsWith('|')) break;
        if (!isSeparatorRow(l)) tableLines.push(l);
        i++;
      }
      if (tableLines.length) blocks.push({ type: 'table', lines: tableLines });
      continue;
    }

    // The backend occasionally emits a stray marker glyph (a checkbox,
    // bullet, or similar symbol) alone on its own line ahead of the real
    // "- field name" bullet below it. Such a line has no letters or digits
    // at all -- treat it as noise and drop it rather than rendering an
    // empty paragraph that shows as an unsupported-character box.
    if (!/[\p{L}\p{N}]/u.test(line)) {
      i++;
      continue;
    }

    if (!titleSeen) {
      blocks.push({ type: 'title', text: line });
      titleSeen = true;
      i++;
      continue;
    }

    if (metaRe.test(line)) {
      const meta = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l === '') {
          i++;
          continue;
        }
        const mm = l.match(metaRe);
        if (!mm) break;
        meta.push([mm[1], mm[2]]);
        i++;
      }
      blocks.push({ type: 'meta', items: meta });
      continue;
    }

    const sectionMatch = line.match(sectionRe);
    if (sectionMatch) {
      blocks.push({ type: 'h2', text: line });
      i++;
      continue;
    }

    const reqMatch = line.match(reqIdRe);
    if (reqMatch) {
      blocks.push({ type: 'h3', id: reqMatch[1], text: reqMatch[2] });
      i++;
      continue;
    }

    if (hashCount > 0) {
      // A markdown heading whose text didn't match a more specific pattern
      // above -- still render it as a heading (level from hash count)
      // instead of silently downgrading it to a plain paragraph.
      blocks.push({ type: hashCount <= 2 ? 'h2' : 'h3', text: line });
      i++;
      continue;
    }

    const gherkinMatch = line.match(gherkinRe);
    if (gherkinMatch) {
      const items = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l === '') {
          i++;
          continue;
        }
        const gm = l.match(gherkinRe);
        if (!gm) break;
        items.push({ keyword: gm[1].replace(/\s+/g, ' '), rest: gm[2].trim() });
        i++;
      }
      blocks.push({ type: 'gherkin', items });
      continue;
    }

    if (bulletRe.test(line) || letterBulletRe.test(line)) {
      const items = [];
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l === '') {
          i++;
          continue;
        }
        const bm = l.match(bulletRe);
        const lm = l.match(letterBulletRe);
        if (bm) {
          items.push(bm[1]);
          i++;
          continue;
        }
        if (lm) {
          items.push(lm[1]);
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    blocks.push({ type: 'p', text: line });
    i++;
  }
  return blocks;
}

export function renderDocText(text) {
  const blocks = parseDocStructure(text);
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'title':
          return `<h1 class="doc-title">${escapeHtml(b.text)}</h1>`;
        case 'meta':
          return `<p class="doc-meta">${b.items
            .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`)
            .join(' &nbsp;·&nbsp; ')}</p>`;
        case 'divider':
          return '<hr class="otbl-divider">';
        case 'table':
          return renderPipeTable(b.lines);
        case 'h2':
          return `<h2 class="doc-h2">${escapeHtml(b.text)}</h2>`;
        case 'h3':
          return `<h3 class="doc-h3">${b.id ? `<span class="doc-id">${escapeHtml(b.id)}</span>` : ''}${escapeHtml(b.text)}</h3>`;
        case 'list':
          return `<ul class="doc-list">${b.items.map((it) => `<li>${formatBulletText(it)}</li>`).join('\n')}</ul>`;
        case 'gherkin':
          return `<div class="doc-gherkin">${b.items
            .map((it) => {
              const kw = `<span class="doc-gherkin-kw">${escapeHtml(it.keyword)}</span> ${escapeHtml(it.rest)}`;
              // Only "Scenario"/"Scenario Outline" lines get a checkbox -- the
              // steps under them (Given/When/Then/And/But) are just the
              // scenario's body, not independently selectable.
              if (/^Scenario/i.test(it.keyword)) {
                return `<label class="doc-gherkin-line doc-scenario-check"><input type="checkbox">${kw}</label>`;
              }
              return `<div class="doc-gherkin-line">${kw}</div>`;
            })
            .join('\n')}</div>`;
        case 'end':
          return '<p class="doc-end">— End of Document —</p>';
        default:
          return `<p class="doc-p">${escapeHtml(b.text)}</p>`;
      }
    })
    .join('\n') ;
}

export function renderDocTextForWord(text) {
  const blocks = parseDocStructure(text);
  const pStyle = 'font-family:Aptos,Calibri,sans-serif;font-size:9.5pt;color:#111827;line-height:1.5;margin:0 0 8pt;';
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'title':
          return `<h1 style="font-family:'Aptos Display',Calibri,sans-serif;font-size:18pt;font-weight:bold;color:#183A59;border-bottom:1pt solid #4F81BD;padding-bottom:6pt;margin:0 0 6pt;">${escapeHtml(b.text)}</h1>`;
        case 'meta':
          return `<p style="font-family:Aptos,Calibri,sans-serif;font-size:9pt;color:#595959;margin:0 0 14pt;">${b.items
            .map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`)
            .join(' &nbsp;&middot;&nbsp; ')}</p>`;
        case 'divider':
          return '<hr style="border:none;border-top:1pt solid #CBD5E1;margin:18pt 0;">';
        case 'table':
          return wordPipeTable(b.lines);
        case 'h2':
          return `<h2 style="font-family:'Aptos Display',Calibri,sans-serif;font-size:13pt;font-weight:bold;color:#1F4E79;margin:18pt 0 8pt;">${escapeHtml(b.text)}</h2>`;
        case 'h3': {
          const badge = b.id
            ? `<span style="background:#0B6B57;color:#FFFFFF;border-radius:3pt;padding:1pt 5pt;font-size:8pt;margin-right:6pt;">${escapeHtml(b.id)}</span>`
            : '';
          return `<h3 style="font-family:'Aptos Display',Calibri,sans-serif;font-size:10.5pt;font-weight:bold;color:#0B6B57;margin:12pt 0 4pt;">${badge}${escapeHtml(b.text)}</h3>`;
        }
        case 'list':
          return `<ul style="margin:0 0 10pt;padding-left:18pt;">${b.items
            .map((it) => `<li style="${pStyle}margin-bottom:4pt;">${formatBulletText(it)}</li>`)
            .join('')}</ul>`;
        case 'gherkin':
          return `<div style="background:#F3F6F9;border:1pt solid #CBD5E1;border-radius:4pt;padding:8pt 12pt;margin:0 0 12pt;font-family:'Courier New',Consolas,monospace;font-size:9pt;color:#111827;">${b.items
            .map(
              (it) =>
                `<div style="margin-bottom:3pt;"><span style="color:#1E728C;font-weight:bold;">${escapeHtml(it.keyword)}</span> ${escapeHtml(it.rest)}</div>`
            )
            .join('')}</div>`;
        case 'end':
          return '<p style="text-align:center;font-family:Aptos,Calibri,sans-serif;font-size:9pt;font-style:italic;color:#595959;margin-top:16pt;">— End of Document —</p>';
        default:
          return `<p style="${pStyle}">${escapeHtml(b.text)}</p>`;
      }
    })
    .join('');
}

// Detects whether a chunk of generated text is STTM-style ("## N. Title"
// headings + pipe rows) or a narrative document (FRD / Agile Artifact),
// and renders it with the matching renderer.
export function renderAnyFormatText(text) {
  return /^##\s*\d+\.\s.+$/m.test(text) && /\|/.test(text) ? renderStructuredText(text) : renderDocText(text);
}
export function renderAnyFormatTextForWord(text) {
  return /^##\s*\d+\.\s.+$/m.test(text) && /\|/.test(text)
    ? renderStructuredTextForWord(text)
    : renderDocTextForWord(text);
}

// Separates multiple formats' output within a single backend response --
// must match the divider used to join them in api.js.
export const MULTI_FORMAT_DIVIDER = '\n\n' + '='.repeat(70) + '\n\n';

// A generateViaBackend() response may bundle several formats' output
// separated by MULTI_FORMAT_DIVIDER -- split back apart and render each
// chunk with whichever renderer matches its own shape.
export function renderMultiFormatOutput(text) {
  return text.split(MULTI_FORMAT_DIVIDER).map(renderAnyFormatText).join('<hr class="otbl-divider">');
}

// Same split as renderMultiFormatOutput, but keeps each format's rendered
// HTML as a separate array entry (in the same order as the `formats` array
// passed to generateViaBackend) instead of concatenating them -- lets the
// UI show one format at a time in a slider instead of stacking them.
export function renderMultiFormatOutputChunks(text) {
  return text.split(MULTI_FORMAT_DIVIDER).map(renderAnyFormatText);
}
export function renderMultiFormatOutputForWord(text) {
  return text
    .split(MULTI_FORMAT_DIVIDER)
    .map(renderAnyFormatTextForWord)
    .join('<hr style="border:none;border-top:1pt solid #CBD5E1;margin:20pt 0;">');
}
