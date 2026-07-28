import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ApiToken } from '../types/models';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function ApiTokensPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<ApiToken | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTokens();
  }, [user]);

  const loadTokens = () => {
    setLoading(true);
    api.listApiTokens()
      .then((res) => {
        setTokens(res.tokens || []);
      })
      .catch((err) => setError(err.message || 'Failed to load API tokens'))
      .finally(() => setLoading(false));
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      setError('Please provide a name for the API token');
      return;
    }
    setError('');
    setCreating(true);
    setNewlyCreatedToken(null);
    setCopied(false);
    try {
      const created = await api.createApiToken(newTokenName.trim());
      setNewlyCreatedToken(created);
      setNewTokenName('');
      setTokens([created, ...tokens]);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message || 'Failed to generate token');
      else setError('Failed to generate token');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to revoke token "${name}"? Any applications using this token will lose access immediately.`)) {
      return;
    }
    try {
      await api.deleteApiToken(id);
      setTokens(tokens.filter((t) => t.id !== id));
      if (newlyCreatedToken?.id === id) {
        setNewlyCreatedToken(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error) alert('Error revoking token: ' + err.message);
    }
  };

  const copyToClipboard = () => {
    if (newlyCreatedToken?.token) {
      navigator.clipboard.writeText(newlyCreatedToken.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    }
  };

  return (
    <div style={{ padding: '32px 0', maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🔑 API Tokens & Automation
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: '1.6' }}>
          Generate secure, long-lived authentication tokens for tools like <code style={{ color: 'var(--color-primary-light)', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>kemono-dl</code> or external CLI automation scripts. Tokens generated here inherit your profile permissions ({user.role === 'admin' ? 'Administrator' : 'Standard User'}).
        </p>
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      {newlyCreatedToken && newlyCreatedToken.token && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)',
          border: '1px solid rgb(16, 185, 129)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          marginBottom: '32px',
          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', fontWeight: '700', fontSize: 'var(--fs-md)', marginBottom: '8px' }}>
            🎉 API Token Generated Successfully!
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Make sure to copy your token immediately. For security reasons, <strong>it will never be displayed again once you leave this page</strong>.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--fs-sm)', color: '#fff', wordBreak: 'break-all' }}>
              {newlyCreatedToken.token}
            </code>
            <button
              onClick={copyToClipboard}
              style={{
                background: copied ? '#10b981' : 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Token'}
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--bg-elevated)',
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        marginBottom: '36px'
      }}>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: '600', marginBottom: '16px' }}>Generate a New Token</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Token description (e.g., kemono-dl desktop syncer)"
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            disabled={creating}
            style={{
              flex: '1 1 300px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: 'var(--fs-sm)'
            }}
            maxLength={100}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={creating || !newTokenName.trim()}
            style={{ padding: '12px 24px', fontWeight: '600' }}
          >
            {creating ? 'Generating...' : '+ Generate Token'}
          </button>
        </form>
      </div>

      <div>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: '600', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Active API Tokens ({tokens.length})</span>
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading tokens...</div>
        ) : tokens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>No active API tokens found for your account.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tokens.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-card)',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: 'var(--fs-md)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {t.name}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    <span>Prefix: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>{t.token_prefix}...</code></span>
                    <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                    <span>Last used: {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => handleRevoke(t.id, t.name)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: 'var(--fs-xs)',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    title="Revoke access for this token immediately"
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                  >
                    🗑️ Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
