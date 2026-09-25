import { useRef } from 'react';

const FORMAT_OPTIONS = [
  { value: 'gherkin', label: 'Agile Artifact', title: null },
  { value: 'frd', label: 'FRD', title: 'Functional Requirements Document' },
  { value: 'sttm', label: 'STTM', title: 'Source-to-Target Mapping' },
];

// Common, high-value instruction examples -- surfaced as a dropdown next to
// the textarea's label since there's no spare vertical space to list them
// inline. Picking one fills the textarea via onPromptChange.
const EXAMPLE_INSTRUCTIONS = [
  'Create STTM for the attached vendor file layout',
  'Create FRD for the attached vendor file layout',
  'Create Agile Artifact for the attached vendor file layout',
  'Create STTM, FRD and Agile Artifact for the attached vendor file layout',
  'Add a column named status101 with values Approved, Rejected and Pending',
  "Map the source file's claim_id field to the target table's ClaimNumber",
  'Add a validation rule: reject rows where PaidAmount is negative',
  'Generate acceptance criteria for duplicate claim detection',
  'Flag overpayments greater than $10,000 for manual review',
  'Rename the target field CustomerID to MemberID and update all references',
];

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function RequestForm({
  formats,
  onToggleFormat,
  files,
  onAddFiles,
  onRemoveFile,
  prompt,
  onPromptChange,
  projectName,
  onProjectNameChange,
  onSubmit,
  errors,
  generating,
  sessionActive,
  onStartNew,
  username,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="section section-request">
      <div className="section-head">
        <h2>User: {username}</h2>
      </div>
      <div className="section-body">
        {sessionActive && (
          <div className="session-banner">
            <span>
              Continuing the current session — new instructions refine the same document. Check another format
              anytime to add it to this session too.
            </span>
          </div>
        )}

        <div className={`field${errors.format ? ' invalid' : ''}`}>
          <label className="f-label">
            Output format <span className="req">*</span>
          </label>
          <div className="format-options" role="group" aria-label="Output format">
            {FORMAT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`format-radio${formats.includes(opt.value) ? ' selected' : ''}`}
              >
                <input
                  type="checkbox"
                  className="format-input"
                  value={opt.value}
                  checked={formats.includes(opt.value)}
                  onChange={() => onToggleFormat(opt.value)}
                />
                <span className="radio-dot"></span>
                <span className="radio-text" title={opt.title || undefined}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          <div className="field-error">
            <span aria-hidden="true">⚠</span>
            <span>Please select at least one output format.</span>
          </div>
        </div>

        <div className={`field${errors.files ? ' invalid' : ''}`}>
          <label className="f-label">
            Source files {sessionActive ? <span className="opt">(optional — adds to the session's files)</span> : <span className="req">*</span>}
          </label>
          <div className="upload-row">
            <button type="button" className="btn ghost small" onClick={() => fileInputRef.current?.click()}>
              <span className="icon-arrow" style={{ background: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </span>
              Upload
            </button>
            <span className="upload-caption">
              Sample files: PDF, XLSX, TXT &nbsp;·&nbsp; <b>No PHI/PII</b>
            </span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            hidden
            onChange={(e) => {
              onAddFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="filelist">
            {files.map((f, i) => (
              <div className="filechip" key={`${f.name}-${f.size}-${i}`}>
                <span className="fname">{f.name}</span>
                <span className="fsize">{formatBytes(f.size)}</span>
                <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemoveFile(i)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="field-error">
            <span aria-hidden="true">⚠</span>
            <span>Please attach at least one file.</span>
          </div>
        </div>

        <div className={`field${errors.prompt ? ' invalid' : ''}`}>
          <label className="f-label" htmlFor="prompt">
            Instructions to the agent <span className="req">*</span>
          </label>
          <textarea
            id="prompt"
            placeholder='e.g. Create STTM for the attached vendor file layout'
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
          />
          {/* Insert example dropdown - hidden per request, keep for possible future re-enable
          <select
            className="example-select"
            aria-label="Insert an example instruction"
            value=""
            onChange={(e) => {
              if (e.target.value) onPromptChange(e.target.value);
            }}
          >
            <option value="" disabled>
              Insert example…
            </option>
            {EXAMPLE_INSTRUCTIONS.map((ex, i) => (
              <option key={i} value={ex}>
                {ex}
              </option>
            ))}
          </select>
          */}
          <div className="field-error">
            <span aria-hidden="true">⚠</span>
            <span>Please add instructions for the agent.</span>
          </div>
        </div>

        <div className="field">
          <label className="f-label" htmlFor="projectName">
            Project name <span className="opt">(optional)</span>
          </label>
          <input
            type="text"
            id="projectName"
            placeholder="e.g. Duplicate Claims Overpayment Detection"
            value={projectName}
            disabled={sessionActive}
            onChange={(e) => onProjectNameChange(e.target.value)}
          />
        </div>

        <div className="btnrow">
          <button className="btn submit" onClick={onSubmit} disabled={generating}>
            {sessionActive ? 'Refine' : 'Submit'}
          </button>
          <button type="button" className="btn ghost small" onClick={onStartNew} disabled={generating || !sessionActive}>
            Start a new chat
          </button>
        </div>
      </div>
    </div>
  );
}
