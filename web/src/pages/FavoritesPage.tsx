import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Post } from '../types/models';
import ArtistCard from '../components/ArtistCard';
import PostCard from '../components/PostCard';
import { IconStar, IconHeart, IconWarning, IconRefresh, IconPlus } from '../components/Icons';

export default function FavoritesPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'artists' | 'posts'>('artists');
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(() => {
    setLoading(true);
    setError(null);
    let ignore = false;

    api.listMyFavorites()
      .then((res) => {
        if (!ignore) {
          setArtists(res.artists || []);
          setPosts(res.posts || []);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load favorites archive:', err);
          setError(err.message || 'Failed to contact the Ekokan archive service. Please check your network connection.');
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
  }, []);

  useEffect(() => {
    const cancel = fetchFavorites();
    return cancel;
  }, [fetchFavorites]);

  const handleTabChange = useCallback((tab: 'artists' | 'posts') => {
    setActiveTab(tab);
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab: 'artists' | 'posts' = activeTab === 'artists' ? 'posts' : 'artists';
      setActiveTab(nextTab);
      const nextButton = document.getElementById(`tab-${nextTab}`);
      nextButton?.focus();
    }
  };

  return (
    <div className="app-container">
      <main className="favorites-main" role="main">
        <div className="favorites-header">
          <div className="favorites-header__content">
            <h1 className="favorites-header__title">My Favorites Dashboard</h1>
            <p className="favorites-header__desc">
              Quick access to your bookmarked creators and cherished gallery updates
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Favorites collection selector"
            className="favorites-tabs"
          >
            <button
              id="tab-artists"
              type="button"
              role="tab"
              aria-selected={activeTab === 'artists'}
              aria-controls="favorites-tab-panel"
              tabIndex={activeTab === 'artists' ? 0 : -1}
              className={`btn-secondary favorites-tab-btn ${activeTab === 'artists' ? 'btn-primary' : ''}`}
              onClick={() => handleTabChange('artists')}
              onKeyDown={handleTabKeyDown}
            >
              <IconStar size={16} aria-hidden={true} />
              <span>Artists ({artists.length})</span>
            </button>
            <button
              id="tab-posts"
              type="button"
              role="tab"
              aria-selected={activeTab === 'posts'}
              aria-controls="favorites-tab-panel"
              tabIndex={activeTab === 'posts' ? 0 : -1}
              className={`btn-secondary favorites-tab-btn ${activeTab === 'posts' ? 'btn-primary' : ''}`}
              onClick={() => handleTabChange('posts')}
              onKeyDown={handleTabKeyDown}
            >
              <IconHeart size={16} aria-hidden={true} />
              <span>Posts ({posts.length})</span>
            </button>
          </div>
        </div>

        <div role="status" aria-live="polite" className="dashboard-status-region">
          {loading ? (
            <div className="loading dashboard-loading-state">
              <span className="loading-spinner" aria-hidden="true" />
              <span>Loading your favorites gallery...</span>
            </div>
          ) : error ? (
            <div className="dashboard-error-card" role="alert">
              <IconWarning size={40} className="dashboard-error__icon" aria-hidden={true} />
              <h2 className="dashboard-error__title">Collection Offline</h2>
              <p className="dashboard-error__desc">{error}</p>
              <button
                type="button"
                className="btn-primary dashboard-error__retry"
                onClick={() => fetchFavorites()}
              >
                <IconRefresh size={16} aria-hidden={true} />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : (
            <div
              id="favorites-tab-panel"
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}
              className="favorites-panel"
            >
              {activeTab === 'artists' ? (
                artists.length === 0 ? (
                  <div className="empty-state dashboard-empty-card">
                    <IconStar size={48} className="dashboard-empty__icon" aria-hidden={true} />
                    <h2 className="dashboard-empty__title">No bookmarked creators</h2>
                    <p className="dashboard-empty__desc">
                      You haven&apos;t added any creators to your personal favorites yet. Explore the catalog to start collecting.
                    </p>
                    <Link to="/" className="btn-primary dashboard-empty__cta">
                      <IconPlus size={16} aria-hidden={true} />
                      <span>Explore Artist Directory</span>
                    </Link>
                  </div>
                ) : (
                  <div className="artist-grid">
                    {artists.map((artist, index) => (
                      <ArtistCard
                        key={artist.id}
                        artist={artist}
                        style={{ '--card-idx': Math.min(index, 6) } as React.CSSProperties}
                      />
                    ))}
                  </div>
                )
              ) : (
                posts.length === 0 ? (
                  <div className="empty-state dashboard-empty-card">
                    <IconHeart size={48} className="dashboard-empty__icon" aria-hidden={true} />
                    <h2 className="dashboard-empty__title">No liked or favorited posts</h2>
                    <p className="dashboard-empty__desc">
                      No artwork or creator posts have been saved to your archive collection yet.
                    </p>
                    <Link to="/" className="btn-primary dashboard-empty__cta">
                      <IconPlus size={16} aria-hidden={true} />
                      <span>Browse Recent Posts</span>
                    </Link>
                  </div>
                ) : (
                  <div className="post-grid">
                    {posts.map((post, index) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        artistSlug={post.artist?.slug || 'unknown'}
                        style={{ '--card-idx': Math.min(index, 6) } as React.CSSProperties}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
