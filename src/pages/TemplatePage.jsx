import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import OutputRenderer from '../components/OutputRenderer.jsx';
import { renderStructuredText, renderDocText } from '../utils/textRenderers.js';
import { TEMPLATE_PREVIEW_META } from '../data/samples.js';

// Full-page, read-only view of one sample template (STTM / FRD / Agile
// Artifact). Lives on its own route so browsing a template never mixes
// with the "Review & export" panel, which only appears after a real
// Submit -- see App.jsx's routing and OutputPanel's placeholder guard.
export default function TemplatePage({ templateKey, username, onLogout }) {
  const navigate = useNavigate();
  const entry = TEMPLATE_PREVIEW_META[templateKey];
  const html = entry ? (entry.kind === 'sttm' ? renderStructuredText(entry.text) : renderDocText(entry.text)) : '';

  return (
    <div className="wrap">
      <Header username={username} onLogout={onLogout} />

      <div className="section">
        <div className="section-head">
          <h2>{entry ? entry.label : 'Template'}</h2>
          <button type="button" className="btn ghost small" onClick={() => navigate('/')}>
            &#8249; Back
          </button>
        </div>
        <div className="section-body">
          <div className="output-frame rendered">
            {entry ? (
              <>
                <span className="otbl-preview-tag">Template preview — {entry.label}</span>
                <p className="otbl-caption">
                  Example output — fill in the form and click &quot;Submit&quot; to generate your own document.
                </p>
                <OutputRenderer html={html} />
              </>
            ) : (
              <span className="placeholder">No template preview available yet.</span>
            )}
          </div>
        </div>
      </div>

      <footer className="hint">Draft outputs are generated for review — verify against source material before distribution.</footer>
    </div>
  );
}
