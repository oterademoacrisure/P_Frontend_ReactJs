// Renders pre-built HTML (tables/headings/lists) produced by
// src/utils/textRenderers.js. Every value inside that HTML has already
// been passed through escapeHtml(), so this is safe to inject directly --
// it is structured markup derived from plain text, not raw user HTML.
export default function OutputRenderer({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
