import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        username,
        display_name: displayName || undefined,
        email: email || undefined,
        password,
      });
      navigate('/');
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Join Ekokan</h1>
      <p className="auth-subtitle">Create an account to unlock Member badges, favorites & interactive features</p>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-group">
          <label className="form-label">
            Username <span className="form-label__hint">(Required)</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Unique username (at least 3 characters)"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Display Name <span className="form-label__hint">(Optional)</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How your name appears in comment sections"
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Email <span className="form-label__hint">(Optional)</span>
          </label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Password <span className="form-label__hint">(Min. 6 characters)</span>
          </label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '12px' }}>
          {loading ? 'Creating Account...' : 'Register Account'}
        </button>
      </form>
      <div className="auth-switch">
        Already have an account? <Link to="/login">Login here</Link>
      </div>
    </div>
  );
}
