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
// clientId/projectId must be one of the logged-in user's assigned projects
// (see fetchMyProjects) -- the backend answers 403 otherwise.
export async function generateViaBackend(project, formats, promptText, files, onProgress, token, clientId, projectId) {
  const form = new FormData();
  form.append('client_id', clientId);
  form.append('project_id', projectId);
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
  // Dev-only stand-in until /auth/login exists: credentials come from
  // .env.local (VITE_DEMO_ADMIN_USER / VITE_DEMO_ADMIN_PASSWORD, gitignored
  // via *.local). import.meta.env.DEV is false in `vite build`, so this whole
  // branch is stripped from production bundles.
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEMO_ADMIN_USER &&
    username === import.meta.env.VITE_DEMO_ADMIN_USER &&
    password === import.meta.env.VITE_DEMO_ADMIN_PASSWORD
  ) {
    return { token: 'dev-demo-token', username, role: 'admin' };
  }

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
  // isAdmin comes from the backend, which decides which roles count as admin
  // (e.g. both "admin" and "superuser") -- don't re-derive it from role here.
  return { token: data.token, username: data.username || username, role: data.role || null, isAdmin: !!data.isAdmin };
}

// The registered clients and their projects -- the backend's project
// registry (app/config/projects.json), the same list it validates against.
// Returns [{ clientId, clientName, projects: [{ projectId, projectName }] }].
export async function fetchProjectRegistry(token) {
  const res = await fetch(`${BASE_URL}/admin/projects`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON body -- fall through to the generic message below.
  }
  if (!res.ok) {
    const err = new Error((data && data.detail) || `Could not load clients and projects (HTTP ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data.clients;
}

// Downloads a session's finished workbook from the backend -- for STTM, the
// common STTM_Data_Ingestion_Template.xlsx filled with the mapping, so it
// keeps the template's banner, styling and column layout. Throws when the
// server no longer has the file (e.g. after a restart); the caller falls
// back to building the workbook in the browser.
export async function downloadFromBackend(sessionId, outputFormat, token) {
  const res = await fetch(
    `${BASE_URL}/download/${encodeURIComponent(sessionId)}?output_format=${encodeURIComponent(outputFormat)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
  );
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status}).`);
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = match ? match[1] : `${outputFormat}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// The client/project pairs an admin has assigned the logged-in user to.
// Returns { allProjects, projects: [{ clientId, projectId }] } --
// allProjects is true for admins, who may use every project.
export async function fetchMyProjects(token) {
  const res = await fetch(`${BASE_URL}/auth/me/projects`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON body -- fall through to the generic message below.
  }
  if (!res.ok) {
    const err = new Error((data && data.detail) || `Could not load your projects (HTTP ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ===================================================================
// ADMIN -- USER REGISTRATION
// ===================================================================
// Every User / Role / ClientID / ProjectID mapping, for the admin page's
// user list. projectId (optional) keeps only projects whose id or name
// contains it; the page loads everything once and filters as you type.
export async function fetchUserMappings(token, projectId = '') {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  const res = await fetch(`${BASE_URL}/admin/users${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON body -- fall through to the generic message below.
  }
  if (!res.ok) {
    const err = new Error((data && data.detail) || `Could not load users (HTTP ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data.users;
}

// Like /auth/login, this endpoint must be implemented on the backend: it
// should verify the bearer token belongs to an admin, then save the record
// { UserName, Role, ClientID, ProjectID } to the database. The admin check in
// the frontend only hides the page -- the backend must enforce it.
// Deletes one row of the admin user list (a User -> client/project mapping).
// The backend also deletes the user's login when it was their last mapping;
// the result's `deleted` is "mapping" or "user".
export async function deleteUserMapping(mappingId, token) {
  const res = await fetch(`${BASE_URL}/admin/users/${encodeURIComponent(mappingId)}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON body -- fall through to the generic message below.
  }
  if (!res.ok) {
    const err = new Error((data && data.detail) || `Could not delete user (HTTP ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function registerUserViaBackend(user, token) {
  const res = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(user),
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON body -- fall through to the generic message below.
  }

  if (!res.ok) {
    const err = new Error((data && (data.detail || data.message)) || `Could not save user (HTTP ${res.status}).`);
    // Lets the page tell an expired/invalid login (401) apart from other failures.
    err.status = res.status;
    throw err;
  }
  return data;
}
