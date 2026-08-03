import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { UserProfileData } from '../types/models';
import ArtistCard from '../components/ArtistCard';
import PostCard from '../components/PostCard';
import { IconUser, IconStar, IconHeart, IconWarning, IconRefresh, IconBolt } from '../components/Icons';

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCommentDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'artists' | 'posts'>('comments');

  const fetchProfile = useCallback(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    let ignore = false;

    api.getUserProfile(username)
      .then((res) => {
        if (!ignore) {
          setData(res);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load user profile:', err);
          setError(err.message || 'Failed to contact the Ekokan archive service or user not found.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [username]);

  useEffect(() => {
    const cancel = fetchProfile();
    return cancel;
  }, [fetchProfile]);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const tabs: Array<'comments' | 'artists' | 'posts'> = ['comments', 'artists', 'posts'];
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex = e.key === 'ArrowRight' ? (currentIndex + 1) % tabs.length : (currentIndex - 1 + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      setActiveTab(nextTab);
      document.getElementById(`profile-tab-${nextTab}`)?.focus();
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <main className="profile-main" role="main" aria-busy="true">
          <div className="empty-state">
            <p>Loading member activity archive...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="app-container">
        <main className="profile-main" role="main">
          <div className="empty-state empty-state--error" role="alert">
            <IconWarning size={48} aria-hidden={true} />
            <h3 className="empty-state__title">Member Profile Unavailable</h3>
            <p className="empty-state__desc">{error || 'This user profile could not be located in the Ekokan database.'}</p>
            <button type="button" onClick={fetchProfile} className="btn-primary">
              <IconRefresh size={16} aria-hidden={true} />
              <span>Retry Connection</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { user, comments, favorite_artists, favorite_posts } = data;
  const isAdmin = user.role === 'admin';

  return (
    <div className="app-container">
      <main className="profile-main" role="main">
        {/* Impeccable Profile Banner Card */}
        <section className="profile-banner-card" aria-label={`Profile banner for ${user.display_name || user.username}`}>
          <div className="profile-banner-card__header-gradient">
            {user.banner_url && (
              <img
                src={user.banner_url}
                alt={`${user.username}'s customized header banner`}
                className="profile-banner-card__header-img"
                fetchPriority="high"
                decoding="async"
              />
            )}
          </div>
          <div className="profile-banner-card__content">
            <div className="profile-banner-card__avatar-wrapper">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.username}'s avatar`}
                  className="profile-banner-card__avatar"
                  width={108}
                  height={108}
                  fetchPriority="high"
                />
              ) : (
                <div className="profile-banner-card__avatar-fallback" role="img" aria-label="Default profile icon">
                  <IconUser size={56} aria-hidden={true} />
                </div>
              )}
              {isAdmin && (
                <span className="profile-banner-card__role-badge" title="Archive Administrator">
                  <IconBolt size={14} aria-hidden={true} />
                  <span>Admin</span>
                </span>
              )}
            </div>
            <div className="profile-banner-card__info">
              <h1 className="profile-banner-card__display-name">
                {user.display_name || user.username}
              </h1>
              <p className="profile-banner-card__handle">
                @{user.username} &bull; <span className="profile-banner-card__joined">Member since {formatDate(user.created_at)}</span>
              </p>
            </div>
          </div>

          <div className="profile-banner-card__stats-toolbar">
            <div className="profile-stat-item">
              <span className="profile-stat-item__value">{comments.length}</span>
              <span className="profile-stat-item__label">Comments</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-item__value">{favorite_artists.length}</span>
              <span className="profile-stat-item__label">Favorited Artists</span>
            </div>
            <div className="profile-stat-item">
              <span className="profile-stat-item__value">{favorite_posts.length}</span>
              <span className="profile-stat-item__label">Favorited Posts</span>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="favorites-tabs profile-tabs" role="tablist" aria-label="Member activity collection selector">
          <button
            id="profile-tab-comments"
            type="button"
            role="tab"
            aria-selected={activeTab === 'comments'}
            aria-controls="profile-tab-panel"
            tabIndex={activeTab === 'comments' ? 0 : -1}
            className={`btn-secondary favorites-tab-btn ${activeTab === 'comments' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('comments')}
            onKeyDown={handleTabKeyDown}
          >
            <IconUser size={16} aria-hidden={true} />
            <span>Comments ({comments.length})</span>
          </button>
          <button
            id="profile-tab-artists"
            type="button"
            role="tab"
            aria-selected={activeTab === 'artists'}
            aria-controls="profile-tab-panel"
            tabIndex={activeTab === 'artists' ? 0 : -1}
            className={`btn-secondary favorites-tab-btn ${activeTab === 'artists' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('artists')}
            onKeyDown={handleTabKeyDown}
          >
            <IconStar size={16} aria-hidden={true} />
            <span>Favorited Artists ({favorite_artists.length})</span>
          </button>
          <button
            id="profile-tab-posts"
            type="button"
            role="tab"
            aria-selected={activeTab === 'posts'}
            aria-controls="profile-tab-panel"
            tabIndex={activeTab === 'posts' ? 0 : -1}
            className={`btn-secondary favorites-tab-btn ${activeTab === 'posts' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('posts')}
            onKeyDown={handleTabKeyDown}
          >
            <IconHeart size={16} aria-hidden={true} />
            <span>Favorited Posts ({favorite_posts.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div id="profile-tab-panel" role="tabpanel" aria-labelledby={`profile-tab-${activeTab}`} className="profile-tab-panel">
          {activeTab === 'comments' && (
            <section aria-label="User comments history" className="profile-comments-list">
              {comments.length === 0 ? (
                <div className="empty-state">
                  <IconUser size={48} aria-hidden={true} />
                  <h3 className="empty-state__title">No comments yet</h3>
                  <p className="empty-state__desc">This member hasn't left any public commentary on archive posts yet.</p>
                </div>
              ) : (
                <div className="profile-comments-grid">
                  {comments.map((comment) => {
                    const postLink = comment.artist_slug && comment.post_id
                      ? `/artist/${comment.artist_slug}/post/${comment.post_id}`
                      : null;

                    return (
                      <article key={comment.id} className="profile-comment-card" aria-label={`Comment from ${formatCommentDate(comment.created_at)}`}>
                        <div className="profile-comment-card__header">
                          <time className="profile-comment-card__time" dateTime={comment.created_at}>
                            {formatCommentDate(comment.created_at)}
                          </time>
                          {postLink && (
                            <Link to={postLink} className="profile-comment-card__post-link">
                              On Post: <strong>{comment.post_title || 'Untitled'}</strong> {comment.artist_name && `by ${comment.artist_name}`} &rarr;
                            </Link>
                          )}
                        </div>
                        <div className="profile-comment-card__body">
                          {comment.content}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'artists' && (
            <section aria-label="Favorited artists collection">
              {favorite_artists.length === 0 ? (
                <div className="empty-state">
                  <IconStar size={48} aria-hidden={true} />
                  <h3 className="empty-state__title">No favorited artists yet</h3>
                  <p className="empty-state__desc">When this member favorites creator profiles, they will appear right here.</p>
                </div>
              ) : (
                <div className="artist-grid">
                  {favorite_artists.map((artist, index) => (
                    <ArtistCard
                      key={artist.id}
                      artist={artist}
                      style={{ '--card-idx': Math.min(index, 6) } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'posts' && (
            <section aria-label="Favorited posts collection">
              {favorite_posts.length === 0 ? (
                <div className="empty-state">
                  <IconHeart size={48} aria-hidden={true} />
                  <h3 className="empty-state__title">No favorited posts yet</h3>
                  <p className="empty-state__desc">When this member bookmarks archive gallery posts, they will show up here.</p>
                </div>
              ) : (
                <div className="post-grid">
                  {favorite_posts.map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      artistSlug={post.artist?.slug || 'unknown'}
                      style={{ '--card-idx': Math.min(index, 6) } as React.CSSProperties}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
