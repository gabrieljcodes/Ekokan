import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Post, PaginatedResult, Tag } from '../types/models';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';

export default function ArtistPage() {
  const { slug } = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const { user, isFavoriteArtist, toggleFavoriteArtist } = useAuth();
  const favorited = artist ? (isFavoriteArtist(artist.id) || artist.is_favorited) : false;
  const [posts, setPosts] = useState<PaginatedResult<Post> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Mass Tagging State
  const [isMassTagging, setIsMassTagging] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [tagSearch, setTagSearch] = useState('');
  const [taggingStatus, setTaggingStatus] = useState<string | null>(null);
  const [taggingLoading, setTaggingLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getArtist(slug)
      .then(setArtist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    api.listArtistPosts(slug, page, 25, search)
      .then(setPosts)
      .catch(console.error);
  }, [slug, page, search]);

  useEffect(() => {
    if (isMassTagging && availableTags.length === 0) {
      api.listTags().then(setAvailableTags).catch(console.error);
    }
  }, [isMassTagging, availableTags.length]);

  const handleTogglePostSelect = (id: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectCurrentPage = () => {
    if (!posts?.data) return;
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      posts.data.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDeselectCurrentPage = () => {
    if (!posts?.data) return;
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      posts.data.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const handleToggleTagSelect = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const executeMassTag = async (action: 'add' | 'remove') => {
    if (selectedPostIds.size === 0) {
      alert('Please select at least one post to modify.');
      return;
    }
    if (selectedTagIds.size === 0) {
      alert('Please select at least one tag from the library.');
      return;
    }
    if (!user) {
      alert('You must be logged in to modify tags.');
      return;
    }
    setTaggingLoading(true);
    setTaggingStatus(null);
    try {
      await api.massTagPosts(Array.from(selectedPostIds), Array.from(selectedTagIds), action);
      setTaggingStatus(`Successfully ${action === 'add' ? 'applied' : 'removed'} tags on ${selectedPostIds.size} post(s)!`);
      if (slug) {
        const res = await api.listArtistPosts(slug, page, 25, search);
        setPosts(res);
      }
      setTimeout(() => setTaggingStatus(null), 5000);
    } catch (err: any) {
      alert('Error during mass tagging: ' + (err.message || err));
    } finally {
      setTaggingLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading artist...</div>;
  }

  if (!artist) {
    return (
      <div className="app-container">
        <div className="empty-state">Artist not found</div>
        <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem' }}>
          ← Back to artists
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Banner */}
      {artist.banner_url ? (
        <img src={artist.banner_url} alt="" className="artist-banner" />
      ) : (
        <div className="artist-banner" />
      )}

      {/* Profile */}
      <div className="artist-profile">
        {artist.avatar_url ? (
          <img src={artist.avatar_url} alt={artist.name} className="artist-profile__avatar" />
        ) : (
          <div className="artist-profile__avatar" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 700, color: 'var(--text-muted)',
          }}>
            {artist.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="artist-profile__info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 className="artist-profile__name" style={{ margin: 0 }}>{artist.name}</h1>
            <button
              onClick={async () => {
                if (!user) { alert('Please login to favorite creators'); return; }
                try { await toggleFavoriteArtist(artist.id); } catch (e) { console.error(e); }
              }}
              className={`btn-secondary ${favorited ? 'fav-btn--active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: 'var(--fs-sm)' }}
            >
              {favorited ? '⭐ Favorited Creator' : '☆ Favorite Creator'}
            </button>
            <Link
              to={`/artist/${artist.slug}/edit`}
              className="btn-secondary"
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: 'var(--fs-sm)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}
              title="Edit Artist Details & Profile Pictures"
            >
              ✏️ Edit Artist
            </Link>
          </div>
          {artist.bio && <p className="artist-profile__bio">{artist.bio}</p>}
        </div>
      </div>

      <div className="app-container">
        {/* Search and Action Bar */}
        <div className="action-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', marginTop: '10px' }}>
          <div className="search-bar" style={{ margin: 0, flex: 1, minWidth: '260px', maxWidth: '500px' }}>
            <span className="search-bar__icon">🔍</span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search artist's posts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setIsMassTagging(!isMassTagging);
                setTaggingStatus(null);
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid',
                borderColor: isMassTagging ? 'var(--accent)' : 'var(--border-focus)',
                background: isMassTagging
                  ? 'linear-gradient(135deg, rgba(106, 175, 230, 0.25), rgba(106, 224, 138, 0.15))'
                  : 'var(--bg-elevated)',
                color: isMassTagging ? 'var(--accent-hover)' : 'var(--text-primary)',
                boxShadow: isMassTagging ? '0 0 16px rgba(106, 175, 230, 0.25)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <span>🏷️</span>
              <span>{isMassTagging ? 'Exit Mass Tag Mode' : 'Mass Tag Mode'}</span>
              {selectedPostIds.size > 0 && (
                <span style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  {selectedPostIds.size}
                </span>
              )}
            </button>
            <Link to={`/posts/new?artist=${artist.slug}`} className="btn-primary">
              📤 + Upload Post for {artist.name}
            </Link>
          </div>
        </div>

        {/* Mass Tagging Controls Banner */}
        {isMassTagging && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(30, 30, 32, 0.95), rgba(18, 20, 24, 0.95))',
            border: '1px solid rgba(106, 175, 230, 0.35)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease'
          }}>
            {/* Top Status & Quick Selection controls */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.4rem' }}>🏷️</span>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 'var(--fs-lg)', fontWeight: 700 }}>
                    Batch Post Tagging Suite
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--fs-xs)' }}>
                    Select tags below and click on any post card across any page to maintain a persistent selection.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  background: 'rgba(106, 175, 230, 0.15)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent-hover)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 700,
                  marginRight: '8px'
                }}>
                  Selected Posts: {selectedPostIds.size}
                </span>
                <button
                  type="button"
                  onClick={handleSelectCurrentPage}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)', borderRadius: '8px' }}
                >
                  ☑️ Select Page ({posts?.data?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectCurrentPage}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)', borderRadius: '8px' }}
                >
                  ◻️ Deselect Page
                </button>
                {selectedPostIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPostIds(new Set())}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 'var(--fs-xs)', borderRadius: '8px', color: 'var(--danger)' }}
                  >
                    🗑️ Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Status feedback message */}
            {taggingStatus && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(106, 224, 138, 0.2), rgba(106, 175, 230, 0.2))',
                border: '1px solid var(--success)',
                color: '#fff',
                padding: '12px 18px',
                borderRadius: '10px',
                marginBottom: '18px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>✨ {taggingStatus}</span>
              </div>
            )}

            {/* Tag Selection section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                    Choose Tags to Apply / Remove:
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                    ({selectedTagIds.size} tags selected)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Filter tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '20px',
                      padding: '4px 12px',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--fs-xs)',
                      outline: 'none',
                      width: '180px'
                    }}
                  />
                  <Link
                    to="/tags"
                    target="_blank"
                    style={{ color: 'var(--accent)', fontSize: 'var(--fs-xs)', textDecoration: 'none', fontWeight: 600 }}
                  >
                    + Open Library ↗
                  </Link>
                </div>
              </div>

              {/* Tag pills list */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                {availableTags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()) || t.category.toLowerCase().includes(tagSearch.toLowerCase())).map((tag) => {
                  const isSel = selectedTagIds.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTagSelect(tag.id)}
                      className={`tag-badge tag-badge--${tag.category || 'general'}`}
                      style={{
                        cursor: 'pointer',
                        border: isSel ? '2px solid #fff' : '1px solid transparent',
                        transform: isSel ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: isSel ? '0 0 10px rgba(255, 255, 255, 0.4)' : 'none',
                        opacity: isSel ? 1 : 0.75,
                        padding: '6px 12px',
                        fontSize: 'var(--fs-xs)',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isSel && <span style={{ fontWeight: 900 }}>✓</span>}
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
                {availableTags.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', padding: '12px', width: '100%', textAlign: 'center' }}>
                    No tags available in library yet. <Link to="/tags" target="_blank" style={{ color: 'var(--accent)' }}>Create your first tags ↗</Link>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => executeMassTag('add')}
                  disabled={taggingLoading || selectedPostIds.size === 0 || selectedTagIds.size === 0}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: 'var(--fs-sm)',
                    fontWeight: 700,
                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                    opacity: (selectedPostIds.size === 0 || selectedTagIds.size === 0) ? 0.5 : 1
                  }}
                >
                  {taggingLoading ? 'Processing...' : `⚡ Apply (${selectedTagIds.size}) Tags to (${selectedPostIds.size}) Posts`}
                </button>
                <button
                  type="button"
                  onClick={() => executeMassTag('remove')}
                  disabled={taggingLoading || selectedPostIds.size === 0 || selectedTagIds.size === 0}
                  className="btn-secondary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: 'var(--fs-sm)',
                    fontWeight: 600,
                    color: 'var(--danger)',
                    borderColor: 'rgba(224, 106, 106, 0.3)',
                    opacity: (selectedPostIds.size === 0 || selectedTagIds.size === 0) ? 0.5 : 1
                  }}
                >
                  🗑️ Remove Selected Tags from Posts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts Grid */}
        {posts && posts.data && posts.data.length > 0 ? (
          <>
            <div className="post-grid">
              {posts.data.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  artistSlug={artist.slug}
                  selectable={isMassTagging}
                  selected={selectedPostIds.has(post.id)}
                  onToggleSelect={handleTogglePostSelect}
                />
              ))}
            </div>
            {posts && (
              <Pagination
                page={posts.page}
                totalPages={posts.total_pages}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            {search ? 'No posts match your search' : (
              <div style={{ padding: '2rem 0' }}>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontSize: 'var(--fs-md)', fontWeight: 500 }}>
                  No art works archived under {artist.name} yet!
                </p>
                <Link to={`/posts/new?artist=${artist.slug}`} className="btn-primary">
                  📤 + Upload First Post
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

