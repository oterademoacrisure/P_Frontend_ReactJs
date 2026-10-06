import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import { ROLES } from '../data/clients.js';
import { fetchProjectRegistry, fetchUserMappings, registerUserViaBackend } from '../utils/api.js';

// Keys match the database record's field names -- this object is exactly
// what registerUserViaBackend() sends on OK.
const EMPTY_FORM = {
  UserName: '',
  // Not part of the mapping record -- for a new user the backend creates
  // their login with it and stores only a bcrypt hash.
  Password: '',
  Role: 'User',
  ClientID: '',
  ProjectID: '',
};

const REDIRECT_DELAY_MS = 2500;

const ERROR_TEXT = {
  UserName: 'Enter a user name.',
  Role: 'Select a role.',
  ClientID: 'Select a client.',
  ProjectID: 'Select a project.',
};

// Admin-only page for registering a user against a client/project.
// App.jsx only routes here when auth.role is "admin"; the backend's
// /admin/users endpoint must enforce that too (see registerUserViaBackend).
export default function AdminRegisterPage({ username, token, onLogout }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  // After a successful save the page shows the message briefly, then signs
  // the admin out to the login page so the new user can sign in.
  const [redirecting, setRedirecting] = useState(false);
  const redirectTimer = useRef(null);
  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  // Clients and projects come from the backend's project registry, so this
  // page can only offer projects the backend will accept.
  const [clients, setClients] = useState([]);
  const [clientsError, setClientsError] = useState('');
  useEffect(() => {
    fetchProjectRegistry(token)
      .then(setClients)
      .catch((err) => {
        if (err.status === 401) onLogout();
        else setClientsError(err.message);
      });
  }, [token]);

  // Registered users, listed under the form; reloaded after each save.
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [usersLoading, setUsersLoading] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  function loadUsers() {
    setUsersLoading(true);
    fetchUserMappings(token)
      .then((list) => {
        setUsers(list);
        setUsersError('');
      })
      .catch((err) => {
        if (err.status === 401) onLogout();
        else setUsersError(err.message);
      })
      .finally(() => setUsersLoading(false));
  }
  useEffect(loadUsers, [token]);

  const needle = projectSearch.trim().toLowerCase();
  const shownUsers = needle
    ? users.filter((u) => u.ProjectID.toLowerCase().includes(needle) || u.projectName.toLowerCase().includes(needle))
    : users;

  const client = clients.find((c) => c.clientId === form.ClientID);

  function setField(name, value) {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // A project only belongs to one client -- clear it when the client changes.
      if (name === 'ClientID') next.ProjectID = '';
      return next;
    });
    setErrors((prev) => (prev[name] ? { ...prev, [name]: false } : prev));
    setSavedMessage('');
  }

  function validate() {
    // Password is blank when adding a project to a user who already has a
    // login -- the backend says so if a new user needs one.
    const next = Object.fromEntries(
      Object.keys(EMPTY_FORM)
        .filter((k) => k !== 'Password')
        .map((k) => [k, !form[k].trim()])
    );
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleOk(e) {
    e.preventDefault();
    setSaveError('');
    setSavedMessage('');
    if (!validate()) return;

    const record = { ...form, UserName: form.UserName.trim() };
    setSaving(true);
    try {
      const saved = await registerUserViaBackend(record, token);
      const loginNote = saved?.login === 'created' ? ' Login created — give them this username and password.' : '';
      setSavedMessage(`Record has been added successfully.${loginNote} Redirecting to the login page…`);
      setForm(EMPTY_FORM);
      setErrors({});
      setRedirecting(true);
      redirectTimer.current = setTimeout(() => {
        navigate('/', { replace: true });
        onLogout();
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      // The stored login token has expired or is no longer valid -- send the
      // admin back to the login screen rather than failing every save.
      if (err.status === 401) {
        onLogout();
        return;
      }
      setSaveError(err.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setErrors({});
    setSaveError('');
    setSavedMessage('');
    navigate('/');
  }

  const fieldClass = (name) => `field${errors[name] ? ' invalid' : ''}`;

  return (
    <div className="wrap">
      <Header username={username} onLogout={onLogout} />

      <div className="login-shell admin-shell">
        <form className="login-card admin-card" onSubmit={handleOk} noValidate>
          <h2>Register user</h2>
          <p className="login-sub">Assign a user to a client and project. Admins only.</p>

          <div className={fieldClass('UserName')}>
            <label className="f-label" htmlFor="reg-username">
              UserName <span className="req">*</span>
            </label>
            <input
              type="text"
              id="reg-username"
              autoComplete="off"
              value={form.UserName}
              onChange={(e) => setField('UserName', e.target.value)}
              disabled={saving || redirecting}
            />
            <div className="field-error">{ERROR_TEXT.UserName}</div>
          </div>

          <div className="field">
            <label className="f-label" htmlFor="reg-password">
              Password
            </label>
            <input
              type="password"
              id="reg-password"
              autoComplete="new-password"
              value={form.Password}
              onChange={(e) => setField('Password', e.target.value)}
              disabled={saving || redirecting}
            />
            <div className="field-hint">
              New user: enter a password (at least 8 characters) to create their login. Existing user: leave blank.
            </div>
          </div>

          <div className={fieldClass('Role')}>
            <label className="f-label" htmlFor="reg-role">
              Role <span className="req">*</span>
            </label>
            <select id="reg-role" value={form.Role} onChange={(e) => setField('Role', e.target.value)} disabled={saving || redirecting}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="field-error">{ERROR_TEXT.Role}</div>
          </div>

          <div className={fieldClass('ClientID')}>
            <label className="f-label" htmlFor="reg-client">
              ClientID <span className="req">*</span>
            </label>
            <select
              id="reg-client"
              value={form.ClientID}
              onChange={(e) => setField('ClientID', e.target.value)}
              disabled={saving || redirecting}
            >
              <option value="">{clients.length ? 'Select a client' : 'Loading…'}</option>
              {clients.map((c) => (
                <option key={c.clientId} value={c.clientId}>
                  {c.clientName}
                </option>
              ))}
            </select>
            {clientsError && <div className="field-hint">{clientsError}</div>}
            <div className="field-error">{ERROR_TEXT.ClientID}</div>
          </div>

          <div className={fieldClass('ProjectID')}>
            <label className="f-label" htmlFor="reg-project">
              ProjectID <span className="req">*</span>
            </label>
            <select
              id="reg-project"
              value={form.ProjectID}
              onChange={(e) => setField('ProjectID', e.target.value)}
              disabled={saving || redirecting || !client}
            >
              <option value="">{client ? 'Select a project' : 'Select a client first'}</option>
              {client?.projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectName}
                </option>
              ))}
            </select>
            <div className="field-error">{ERROR_TEXT.ProjectID}</div>
          </div>

          {saveError && (
            <div className="login-error">
              <span aria-hidden="true">⚠</span>
              <span>{saveError}</span>
            </div>
          )}
          {savedMessage && <div className="admin-success">{savedMessage}</div>}

          <div className="btnrow admin-btnrow">
            <button type="button" className="btn ghost" onClick={handleCancel} disabled={saving || redirecting}>
              Cancel
            </button>
            <button type="submit" className="btn submit" disabled={saving || redirecting}>
              {saving && <span className="spinner"></span>}
              {saving ? 'Saving…' : 'OK'}
            </button>
          </div>
        </form>

        <section className="login-card admin-list-card">
          <div className="admin-list-head">
            <h2>Registered users</h2>
            <input
              type="search"
              className="admin-search"
              placeholder="Search by ProjectID"
              aria-label="Search by ProjectID"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
            />
          </div>
          <p className="login-sub">
            {usersLoading
              ? 'Loading…'
              : `${shownUsers.length} of ${users.length} mapping${users.length === 1 ? '' : 's'}`}
          </p>

          {usersError && (
            <div className="login-error">
              <span aria-hidden="true">⚠</span>
              <span>{usersError}</span>
            </div>
          )}

          {!usersLoading && !usersError && (
            <div className="otbl-wrap">
              <table className="otbl">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>ClientID</th>
                    <th>ProjectID</th>
                  </tr>
                </thead>
                <tbody>
                  {shownUsers.map((u) => (
                    <tr key={`${u.UserName}|${u.ClientID}|${u.ProjectID}`}>
                      <td>{u.UserName}</td>
                      <td>{u.Role}</td>
                      <td>{u.ClientID}</td>
                      <td>
                        {u.ProjectID}
                        {!u.registered && (
                          <span className="admin-flag" title="This project is no longer registered; reassign the user.">
                            not registered
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {shownUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="admin-empty">
                        {users.length ? 'No users for that ProjectID.' : 'No users registered yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
