import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { ApiToken } from '../types/models';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { IconKey, IconWarning, IconCheck, IconCopy, IconTrash, IconRefresh } from '../components/Icons';

export default function ApiTokensPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<ApiToken | null>(null);
  const [copied, setCopied] = useState(false);

  const isMountedRef = useRef(true);
  const timerIdsRef = useRef<number[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      timerIdsRef.current.forEach((id) => window.clearTimeout(id));
      timerIdsRef.current = [];
    };
  }, []);

  const registerTimer = useCallback((id: number) => {
    timerIdsRef.current.push(id);
  }, []);

  const loadTokens = useCallback(() => {
    setLoading(true);
    api.listApiTokens()
      .then((res) => {
        if (isMountedRef.current) {
          setTokens(res.tokens || []);
        }
      })
      .catch((err: unknown) => {
        if (isMountedRef.current) {
          setError((err as Error).message || 'Failed to load API tokens');
        }
      })
      .finally(() => {
        if (isMountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTokens();
  }, [user, loadTokens]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      setError('Please provide a descriptive name for the API token');
      return;
    }
    setError('');
    setCreating(true);
    setNewlyCreatedToken(null);
    setCopied(false);
    try {
      const created = await api.createApiToken(newTokenName.trim());
      if (isMountedRef.current) {
        setNewlyCreatedToken(created);
        setNewTokenName('');
        setTokens((prev) => [created, ...prev]);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        if (err instanceof Error) setError(err.message || 'Failed to generate token');
        else setError('Failed to generate token');
      }
    } finally {
      if (isMountedRef.current) setCreating(false);
    }
  }, [newTokenName]);

  const handleRevoke = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently revoke token "${name}"? Any CLI tools or scripts using this token will lose access immediately.`)) {
      return;
    }
    setError('');
    try {
      await api.deleteApiToken(id);
      if (isMountedRef.current) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
        if (newlyCreatedToken?.id === id) {
          setNewlyCreatedToken(null);
        }
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError((err as Error).message || 'Error revoking automation token.');
      }
    }
  }, [newlyCreatedToken]);

  const copyToClipboard = useCallback(() => {
    if (newlyCreatedToken?.token) {
      navigator.clipboard.writeText(newlyCreatedToken.token);
      if (isMountedRef.current) {
        setCopied(true);
        const timer = window.setTimeout(() => {
          if (isMountedRef.current) setCopied(false);
        }, 4000);
        registerTimer(timer);
      }
    }
  }, [newlyCreatedToken, registerTimer]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <main role="main" className="api-tokens__container">
      <header className="api-tokens__header">
        <h1 className="api-tokens__title">
          <IconKey size={28} aria-hidden={true} />
          <span>API Tokens & Automation</span>
        </h1>
        <p className="api-tokens__description">
          Generate secure, long-lived authentication tokens for tools like <code className="api-tokens__code-badge">kemono-dl</code> or external CLI automation scripts. Tokens generated here inherit your profile permissions ({user.role === 'admin' ? 'Administrator' : 'Standard User'}).
        </p>
      </header>

      {error && (
        <div className="form-error api-tokens__error-banner" role="alert" aria-live="assertive">
          <IconWarning size={18} aria-hidden={true} />
          <span>{error}</span>
        </div>
      )}

      {newlyCreatedToken && newlyCreatedToken.token && (
        <section className="api-tokens__success-box motion-arrive-card" role="region" aria-label="Newly generated API token credentials">
          <div className="api-tokens__success-title" role="status" aria-live="polite">
            <IconCheck size={20} aria-hidden={true} />
            <span>API Token Generated Successfully!</span>
          </div>
          <p className="api-tokens__success-desc">
            Make sure to copy your token immediately. For security reasons, <strong>it will never be displayed again once you leave this page</strong>.
          </p>
          <div className="api-tokens__copy-bar">
            <code className="api-tokens__token-string">
              {newlyCreatedToken.token}
            </code>
            <button
              type="button"
              onClick={copyToClipboard}
              className={`btn-primary api-tokens__copy-btn ${copied ? 'btn-success' : ''}`}
              aria-label="Copy newly generated token to clipboard"
            >
              {copied ? (
                <>
                  <IconCheck size={16} aria-hidden={true} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <IconCopy size={16} aria-hidden={true} />
                  <span>Copy Token</span>
                </>
              )}
            </button>
          </div>
        </section>
      )}

      <section className="api-tokens__form-card motion-arrive-row" aria-labelledby="form-section-title">
        <h2 id="form-section-title" className="api-tokens__form-title">
          Generate a New Token
        </h2>
        <form onSubmit={handleCreate} className="api-tokens__form-row" aria-busy={creating}>
          <label htmlFor="token-desc-input" className="sr-only">Token description or purpose</label>
          <input
            id="token-desc-input"
            type="text"
            placeholder="Token description (e.g., kemono-dl desktop syncer)"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            disabled={creating}
            className="form-input api-tokens__input"
            maxLength={100}
            aria-label="Token description or script purpose"
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={creating || !newTokenName.trim()}
          >
            <IconKey size={16} aria-hidden={true} />
            <span>{creating ? 'Generating...' : 'Generate Token'}</span>
          </button>
        </form>
      </section>

      <section aria-labelledby="roster-section-title">
        <h2 id="roster-section-title" className="api-tokens__roster-title">
          <span>Active API Tokens ({tokens.length})</span>
        </h2>

        {loading ? (
          <div className="loading" role="status" aria-live="polite">
            <IconRefresh size={22} aria-hidden={true} />
            <span>Loading tokens...</span>
          </div>
        ) : tokens.length === 0 ? (
          <div className="api-tokens__empty-box" role="status" aria-live="polite">
            <span>No active API tokens found for your account.</span>
          </div>
        ) : (
          <div className="api-tokens__roster-list" role="region" aria-label="Active API token roster">
            {tokens.map((t) => (
              <article key={t.id} className="api-tokens__roster-item motion-arrive-row">
                <div>
                  <div className="api-tokens__roster-name">
                    {t.name}
                  </div>
                  <div className="api-tokens__roster-meta">
                    <span>Prefix: <code className="api-tokens__prefix-badge">{t.token_prefix}...</code></span>
                    <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                    <span>Last used: {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(t.id, t.name)}
                    className="btn-danger api-tokens__revoke-btn"
                    title={`Revoke token ${t.name} immediately`}
                    aria-label={`Revoke automation token ${t.name} immediately`}
                  >
                    <IconTrash size={16} aria-hidden={true} />
                    <span>Revoke</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
