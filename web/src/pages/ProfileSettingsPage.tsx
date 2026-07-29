import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { ApiToken, Tag } from '../types/models';
import { Navigate, useSearchParams } from 'react-router-dom';

export default function ProfileSettingsPage() {
  const { user, excludedTagIds, saveExcludedTags, updateUserAvatar, logout } = useAuth();
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
      setTagMessage('✓ Persistent tag exclusions updated!');
      setTimeout(() => setTagMessage(''), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) setTagMessage('Error: ' + err.message);
    } finally {
      setSavingTags(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    const next = new Set(selectedExcluded);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setSelectedExcluded(next);
  };

  // API Token functions
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      setTokenError('Please provide a description for the API token');
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
    if (!window.confirm(`Are you sure you want to revoke token "${name}"?`)) return;
    try {
      await api.deleteApiToken(id);
      setTokens(tokens.filter((t) => t.id !== id));
      if (newlyCreatedToken?.id === id) setNewlyCreatedToken(null);
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

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return allTags.slice(0, 50);
    const lower = tagSearch.toLowerCase();
    return allTags.filter(t => t.name.toLowerCase().includes(lower) || t.slug.includes(lower)).slice(0, 50);
  }, [allTags, tagSearch]);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '32px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.4)',
        marginBottom: '32px',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '250px', height: '250px', background: 'radial-gradient(circle, var(--accent) 0%, rgba(0,0,0,0) 70%)', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />

        {/* Avatar Display & Upload */}
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <label
            htmlFor="avatar-input"
            title="Click to change profile picture"
            style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--color-primary), var(--accent))',
              border: '3px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
              transition: 'transform 0.2s, border-color 0.2s',
              position: 'relative'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.display_name || user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '-1px' }}>
                {(user.display_name || user.username).charAt(0)}
              </span>
            )}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              textAlign: 'center',
              padding: '2px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {uploadingAvatar ? '...' : 'Edit 📷'}
            </div>
          </label>
          <input
            id="avatar-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
            disabled={uploadingAvatar}
          />
        </div>

        {/* User Details */}
        <div style={{ zIndex: 1, flexGrow: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              {user.display_name || user.username}
            </h1>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '3px 10px',
              borderRadius: '999px',
              background: user.role === 'admin' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)'
            }}>
              {user.role === 'admin' ? '⚡ Administrator' : '👤 Collector'}
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            @{user.username} {user.email ? `• ${user.email}` : ''} • Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
          {(avatarError || avatarSuccess) && (
            <div style={{ marginTop: '10px', fontSize: '13px', fontWeight: 600, color: avatarError ? '#ef4444' : '#10b981' }}>
              {avatarError ? `⚠️ ${avatarError}` : `✓ ${avatarSuccess}`}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        borderBottom: '2px solid rgba(255,255,255,0.08)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'profile', label: '👤 Account & Avatar', desc: 'Profile photo & settings' },
          { id: 'tags', label: '🚫 Content Filter & Tag Blacklist', desc: 'Não ver X tags persistently' },
          { id: 'tokens', label: '🔑 API Tokens', desc: 'Manage automation credentials' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              style={{
                background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.25))' : 'rgba(255,255,255,0.03)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                padding: '12px 20px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 4px 20px rgba(168, 85, 247, 0.2)' : 'none'
              }}
            >
              <div>{tab.label}</div>
              <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.7, marginTop: '2px' }}>{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Account Profile & Avatar */}
      {activeTab === 'profile' && (
        <div style={{ background: 'var(--bg-elevated)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>Profile Customization</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', fontSize: '15px' }}>
            Your profile photo is displayed across Ekokan in navigation bars and comment threads. You can upload any JPEG, PNG, WEBP, or GIF image up to 10MB.
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '32px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, var(--color-primary), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase' }}>
                  {(user.display_name || user.username).charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>Avatar Status</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {user.avatar_url ? 'Custom avatar image is currently active.' : 'Using default initial avatar.'}
              </p>
            </div>
            <label
              htmlFor="avatar-input-inner"
              style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                transition: 'opacity 0.2s',
                border: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              {uploadingAvatar ? 'Uploading...' : '📤 Upload New Photo'}
            </label>
            <input
              id="avatar-input-inner"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', color: '#ef4444' }}>Session Management</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Terminate your active session on this device.</p>
            </div>
            <button
              onClick={logout}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Excluded Tags (Persistent Blacklist) */}
      {activeTab === 'tags' && (
        <div style={{ background: 'var(--bg-elevated)', padding: '28px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px', color: '#fff' }}>
                🚫 Persistent Tag Blacklist ("Não ver X tags")
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                Select tags to permanently hide from your view across Ekokan. Any post tagged with these will be automatically filtered out when you browse artist portfolios or recent feeds.
              </p>
            </div>
            <button
              onClick={handleSaveTags}
              disabled={savingTags}
              style={{
                background: savingTags ? 'var(--bg-card)' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: savingTags ? 'not-allowed' : 'pointer',
                boxShadow: savingTags ? 'none' : '0 4px 18px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {savingTags ? '⏳ Saving...' : '💾 Save Blacklist'}
            </button>
          </div>

          {tagMessage && (
            <div style={{
              padding: '12px 18px',
              borderRadius: '10px',
              background: tagMessage.includes('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: tagMessage.includes('Error') ? '#ef4444' : '#34d399',
              border: `1px solid ${tagMessage.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              marginBottom: '20px',
              fontWeight: 600
            }}>
              {tagMessage}
            </div>
          )}

          {/* Currently Excluded Chips */}
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
              Currently Excluded Tags ({selectedExcluded.size})
            </h3>
            {selectedExcluded.size === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0, fontSize: '13px' }}>
                No tags excluded yet. Search and click tags below to add them to your blacklist.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Array.from(selectedExcluded).map(id => {
                  const tag = allTags.find(t => t.id === id);
                  return (
                    <div
                      key={id}
                      style={{
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3))',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        color: '#fca5a5',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>🚫 #{tag ? tag.name : 'Unknown Tag'}</span>
                      <button
                        onClick={() => handleToggleTag(id)}
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, fontWeight: 800, opacity: 0.7 }}
                        title="Remove from blacklist"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search & Tag Picker */}
          <div>
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="🔍 Search available tags to blacklist..."
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                marginBottom: '16px'
              }}
            />

            {tagsLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tag repository...</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '360px', overflowY: 'auto', padding: '4px' }}>
                {filteredTags.map((tag) => {
                  const isEx = selectedExcluded.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      style={{
                        background: isEx ? 'linear-gradient(135deg, #ef4444, #b91c1c)' : 'rgba(255,255,255,0.06)',
                        color: '#fff',
                        border: isEx ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: isEx ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isEx ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
                      }}
                    >
                      <span>{isEx ? '🚫' : '+'} #{tag.name}</span>
                      <span style={{ opacity: 0.6, fontSize: '11px' }}>({tag.post_count})</span>
                    </button>
                  );
                })}
                {filteredTags.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No matching tags found.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: API Tokens */}
      {activeTab === 'tokens' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🔑 API Tokens & Automation Credentials
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
              Generate secure authentication tokens for tools like <code style={{ color: '#34d399', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>kemono-dl</code> or CLI scripts without sharing your account password.
            </p>
          </div>

          {tokenError && (
            <div style={{ padding: '12px 18px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: '10px', marginBottom: '20px' }}>
              ⚠️ {tokenError}
            </div>
          )}

          {newlyCreatedToken && newlyCreatedToken.token && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.2) 100%)',
              border: '1px solid rgb(16, 185, 129)',
              borderRadius: '16px',
              padding: '22px',
              marginBottom: '32px',
              boxShadow: '0 8px 30px rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', fontWeight: '700', fontSize: '16px', marginBottom: '8px' }}>
                🎉 API Token Generated Successfully!
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Copy your token now. For security reasons, <strong>it will never be displayed again once you close or refresh this page</strong>.
              </p>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0, 0, 0, 0.5)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <code style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px', color: '#fff', wordBreak: 'break-all' }}>
                  {newlyCreatedToken.token}
                </code>
                <button
                  onClick={copyToClipboard}
                  style={{
                    background: copied ? '#10b981' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
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
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            marginBottom: '32px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '14px' }}>Generate New Access Token</h3>
            <form onSubmit={handleCreateToken} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="Token description (e.g., desktop syncer script)"
                disabled={creatingToken}
                style={{
                  flex: 1,
                  minWidth: '260px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={creatingToken || !newTokenName.trim()}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  cursor: creatingToken ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                {creatingToken ? 'Creating...' : '+ Generate Token'}
              </button>
            </form>
          </div>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Active Tokens ({tokens.length})</h3>
            </div>

            {tokensLoading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tokens...</div>
            ) : tokens.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active API tokens found. Create one above to get started!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tokens.map((t, index) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 24px',
                      borderBottom: index < tokens.length - 1 ? '1px solid var(--border-color)' : 'none',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', color: '#fff', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🔑 {t.name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                        Created on {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeToken(t.id, t.name)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                    >
                      Revoke Access
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
