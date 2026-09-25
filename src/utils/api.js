import { MULTI_FORMAT_DIVIDER } from './textRenderers.js';

// ===================================================================
// FASTAPI BACKEND INTEGRATION
// All generation is delegated to the backend — no hardcoded/mock output.
// ===================================================================
// Active Azure Container Apps Backend API Endpoint
//const BASE_URL = 'https://payeriq-api.wittyfield-97c21b82.eastus.azurecontainerapps.io/v2';
const BASE_URL = 'http://localhost:8000/v2';

// /v2/generate and /v2/refine stream newline-delimited JSON instead of one
// JSON body -- a full run (guardrail -> retrieval -> drafting -> groundedness
// check -> up to 2 retries -> finalize, per requested format) can take long
// enough that a bare spinner with no feedback looked stuck. Each line is
// {"type": "progress", ...} (forwarded to onProgress) or the final
// {"type": "result", ...} / {"type": "error", ...}.
function handleNdjsonLine(line, onProgress) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let obj;
  try {
    obj = JSON.parse(trimmed);
  } catch (e) {
    return null; // ignore a malformed line rather than fail the whole stream
  }
  if (obj.type === 'progress') {
    onProgress?.(obj);
    return null;
  }
  if (obj.type === 'error') {
    throw new Error(obj.message || 'Generation failed.');
  }
  if (obj.type === 'result') {
    return obj;
  }
  return null;
}

async function postFormStreaming(url, form, onProgress, token) {
  const res = await fetch(url, {
    method: 'POST',
    // Sent alongside the (client-side gated) login flow so the backend can
    // also enforce auth on generate/refine itself -- see loginViaBackend and
    // the "Login" section of the README.
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    let rawErrorDetails = '';
    try {
      const errPayload = await res.json();
      rawErrorDetails = errPayload.detail || JSON.stringify(errPayload);
    } catch (e) {
      rawErrorDetails = await res.text().catch(() => `HTTP ${res.status} ${res.statusText}`);
    }
    throw new Error(rawErrorDetails || `HTTP ${res.status}`);
  }

  let finalLine = null;

  if (!res.body) {
    // No streaming support in this environment (e.g. a sandboxed preview) --
    // fall back to reading the whole NDJSON body at once.
    const text = await res.text();
    for (const line of text.split('\n')) {
      const parsed = handleNdjsonLine(line, onProgress);
      if (parsed) finalLine = parsed;
    }
  } else {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // last (possibly incomplete) line stays buffered
      for (const line of lines) {
        const parsed = handleNdjsonLine(line, onProgress);
        if (parsed) finalLine = parsed;
      }
    }
    if (buffer.trim()) {
      const parsed = handleNdjsonLine(buffer, onProgress);
      if (parsed) finalLine = parsed;
    }
  }

  if (!finalLine) {
    throw new Error('The response stream ended without a result.');
  }
  return finalLine;
}

// data.outputs is keyed by output_format and shared by both /generate and
// /refine -- session_id is returned so the caller can pass it to
// refineViaBackend() on a later submit instead of starting a new session.
// data.statuses is the same shape, one entry per requested format ("completed"
// or "rejected") -- data.status alone only reflects the *last* requested
// format, which would silently hide a Prompt Shields rejection on any format
// that isn't last in a multi-format request. data.messages is the same shape
// again, holding reject_node's/content_blocked_node's human-readable reason
// ("" for a format that wasn't rejected) -- without this the UI could show
// *that* a format was blocked but never *why*.
function toResult(data, formats) {
  return {
    sessionId: data.session_id,
    text: formats.map((f) => data.outputs[f] || '').join(MULTI_FORMAT_DIVIDER),
    statuses: data.statuses || {},
    messages: data.messages || {},
  };
}

// onProgress, if given, is called with each {type: "progress", format, node,
// message} event as the backend's graph run reaches that stage -- see
// postFormStreaming above. Optional so callers that don't care about live
// status can omit it.
export async function generateViaBackend(project, formats, promptText, files, onProgress, token) {
  const form = new FormData();
  form.append('project_name', project);
  form.append('instructions', promptText);

  formats.forEach((f) => form.append('output_format', f));

  if (files && files.length > 0) {
    files.forEach((f) => form.append('files', f));
  }

  const data = await postFormStreaming(`${BASE_URL}/generate`, form, onProgress, token);
  return toResult(data, formats);
}

// Continues an existing session started by generateViaBackend(). `formats`
// need not match the formats the session originally started with -- each
// format lives on its own thread server-side, so checking one that isn't
// part of the session yet just adds it (see routergenerator.py's /refine
// docstring). `files`, if given, are appended to the session's existing
// source files rather than replacing them, so they're optional on a refine
// call.
export async function refineViaBackend(sessionId, formats, promptText, files, onProgress, token) {
  const form = new FormData();
  form.append('instructions', promptText);

  formats.forEach((f) => form.append('output_format', f));

  if (files && files.length > 0) {
    files.forEach((f) => form.append('files', f));
  }

  const data = await postFormStreaming(`${BASE_URL}/refine/${sessionId}`, form, onProgress, token);
  return toResult(data, formats);
}

// ===================================================================
// LOGIN
// ===================================================================
// This endpoint does not exist on the backend yet -- see the "Login" section
// of the README for the contract it needs to implement: look up `username`
// in Cosmos DB's UserCredential container, bcrypt-compare `password` against
// the stored passwordHash, and return a token. The frontend never talks to
// Cosmos DB directly (that would require shipping a DB key in the browser
// bundle, exposing full read/write access to the database to any visitor).
export async function loginViaBackend(username, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON error body (e.g. a gateway timeout page) -- fall through to
    // the generic message below.
  }

  if (!res.ok) {
    throw new Error((data && (data.detail || data.message)) || 'Invalid username or password.');
  }
  if (!data || !data.token) {
    throw new Error('Login response did not include a token.');
  }
  return { token: data.token, username: data.username || username, role: data.role || null };
}
