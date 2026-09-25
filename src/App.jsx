import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import LoginPage from './components/LoginPage.jsx';
import RequestForm from './components/RequestForm.jsx';
import OutputPanel from './components/OutputPanel.jsx';
import TemplatePage from './pages/TemplatePage.jsx';
import { generateViaBackend, refineViaBackend, loginViaBackend } from './utils/api.js';
import { renderMultiFormatOutputChunks, stampCurrentDate } from './utils/textRenderers.js';
import { downloadExcel } from './utils/excelExport.js';
import { downloadWord } from './utils/wordExport.js';

const IDLE_TEXT =
  'Your generated document will show up here. Fill in the form on the left and click "Submit" to get started — nothing is sent until then.';

const formatLabels = {
  gherkin: 'Agile Artifact',
  frd: 'FRD',
  sttm: 'STTM',
};

// Fixed left-to-right slide order in the "Review & export" panel --
// independent of the order the checkboxes were clicked in.
const FORMAT_ORDER = ['gherkin', 'frd', 'sttm'];

// Shown in place of a format's document when the backend reports that
// format's status as "rejected" -- either Prompt Shields flagged the
// instruction/an uploaded file (reject_node), or Azure OpenAI's own content
// filter flagged the drafting prompt (content_blocked_node); current_draft
// was never populated either way. `message` is the backend's actual
// PayerIQState.feedback text for this format (data.messages[format] from
// toResult) -- the two reasons above read differently, so this shows
// whichever one actually fired instead of a single generic guess. Escaped
// before interpolation since this now renders backend-sourced text (not a
// static literal) through OutputRenderer's dangerouslySetInnerHTML.
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function blockedSlideHtml(message) {
  const safeMessage = escapeHtml(
    message ||
      'The safety guardrail flagged this instruction (or an uploaded file), so no document was generated for this format. Revise the instructions and try again.'
  );
  return `
  <span class="otbl-blocked-tag">Request blocked</span>
  <p class="otbl-blocked-msg">${safeMessage}</p>
`;
}

const AUTH_STORAGE_KEY = 'payeriq_auth';

function loadStoredAuth() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    // Private-browsing / storage-disabled -- fall back to requiring login
    // every load rather than throwing.
    return null;
  }
}

