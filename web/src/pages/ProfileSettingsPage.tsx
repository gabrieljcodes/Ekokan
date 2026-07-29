import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { ApiToken, Tag } from '../types/models';
import { Navigate, useSearchParams } from 'react-router-dom';

export default function ProfileSettingsPage() {
  const { user, excludedTagIds, saveExcludedTags, updateUserAvatar } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');

  // Excluded tags state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedExcluded, setSelectedExcluded] = useState<Set<string>>(new Set(excludedTagIds));
  const [tagSearch, setTagSearch] = useState('');
  const [savingTags, setSavingTags] = useState(false);
  const [tagMessage, setTagMessage] = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);

  // API Tokens state
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [creatingToken, setCreatingToken] = useState(false);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<ApiToken | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedExcluded(new Set(excludedTagIds));
  }, [excludedTagIds]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'tags' && allTags.length === 0) {
      setTagsLoading(true);
      api.listTags()
        .then((res) => setAllTags(res || []))
        .catch((err) => console.error('Failed to load tags:', err))
        .finally(() => setTagsLoading(false));
    }
    if (activeTab === 'tokens') {
      setTokensLoading(true);
      api.listApiTokens()
        .then((res) => setTokens(res.tokens || []))
        .catch((err) => setTokenError(err.message || 'Failed to load tokens'))
        .finally(() => setTokensLoading(false));
    }
  }, [user, activeTab, allTags.length]);

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return allTags;
    const q = tagSearch.toLowerCase();
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, tagSearch]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');
    try {
      const updatedUser = await api.uploadUserAvatar(file);
      updateUserAvatar(updatedUser);
      setAvatarSuccess('Profile avatar updated successfully!');
    } catch (err: unknown) {
      if (err instanceof Error) setAvatarError(err.message || 'Failed to upload avatar');
      else setAvatarError('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveTags = async () => {
    setSavingTags(true);
    setTagMessage('');
    try {
      await saveExcludedTags(Array.from(selectedExcluded));
      setTagMessage('Tag exclusion preferences saved successfully!');
      setTimeout(() => setTagMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to save excluded tags');
    } finally {
      setSavingTags(false);
    }
  };

  const toggleExclude = (tagId: string) => {
    const next = new Set(selectedExcluded);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setSelectedExcluded(next);
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      setTokenError('Please provide a name for the API token');
      return;
    }
    setTokenError('');
    setCreatingToken(true);
    setNewlyCreatedToken(null);
    setCopied(false);
    try {
      const created = await api.createApiToken(newTokenName.trim());
      setNewlyCreatedToken(created);
      setNewTokenName('');
      setTokens([created, ...tokens]);
    } catch (err: unknown) {
      if (err instanceof Error) setTokenError(err.message || 'Failed to generate token');
      else setTokenError('Failed to generate token');
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to revoke token "${name}"? Access will be lost immediately.`)) {
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
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '16px 0' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
          Account & Profile
        </h1>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
          Manage your user avatar, persistent tag filtering preferences, and automation API keys.
        </p>
      </div>

      {/* Standard Ekokan Tabs */}
      <div className="artist-tabs">
        <div
          className={`artist-tabs__tab ${activeTab === 'profile' ? 'artist-tabs__tab--active' : ''}`}
          onClick={() => setSearchParams({ tab: 'profile' })}
        >
          Profile & Avatar
        </div>
        <div
          className={`artist-tabs__tab ${activeTab === 'tags' ? 'artist-tabs__tab--active' : ''}`}
          onClick={() => setSearchParams({ tab: 'tags' })}
        >
          Excluded Tags Filter ({selectedExcluded.size})
        </div>
        <div
          className={`artist-tabs__tab ${activeTab === 'tokens' ? 'artist-tabs__tab--active' : ''}`}
          onClick={() => setSearchParams({ tab: 'tokens' })}
        >
          API Tokens & Keys
        </div>
      </div>

      {/* TAB: PROFILE & AVATAR */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
            Profile Details
          </h2>

          {avatarError && <div className="form-error">⚠️ {avatarError}</div>}
          {avatarSuccess && <div className="form-success">✓ {avatarSuccess}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {(user.display_name || user.username).charAt(0)}
                </span>
              )}
            </div>

            <div>
              <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {user.display_name || user.username}
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Username: <strong>@{user.username}</strong> &bull; Role: <strong style={{ color: 'var(--accent)' }}>{user.role}</strong>
              </div>
              <label className="btn-secondary" style={{ cursor: uploadingAvatar ? 'wait' : 'pointer', fontSize: 'var(--fs-xs)' }}>
                {uploadingAvatar ? 'Uploading Avatar...' : 'Change Profile Avatar'}
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB: EXCLUDED TAGS FILTER */}
      {activeTab === 'tags' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Persistent Tag Exclusion ("Não ver X tags")
          </h2>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
            Select tags you wish to hide completely across Ekokan. Posts bearing these tags will be filtered out from your recent feed and artist pages automatically.
          </p>

          {tagMessage && <div className="form-success">{tagMessage}</div>}

          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search tags by name..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              style={{ width: '100%', maxWidth: '350px', background: 'var(--bg-input)' }}
            />
          </div>

          {tagsLoading ? (
            <div className="loading">Loading available tags...</div>
          ) : allTags.length === 0 ? (
            <div className="empty-state">No tags created yet in this gallery.</div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {filteredTags.map((tag) => {
                const isExcluded = selectedExcluded.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleExclude(tag.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: isExcluded ? 'var(--danger)' : 'var(--bg-card)',
                      color: isExcluded ? '#fff' : 'var(--text-secondary)',
                      fontSize: 'var(--fs-xs)',
                      fontWeight: isExcluded ? 600 : 400,
                      transition: 'background var(--transition-fast)'
                    }}
                  >
                    {isExcluded ? '🚫 ' : '+ '}{tag.name} {isExcluded && '(Hidden)'}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {selectedExcluded.size > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedExcluded(new Set())}
                disabled={savingTags}
              >
                Clear All Exclusions
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveTags}
              disabled={savingTags}
            >
              {savingTags ? 'Saving...' : 'Save Filter Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* TAB: API TOKENS */}
      {activeTab === 'tokens' && (
        <div>
          <div style={{ background: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Generate New API Token
            </h2>
            <form onSubmit={handleCreateToken} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Token description (e.g., importer automation script)"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                disabled={creatingToken}
                style={{ flex: '1 1 280px', background: 'var(--bg-input)' }}
                maxLength={100}
              />
              <button type="submit" className="btn-primary" disabled={creatingToken || !newTokenName.trim()}>
                {creatingToken ? 'Generating...' : '+ Generate Token'}
              </button>
            </form>
            {tokenError && <div className="form-error" style={{ marginTop: '12px', marginBottom: 0 }}>⚠️ {tokenError}</div>}
          </div>

          {newlyCreatedToken && newlyCreatedToken.token && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontWeight: 600, color: 'var(--success)', fontSize: 'var(--fs-sm)', marginBottom: '6px' }}>
                ✓ API Token Generated Successfully
              </div>
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Please copy this token now. For security reasons, it will not be displayed again.
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {newlyCreatedToken.token}
                </code>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="btn-secondary"
                  style={{ fontSize: 'var(--fs-xs)' }}
                >
                  {copied ? '✓ Copied!' : 'Copy Token'}
                </button>
              </div>
            </div>
          )}

          <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Active Tokens ({tokens.length})
          </h2>

          {tokensLoading ? (
            <div className="loading">Loading active tokens...</div>
          ) : tokens.length === 0 ? (
            <div className="empty-state" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              No active API tokens found for your account.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tokens.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-card)',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <span>Prefix: <code>{t.token_prefix}...</code></span>
                      <span>Created: {new Date(t.created_at).toLocaleDateString()}</span>
                      <span>Last used: {t.last_used_at ? new Date(t.last_used_at).toLocaleString() : 'Never'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevokeToken(t.id, t.name)}
                    className="btn-danger"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
