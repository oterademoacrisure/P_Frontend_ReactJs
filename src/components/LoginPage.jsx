import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header.jsx';

// `admin` switches the copy and the footer link between the regular sign-in
// (at /) and the admin sign-in (at /admin) -- the form itself is identical;
// App.jsx's onLogin handler is what rejects non-admin accounts on /admin.
export default function LoginPage({ onLogin, admin = false }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter both a username and a password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap">
      <Header />

      <div className="login-shell">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>{admin ? 'Admin sign in' : 'Sign in'}</h2>
          <p className="login-sub">
            {admin
              ? 'Sign in with an administrator account to manage users.'
              : 'Enter the credentials issued to you to access BA Assist.'}
          </p>

          <div className={`field${error ? ' invalid' : ''}`}>
            <label className="f-label" htmlFor="login-username">
              Username
            </label>
            <input
              type="text"
              id="login-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label className="f-label" htmlFor="login-password">
              Password
            </label>
            <input
              type="password"
              id="login-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="login-error">
              <span aria-hidden="true">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn submit login-submit" disabled={submitting}>
            {submitting && <span className="spinner"></span>}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="login-switch">
            {admin ? <Link to="/">‹ Back to user sign in</Link> : <Link to="/admin">Admin sign in</Link>}
          </div>
        </form>
      </div>
    </div>
  );
}