export default function App() {
  // { token, username, role } once logged in, else null. Kept in
  // sessionStorage (not localStorage) so a refresh doesn't force a re-login
  // but closing the tab does -- consistent with this app's existing
  // "no long-lived client state" approach to the generate/refine session.
  const [auth, setAuth] = useState(loadStoredAuth);

  const [projectName, setProjectName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [formats, setFormats] = useState([]);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({ prompt: false, format: false, files: false });
  const [generating, setGenerating] = useState(false);

  const [mode, setMode] = useState('placeholder'); // placeholder | generating | generated | error
  const [placeholderText, setPlaceholderText] = useState(IDLE_TEXT);
  const [slides, setSlides] = useState([]); // [{ key, label, html }] -- one per selected output format
  const [errorMessage, setErrorMessage] = useState('');
  const [statusText, setStatusText] = useState('No document generated yet');
  const [statusLive, setStatusLive] = useState(false);
  // Running log of "checking safety... drafting... verifying groundedness..."
  // stages fed by generateViaBackend/refineViaBackend's onProgress callback
  // while mode === 'generating' -- each event appends a new line rather than
  // overwriting the last one, so a long-running, multi-retry, multi-format
  // request reads as continuous progress instead of one frozen message.
  const [progressLog, setProgressLog] = useState([]); // [{ id, text }]
  const [lastGenerated, setLastGenerated] = useState(null);
  // Downloads are only enabled by a real Submit/Refine success -- viewing a
  // sample template preview must not unlock them.
  const [canDownload, setCanDownload] = useState(false);
  // Set once the first successful generate returns a session_id -- every
  // later Submit continues that session via refineViaBackend() instead of
  // starting a new one, until the user clicks "Start new".
  const [sessionId, setSessionId] = useState(null);

  // Builds the "Create X, Y and Z for the attached vendor file layout"
  // instruction text for a given set of selected formats, always listed in
  // FORMAT_ORDER regardless of click order.
  function autoPromptFor(list) {
    const labels = FORMAT_ORDER.filter((f) => list.includes(f)).map((f) => formatLabels[f]);
    if (labels.length === 0) return '';
    if (labels.length === 1) return `Create ${labels[0]} for the attached vendor file layout`;
    const last = labels[labels.length - 1];
    return `Create ${labels.slice(0, -1).join(', ')} and ${last} for the attached vendor file layout`;
  }

  function toggleFormat(value) {
    const nextFormats = formats.includes(value) ? formats.filter((v) => v !== value) : [...formats, value];
    // Only keep the instructions box in sync with the checkboxes while it
    // still holds an auto-generated (or empty) message -- once the user
    // types their own custom instructions, stop overwriting them.
    if (prompt.trim() === '' || prompt === autoPromptFor(formats)) {
      setPrompt(autoPromptFor(nextFormats));
    }
    setFormats(nextFormats);
    setErrors((prev) => (prev.format ? { ...prev, format: false } : prev));
  }

  function addFiles(fileList) {
    const added = Array.from(fileList || []);
    if (!added.length) return;
    setFiles((prev) => [...prev, ...added]);
    setErrors((prev) => (prev.files ? { ...prev, files: false } : prev));
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePromptChange(value) {
    setPrompt(value);
    if (value.trim()) setErrors((prev) => (prev.prompt ? { ...prev, prompt: false } : prev));
  }

  async function handleSubmit() {
    const project = projectName.trim() || 'Untitled Project';
    const continuing = !!sessionId;
    const promptEmpty = !prompt.trim();
    const formatEmpty = formats.length === 0;
    // Files are required to start a session, but on a refine call the
    // backend appends any new files to the session's existing ones -- so
    // re-attaching something is optional once a session is already active.
    const filesEmpty = !continuing && files.length === 0;

    setErrors({ prompt: promptEmpty, format: formatEmpty, files: filesEmpty });
    if (promptEmpty || formatEmpty || filesEmpty) return;

    const title = `${project} — ${formats.map((f) => formatLabels[f]).join(' + ')}`;

    setMode('generating');
    setStatusText(continuing ? 'Refining…' : 'Generating…');
    setStatusLive(false);
    setProgressLog([]);
    setGenerating(true);
    // Disable downloads for the duration of this run -- canDownload was
    // otherwise only ever set on the very first generate's success, so a
    // later refine left the buttons enabled the whole time, able to
    // download the stale pre-refine document while a new one was still
    // being drafted.
    setCanDownload(false);

    // Prefix with the format label only when more than one is in flight --
    // with a single format the name is already implied by the page. Appends
    // rather than overwrites so the log grows one line at a time as the
    // backend's graph run actually progresses.
    const onProgress = (evt) => {
      const label = formats.length > 1 ? `${formatLabels[evt.format] || evt.format}: ${evt.message}` : evt.message;
      setProgressLog((prev) => [...prev, { id: prev.length, text: label }]);
    };

    try {
      const { sessionId: newSessionId, text: rawText, statuses, messages } = continuing
        ? await refineViaBackend(sessionId, formats, prompt.trim(), files, onProgress, auth?.token)
        : await generateViaBackend(project, formats, prompt.trim(), files, onProgress, auth?.token);
      // The model has no real notion of "today" and otherwise copies a
      // static example date into the STTM Summary's "Version / Date" row --
      // stamp the real current date in once here, upstream of the on-screen
      // render, Excel export, and Word export, which all read from this
      // same text.
      const text = stampCurrentDate(rawText);
      setSessionId(newSessionId || sessionId);
      setLastGenerated({ title, text });
      // The response text is chunked in `formats` (checkbox-click) order --
      // map each chunk back to its format key, then lay the slides out in
      // the fixed FORMAT_ORDER regardless of click order.
      const chunks = renderMultiFormatOutputChunks(text);
      const chunkByFormat = Object.fromEntries(formats.map((f, idx) => [f, chunks[idx] || '']));

      // A format the safety guardrail blocked comes back with status
      // "rejected" and empty current_draft -- render that as an explicit
      // notice instead of a silently blank tab (see blockedSlideHtml).
      const rejectedFormats = formats.filter((f) => statuses[f] === 'rejected');
      const completedFormats = formats.filter((f) => statuses[f] !== 'rejected');

      setSlides(
        FORMAT_ORDER.filter((f) => formats.includes(f)).map((f) => ({
          key: f,
          label: formatLabels[f],
          html: statuses[f] === 'rejected' ? blockedSlideHtml(messages?.[f]) : chunkByFormat[f],
        }))
      );
      setMode('generated');

      if (rejectedFormats.length > 0) {
        const blockedLabels = rejectedFormats.map((f) => formatLabels[f]).join(', ');
        setStatusText(
          completedFormats.length > 0
            ? `Blocked: ${blockedLabels} (safety check failed) — ${completedFormats
                .map((f) => formatLabels[f])
                .join(', ')} completed`
            : `Request blocked — safety check failed for ${blockedLabels}`
        );
        setStatusLive(false);
        // Don't hand out a download that's silently missing (or entirely
        // made of) blocked content -- same reasoning as the pre-run
        // setCanDownload(false) above, just for a different failure mode.
        setCanDownload(false);
      } else {
        setStatusText(`Document ready — ${formats.map((f) => formatLabels[f]).join(', ')}`);
        setStatusLive(true);
        setCanDownload(true);
      }

      // Files the backend already has appended to source_files -- clear the
      // chips so a later refine only sends files that are actually new.
      setFiles([]);
    } catch (err) {
      const isSandboxCloneError = /could not be cloned/i.test(err.message) || /postMessage/i.test(err.message);
      const message = isSandboxCloneError
        ? "This preview environment intercepts network requests and can't send file uploads. Open this HTML file directly in a real browser tab (not an embedded preview) to test file generation."
        : err.message;
      setMode('error');
      setErrorMessage(message);
      setStatusText(continuing ? 'Refine failed' : 'Generation failed');
      setStatusLive(false);
      // A failed refine shouldn't strand the user without the last document
      // that DID succeed -- re-enable downloads only if one exists (i.e.
      // this wasn't the very first, still-unsuccessful generate).
      setCanDownload(!!lastGenerated);
    } finally {
      setGenerating(false);
    }
  }

  // Ends the current session so the next Submit starts a fresh /generate
  // call instead of continuing to refine this one.
  function handleStartNew() {
    setSessionId(null);
    setProjectName('');
    setPrompt('');
    setFormats([]);
    setFiles([]);
    setErrors({ prompt: false, format: false, files: false });
    setMode('placeholder');
    setPlaceholderText(IDLE_TEXT);
    setSlides([]);
    setProgressLog([]);
    setLastGenerated(null);
    setCanDownload(false);
    setStatusText('No document generated yet');
    setStatusLive(false);
  }

  // Called by LoginPage on submit. Throws (letting LoginPage show the
  // message) if the backend rejects the credentials; only stores auth state
  // -- and therefore only reveals the rest of the app -- on success.
  async function handleLogin(username, password) {
    const result = await loginViaBackend(username, password);
    setAuth(result);
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result));
    } catch (e) {
      // Storage disabled -- auth still works for this render, just won't
      // survive a refresh.
    }
  }

  function handleLogout() {
    setAuth(null);
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      // Nothing to clean up if storage was never written.
    }
  }

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="wrap">
            <Header username={auth.username} onLogout={handleLogout} />

            <div className="grid">
              <RequestForm
                formats={formats}
                onToggleFormat={toggleFormat}
                files={files}
                onAddFiles={addFiles}
                onRemoveFile={removeFile}
                prompt={prompt}
                onPromptChange={handlePromptChange}
                projectName={projectName}
                onProjectNameChange={setProjectName}
                onSubmit={handleSubmit}
                errors={errors}
                generating={generating}
                sessionActive={!!sessionId}
                onStartNew={handleStartNew}
                username={auth.username}
              />

              <OutputPanel
                statusText={statusText}
                statusLive={statusLive}
                mode={mode}
                progressLog={progressLog}
                placeholderText={placeholderText}
                slides={slides}
                errorMessage={errorMessage}
                canDownload={canDownload}
                onDownloadExcel={() => downloadExcel(lastGenerated)}
                onDownloadWord={() => downloadWord(lastGenerated)}
              />
            </div>

            <footer className="hint">Draft outputs are generated for review — verify against source material before distribution.</footer>
          </div>
        }
      />
      <Route
        path="/STTM_Template"
        element={<TemplatePage templateKey="sttm" username={auth.username} onLogout={handleLogout} />}
      />
      <Route
        path="/FRD_Template"
        element={<TemplatePage templateKey="frd" username={auth.username} onLogout={handleLogout} />}
      />
      <Route
        path="/Agile_Artifact_Template"
        element={<TemplatePage templateKey="gherkin" username={auth.username} onLogout={handleLogout} />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
