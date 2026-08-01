import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconEkokanLogo, IconWarning, IconEye, IconEyeOff } from '../components/Icons';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
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
      await register({
        username,
        display_name: displayName || undefined,
        email: email || undefined,
        password,
      });
      if (isMountedRef.current) {
        navigate('/');
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError((err as Error).message || 'Registration failed to process.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [username, displayName, email, password, register, navigate]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <main role="main" className="auth-container">
      <div className="auth-brand" aria-hidden="true">
        <IconEkokanLogo size={46} />
      </div>
      <h1 className="auth-title">Join Ekokan</h1>
      <p className="auth-subtitle">
        Create an account to unlock Member badges, favorite collections &amp; archive features
      </p>
      
      {error && (
        <div className="auth-error-alert" role="alert" aria-live="assertive">
          <IconWarning size={18} className="auth-error-alert__icon" aria-hidden={true} />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="auth-form-stack">
        <div className="form-group">
          <label htmlFor="register-username" className="form-label">
            <span>Username</span>
            <span className="form-label__hint">(Required)</span>
          </label>
          <div className="auth-input-wrap">
            <input
              id="register-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="Unique username (at least 3 characters)"
              autoFocus
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="register-displayName" className="form-label">
            <span>Display Name</span>
            <span className="form-label__hint">(Optional)</span>
          </label>
          <div className="auth-input-wrap">
            <input
              id="register-displayName"
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              placeholder="How your name appears in comment sections"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="register-email" className="form-label">
            <span>Email</span>
            <span className="form-label__hint">(Optional)</span>
          </label>
          <div className="auth-input-wrap">
            <input
              id="register-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@domain.com"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="register-password" className="form-label">
            <span>Password</span>
            <span className="form-label__hint">(Min. 6 characters)</span>
          </label>
          <div className="auth-input-wrap auth-input-wrap--password">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={6}
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
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Register Account</span>
          )}
        </button>
      </form>
      
      <div className="auth-switch">
        Already have an account? <Link to="/login">Login here</Link>
      </div>
    </main>
  );
}
