import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import OutputRenderer from './OutputRenderer.jsx';

// Dedicated, always-available routes for browsing the 3 sample templates --
// each opens its own full page (with a Back button) rather than swapping
// this panel's content, so a template preview is never mistaken for a real
// generated document.
const TEMPLATE_LINKS = [
  { path: '/STTM_Template', label: 'STTM Template' },
  { path: '/FRD_Template', label: 'FRD Template' },
  { path: '/Agile_Artifact_Template', label: 'Agile Artifact Template' },
];

// The backend doesn't report an overall percent -- these are the known
// pipeline stages (guardrail -> retrieval -> drafting -> groundedness ->
// finalize, see README's "Live progress during generation"). Each incoming
// progress message is matched against these keywords to estimate how far
// through the run we are; the highest stage reached so far is kept even if a
// later message (e.g. a retry re-drafting) doesn't advance it further.
const PROGRESS_STAGES = [
  { label: 'Guardrail check', match: /guardrail|safety/i },
  { label: 'Retrieval', match: /retriev|search|knowledge base/i },
  { label: 'Drafting', match: /draft|writing|generat/i },
  { label: 'Groundedness check', match: /ground|verify|validat/i },
  { label: 'Finalizing', match: /final|assemb|complete/i },
];

function estimateProgress(progressLog) {
  if (progressLog.length === 0) return { percent: 6, label: 'Starting…', step: null };

  let stageIndex = -1;
  for (const item of progressLog) {
    for (let i = 0; i < PROGRESS_STAGES.length; i++) {
      if (i > stageIndex && PROGRESS_STAGES[i].match.test(item.text)) stageIndex = i;
    }
  }

  const label = progressLog[progressLog.length - 1].text;
  if (stageIndex === -1) {
    // No message matched a known stage keyword -- ease the bar forward by
    // log length instead of leaving it frozen at the starting sliver.
    return { percent: Math.min(90, 10 + progressLog.length * 8), label, step: null };
  }
  return {
    percent: Math.round(((stageIndex + 1) / PROGRESS_STAGES.length) * 100),
    label,
    step: stageIndex + 1,
    total: PROGRESS_STAGES.length,
  };
}

export default function OutputPanel({
  statusText,
  statusLive,
  mode, // 'placeholder' | 'generating' | 'generated' | 'error'
  progressLog, // [{ id, text }] -- one entry per backend progress event, oldest first
  placeholderText,
  slides, // [{ key, label, html }]
  errorMessage,
  canDownload,
  onDownloadExcel,
  onDownloadWord,
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const frameRef = useRef(null);

  // A fresh document replaces the slides array -- jump back to the first
  // tab instead of preserving whatever index was active before.
  useEffect(() => {
    setActiveSlide(0);
  }, [slides]);

  // Keep the newest progress line in view as the log grows during a run.
  useEffect(() => {
    if (mode === 'generating' && frameRef.current) {
      frameRef.current.scrollTop = frameRef.current.scrollHeight;
    }
  }, [progressLog, mode]);

  const showSlides = mode === 'generated' && slides.length > 0;
  const current = showSlides ? slides[Math.min(activeSlide, slides.length - 1)] : null;
  // One Download button, no format picker -- STTM is inherently tabular
  // (a field-mapping table), so it exports as Excel; FRD and the Agile
  // Artifact are narrative documents, so they export as Word. Whichever
  // tab is currently active decides which one a click produces.
  const activeIsExcelFormat = current?.key === 'sttm';

  return (
    <div className="section">
      <div className="section-head">
        <h2>Review &amp; export</h2>
        <div className="template-btn-row">
          {TEMPLATE_LINKS.map((t) => (
            <Link key={t.path} to={t.path} className="btn ghost small">
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="section-body">
        <div className="status-line">
          <span className={`dot${statusLive ? ' live' : ''}`}></span>
          <span>{statusText}</span>
        </div>

        {showSlides && slides.length > 1 && (
          <div className="output-slider-tabs">
            <button
              type="button"
              className="slider-nav"
              aria-label="Previous document"
              onClick={() => setActiveSlide((i) => (i - 1 + slides.length) % slides.length)}
            >
              &#8249;
            </button>
            <div className="slider-tab-row">
              {slides.map((s, idx) => (
                <button
                  key={s.key}
                  type="button"
                  className={`slider-tab${idx === activeSlide ? ' active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="slider-nav"
              aria-label="Next document"
              onClick={() => setActiveSlide((i) => (i + 1) % slides.length)}
            >
              &#8250;
            </button>
          </div>
        )}

        <div
          ref={frameRef}
          className={`output-frame${mode === 'generated' ? ' rendered' : ''}${
            showSlides && slides.length > 1 ? ' has-slider' : ''
          }`}
        >
          {mode === 'placeholder' && <span className="placeholder">{placeholderText}</span>}

          {mode === 'generating' &&
            (() => {
              const { percent, label, step, total } = estimateProgress(progressLog);
              return (
                <div className="progress-bar-wrap">
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
                  </div>
                  <div className="progress-bar-meta">
                    <span className="progress-bar-label">
                      <span className="spinner"></span>
                      <span>{label}</span>
                    </span>
                    {step && (
                      <span className="progress-bar-step">
                        {step} / {total}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

          {mode === 'error' && (
            <span className="placeholder" style={{ color: 'var(--danger)' }}>
              {`Backend Error Exception:\n${errorMessage}`}
            </span>
          )}

          {showSlides && slides.length > 1 && (
            <div
              className="slider-track"
              style={{ width: `${slides.length * 100}%`, transform: `translateX(-${activeSlide * (100 / slides.length)}%)` }}
            >
              {slides.map((s) => (
                <div className="slider-pane" style={{ width: `${100 / slides.length}%` }} key={s.key}>
                  <OutputRenderer html={s.html} />
                </div>
              ))}
            </div>
          )}

          {showSlides && slides.length === 1 && <OutputRenderer html={current.html} />}
        </div>

        <div className="btnrow">
          <button
            type="button"
            className={`btn ghost small${canDownload ? '' : ' disabled'}`}
            disabled={!canDownload}
            onClick={activeIsExcelFormat ? onDownloadExcel : onDownloadWord}
          >
            <span className="icon-arrow" style={{ background: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </span>
            <span>{activeIsExcelFormat ? 'Download Excel' : 'Download Word Document'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
