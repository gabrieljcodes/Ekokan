import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { ApiToken, Tag } from '../types/models';
import { Navigate, useSearchParams } from 'react-router-dom';
import { IconUser, IconWarning, IconCheck, IconPlus, IconTrash, IconBan, IconCopy, IconRefresh, IconKey } from '../components/Icons';

interface TokenItemProps {
  token: ApiToken;
  onRevoke: (id: string) => void;
}

const TokenListItem = React.memo(function TokenListItem({ token, onRevoke }: TokenItemProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div className="profile-settings__token-item motion-arrive-row">
      <div>
        <div className="profile-settings__token-name">
          {token.name}
        </div>
        <div className="profile-settings__token-meta">
          <span>Prefix: <code>{token.token_prefix}...</code></span>
          <span>Created: {new Date(token.created_at).toLocaleDateString()}</span>
          <span>Last used: {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}</span>
        </div>
      </div>
      <div className="profile-settings__token-actions">
        {!isConfirming ? (
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className="btn-danger"
            title={`Revoke token ${token.name}`}
            aria-label={`Revoke automation token ${token.name}`}
          >
            <IconTrash size={16} aria-hidden={true} />
            <span>Revoke</span>
          </button>
        ) : (
          <div className="profile-settings__token-confirm-group" role="group" aria-label="Confirm token revocation">
            <span className="profile-settings__confirm-notice">Revoke immediately?</span>
            <button
              type="button"
              onClick={() => onRevoke(token.id)}
              className="btn-danger"
              title="Confirm permanent revocation"
            >
              <IconTrash size={14} aria-hidden={true} />
              <span>Confirm Revocation</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              className="btn-secondary"
            >
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

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
  const [tagError, setTagError] = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);

  // API Tokens state
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [creatingToken, setCreatingToken] = useState(false);
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

  useEffect(() => {
    setSelectedExcluded(new Set(excludedTagIds));
  }, [excludedTagIds]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'tags' && allTags.length === 0) {
      setTagsLoading(true);
      api.listTags()
        .then((res) => {
          if (isMountedRef.current) setAllTags(res || []);
        })
        .catch((err: unknown) => {
          console.error('Failed to load tags:', err);
          if (isMountedRef.current) {
            setTagError((err as Error).message || 'Failed to load available tag catalog.');
          }
        })
        .finally(() => {
          if (isMountedRef.current) setTagsLoading(false);
        });
    }
    if (activeTab === 'tokens') {
      setTokensLoading(true);
      api.listApiTokens()
        .then((res) => {
          if (isMountedRef.current) setTokens(res.tokens || []);
        })
        .catch((err: unknown) => {
          if (isMountedRef.current) {
            setTokenError((err as Error).message || 'Failed to load automation tokens');
          }
        })
        .finally(() => {
          if (isMountedRef.current) setTokensLoading(false);
        });
    }
  }, [user, activeTab, allTags.length]);

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return allTags;
    const q = tagSearch.toLowerCase().trim();
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, tagSearch]);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');
    try {
      const updatedUser = await api.uploadUserAvatar(file);
      if (isMountedRef.current) {
        updateUserAvatar(updatedUser);
        setAvatarSuccess('Profile avatar illustration updated successfully!');
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        if (err instanceof Error) setAvatarError(err.message || 'Failed to upload avatar');
        else setAvatarError('Failed to upload profile avatar');
      }
    } finally {
      if (isMountedRef.current) setUploadingAvatar(false);
    }
  }, [updateUserAvatar]);

  const handleSaveTags = useCallback(async () => {
    setSavingTags(true);
    setTagMessage('');
    setTagError('');
    try {
      await saveExcludedTags(Array.from(selectedExcluded));
      if (isMountedRef.current) {
        setTagMessage('Tag exclusion preferences saved and applied globally!');
        const timer = window.setTimeout(() => {
          if (isMountedRef.current) setTagMessage('');
        }, 4000);
        registerTimer(timer);
      }
    } catch (err: unknown) {
      console.error(err);
      if (isMountedRef.current) {
        setTagError((err as Error).message || 'Failed to save excluded tag preferences.');
      }
    } finally {
      if (isMountedRef.current) setSavingTags(false);
    }
  }, [saveExcludedTags, selectedExcluded, registerTimer]);

  const toggleExclude = useCallback((tagId: string) => {
    setSelectedExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const handleCreateToken = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) {
      setTokenError('Please provide a descriptive name for the API token');
      return;
    }
    setTokenError('');
    setCreatingToken(true);
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
        if (err instanceof Error) setTokenError(err.message || 'Failed to generate token');
        else setTokenError('Failed to generate API token');
      }
    } finally {
      if (isMountedRef.current) setCreatingToken(false);
    }
  }, [newTokenName]);

  const handleRevokeToken = useCallback(async (id: string) => {
    setTokenError('');
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
        setTokenError((err as Error).message || 'Error revoking token. Please try again.');
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
        }, 3000);
        registerTimer(timer);
      }
    }
  }, [newlyCreatedToken, registerTimer]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <main role="main" className="profile-settings__container">
      <header className="profile-settings__header">
        <h1 className="profile-settings__title">
          <IconUser size={32} aria-hidden={true} />
          <span>Account & Profile Settings</span>
        </h1>
        <p className="profile-settings__subtitle">
          Manage your user avatar illustration, persistent content filtering preferences, and automation API keys.
        </p>
      </header>

      {/* Accessible WAI-ARIA Navigation Tabs with Roving TabIndex */}
      <nav aria-label="Account Settings Sections">
        <div className="artist-tabs" role="tablist" aria-label="Settings configuration tabs">
          <button
            type="button"
            id="tab-profile"
            role="tab"
            aria-selected={activeTab === 'profile'}
            aria-controls="panel-profile"
            tabIndex={activeTab === 'profile' ? 0 : -1}
            className={`artist-tabs__tab ${activeTab === 'profile' ? 'artist-tabs__tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'profile' })}
          >
            <span>Profile & Avatar</span>
          </button>
          <button
            type="button"
            id="tab-tags"
            role="tab"
            aria-selected={activeTab === 'tags'}
            aria-controls="panel-tags"
            tabIndex={activeTab === 'tags' ? 0 : -1}
            className={`artist-tabs__tab ${activeTab === 'tags' ? 'artist-tabs__tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'tags' })}
          >
            <span>Excluded Tags Filter ({selectedExcluded.size})</span>
          </button>
          <button
            type="button"
            id="tab-tokens"
            role="tab"
            aria-selected={activeTab === 'tokens'}
            aria-controls="panel-tokens"
            tabIndex={activeTab === 'tokens' ? 0 : -1}
            className={`artist-tabs__tab ${activeTab === 'tokens' ? 'artist-tabs__tab--active' : ''}`}
            onClick={() => setSearchParams({ tab: 'tokens' })}
          >
            <span>API Tokens & Keys</span>
          </button>
        </div>
      </nav>

      {/* TAB: PROFILE & AVATAR */}
      {activeTab === 'profile' && (
        <section
          id="panel-profile"
          role="tabpanel"
          aria-labelledby="tab-profile"
          className="profile-settings__card motion-arrive-row"
        >
          <h2 className="profile-settings__card-title">
            Profile Details & Credentials
          </h2>

          {avatarError && (
            <div className="form-error" role="alert" aria-live="assertive">
              <IconWarning size={18} aria-hidden={true} />
              <span>{avatarError}</span>
            </div>
          )}
          {avatarSuccess && (
            <div className="form-success" role="status" aria-live="polite">
              <IconCheck size={18} aria-hidden={true} />
              <span>{avatarSuccess}</span>
            </div>
          )}

          <div className="profile-settings__avatar-row">
            <div className="profile-settings__avatar-circle">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`Profile avatar illustration of ${user.username}`}
                  className="profile-settings__avatar-img"
                  decoding="async"
                />
              ) : (
                <span className="profile-settings__avatar-fallback" aria-hidden={true}>
                  {(user.display_name || user.username).charAt(0)}
                </span>
              )}
            </div>

            <div>
              <div className="profile-settings__user-name">
                {user.display_name || user.username}
              </div>
              <div className="profile-settings__user-meta">
                Username: <strong>@{user.username}</strong> &bull; Role: <strong className="profile-settings__role-accent">{user.role}</strong> &bull; <em>Supports PNG, JPG, WebP &amp; animated GIF</em>
              </div>

              <label
                htmlFor="avatar-upload-input"
                className={`btn-primary profile-settings__avatar-btn ${uploadingAvatar ? 'profile-settings__avatar-btn--waiting' : ''}`}
              >
                {uploadingAvatar ? (
                  <>
                    <IconRefresh size={14} aria-hidden={true} />
                    <span>Uploading Avatar...</span>
                  </>
                ) : (
                  <>
                    <IconUser size={14} aria-hidden={true} />
                    <span>Change Profile Avatar</span>
                  </>
                )}
              </label>
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                className="sr-only"
                aria-label="Upload new profile avatar illustration image (PNG, JPG, WebP, or animated GIF)"
              />
            </div>
          </div>
        </section>
      )}

      {/* TAB: EXCLUDED TAGS FILTER */}
      {activeTab === 'tags' && (
        <section
          id="panel-tags"
          role="tabpanel"
          aria-labelledby="tab-tags"
          className="profile-settings__card motion-arrive-row"
        >
          <h2 className="profile-settings__card-title profile-settings__card-title--sm-margin">
            Persistent Tag Exclusion ("Não ver X tags")
          </h2>
          <p className="profile-settings__card-desc">
            Select tags you wish to hide completely across Ekokan. Posts bearing these tags will be filtered out from your recent feed and artist gallery pages automatically.
          </p>

          {tagError && (
            <div className="form-error" role="alert" aria-live="assertive">
              <IconWarning size={18} aria-hidden={true} />
              <span>{tagError}</span>
            </div>
          )}
          {tagMessage && (
            <div className="form-success" role="status" aria-live="polite">
              <IconCheck size={18} aria-hidden={true} />
              <span>{tagMessage}</span>
            </div>
          )}

          <div className="profile-settings__search-wrap">
            <label htmlFor="tag-filter-search" className="sr-only">Search tag library by name</label>
            <input
              id="tag-filter-search"
              type="text"
              className="form-input profile-settings__search-input"
              placeholder="Search tags by name..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              aria-label="Search available tag library by name to exclude"
            />
          </div>

          {tagsLoading ? (
            <div className="loading" role="status" aria-live="polite">
              <IconRefresh size={22} aria-hidden={true} />
              <span>Loading available tag catalog...</span>
            </div>
          ) : allTags.length === 0 ? (
            <div className="empty-state" role="status" aria-live="polite">
              <span>No tags created yet in this gallery archive.</span>
            </div>
          ) : (
            <div className="profile-settings__tags-box" role="region" aria-label="Available tag list to exclude">
              {filteredTags.map((tag) => {
                const isExcluded = selectedExcluded.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleExclude(tag.id)}
                    aria-pressed={isExcluded}
                    className={`profile-settings__tag-pill ${isExcluded ? 'profile-settings__tag-pill--excluded' : ''}`}
                    title={isExcluded ? `Un-hide tag ${tag.name}` : `Exclude tag ${tag.name}`}
                  >
                    {isExcluded ? (
                      <IconBan size={14} aria-hidden={true} />
                    ) : (
                      <IconPlus size={14} aria-hidden={true} />
                    )}
                    <span>{tag.name} {isExcluded && '(Hidden)'}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="profile-settings__tags-actions">
            {selectedExcluded.size > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedExcluded(new Set())}
                disabled={savingTags}
              >
                <span>Clear All Exclusions</span>
              </button>
            )}
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveTags}
              disabled={savingTags}
            >
              <IconCheck size={16} aria-hidden={true} />
              <span>{savingTags ? 'Saving...' : 'Save Filter Preferences'}</span>
            </button>
          </div>
        </section>
      )}

      {/* TAB: API TOKENS */}
      {activeTab === 'tokens' && (
        <section
          id="panel-tokens"
          role="tabpanel"
          aria-labelledby="tab-tokens"
          className="motion-arrive-row"
        >
          <div className="profile-settings__token-form-card">
            <h2 className="profile-settings__token-form-title">
              Generate New Automation API Token
            </h2>
            <form onSubmit={handleCreateToken} className="profile-settings__token-form" aria-busy={creatingToken}>
              <label htmlFor="new-token-name" className="sr-only">Token description or script name</label>
              <input
                id="new-token-name"
                type="text"
                placeholder="Token description (e.g., importer automation script)"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                disabled={creatingToken}
                className="form-input profile-settings__token-input"
                maxLength={100}
                aria-label="Token description or script purpose"
              />
              <button type="submit" className="btn-primary" disabled={creatingToken || !newTokenName.trim()}>
                <IconKey size={16} aria-hidden={true} />
                <span>{creatingToken ? 'Generating...' : 'Generate Token'}</span>
              </button>
            </form>
            {tokenError && (
              <div className="form-error profile-settings__token-error-margin" role="alert" aria-live="assertive">
                <IconWarning size={18} aria-hidden={true} />
                <span>{tokenError}</span>
              </div>
            )}
          </div>

          {newlyCreatedToken && newlyCreatedToken.token && (
            <div className="profile-settings__token-success-box" role="region" aria-label="Newly generated API token">
              <div className="profile-settings__token-success-title">
                <IconCheck size={18} aria-hidden={true} />
                <span>API Token Generated Successfully</span>
              </div>
              <p className="profile-settings__token-success-desc">
                Please copy this token now. For archival security reasons, it will not be displayed again once you navigate away.
              </p>
              <div className="profile-settings__token-copy-row">
                <code className="profile-settings__token-code">
                  {newlyCreatedToken.token}
                </code>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="btn-secondary profile-settings__copy-btn"
                  aria-label="Copy newly generated token to clipboard"
                >
                  {copied ? (
                    <>
                      <IconCheck size={14} aria-hidden={true} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} aria-hidden={true} />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <h2 className="profile-settings__section-title">
            Active Tokens ({tokens.length})
          </h2>

          {tokensLoading ? (
            <div className="loading" role="status" aria-live="polite">
              <IconRefresh size={22} aria-hidden={true} />
              <span>Loading active automation tokens...</span>
            </div>
          ) : tokens.length === 0 ? (
            <div className="empty-state profile-settings__empty-card" role="status" aria-live="polite">
              <span>No active API tokens found for your user account.</span>
            </div>
          ) : (
            <div className="profile-settings__token-list" role="region" aria-label="Active API token roster">
              {tokens.map((t) => (
                <TokenListItem key={t.id} token={t} onRevoke={handleRevokeToken} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
