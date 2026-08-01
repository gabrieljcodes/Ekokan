import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconEkokanLogo, IconWarning, IconEye, IconEyeOff } from '../components/Icons';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ username, password });
      if (isMountedRef.current) {
        navigate('/');
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError((err as Error).message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [username, password, login, navigate]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <main role="main" className="auth-container">
      <div className="auth-brand" aria-hidden="true">
        <IconEkokanLogo size={46} />
      </div>
      <h1 className="auth-title">Welcome Back</h1>
      <p className="auth-subtitle">
        Login to your account to bookmark creators and interact with the archive
      </p>
      
      {error && (
        <div className="auth-error-alert" role="alert" aria-live="assertive">
          <IconWarning size={18} className="auth-error-alert__icon" aria-hidden={true} />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form-stack">
        <div className="form-group">
          <label htmlFor="login-username" className="form-label">
            <span>Username</span>
            <span className="form-label__hint">(Required)</span>
          </label>
          <div className="auth-input-wrap">
            <input
              id="login-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="e.g. kemono_fan"
              autoFocus
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            <span>Password</span>
            <span className="form-label__hint">(Required)</span>
          </label>
          <div className="auth-input-wrap auth-input-wrap--password">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={toggleShowPassword}
              aria-label={showPassword ? 'Hide password text' : 'Show password text'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <IconEyeOff size={18} aria-hidden={true} />
              ) : (
                <IconEye size={18} aria-hidden={true} />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary auth-submit-btn"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="auth-submit-btn__spinner" aria-hidden="true" />
              <span>Logging in...</span>
            </>
          ) : (
            <span>Login to Account</span>
          )}
        </button>
      </form>
      
      <div className="auth-switch">
        Don&apos;t have an account? <Link to="/register">Create one now</Link>
      </div>
    </main>
  );
}
