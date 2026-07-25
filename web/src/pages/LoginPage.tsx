import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password });
      navigate('/');
    } catch (err: unknown) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-subtitle">Login to bookmark creators and share your thoughts</p>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="e.g. kemono_fan"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '12px' }}>
          {loading ? 'Logging in...' : 'Login to Account'}
        </button>
      </form>
      <div className="auth-switch">
        Don't have an account? <Link to="/register">Create one now</Link>
      </div>
    </div>
  );
}
