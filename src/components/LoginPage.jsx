import { useState } from 'react';
import Header from './Header.jsx';

export default function LoginPage({ onLogin }) {
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
          <h2>Sign in</h2>
          <p className="login-sub">Enter the credentials issued to you to access BA Assist.</p>

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
        </form>
      </div>
    </div>
  );
}
