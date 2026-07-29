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
  const { user, isFavoriteArtist, toggleFavoriteArtist, excludedTagIds } = useAuth();
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

  // Non-persistent Tag Filtering State
  const [isFiltering, setIsFiltering] = useState(false);
  const [filterIncludeTagIds, setFilterIncludeTagIds] = useState<Set<string>>(new Set());
  const [filterExcludeTagIds, setFilterExcludeTagIds] = useState<Set<string>>(new Set());
  const [filterTagSearch, setFilterTagSearch] = useState('');

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
    const combinedExcluded = Array.from(new Set([...Array.from(excludedTagIds || []), ...Array.from(filterExcludeTagIds)]));
    api.listArtistPosts(slug, page, 25, search, Array.from(filterIncludeTagIds), combinedExcluded)
      .then(setPosts)
      .catch(console.error);
  }, [slug, page, search, filterIncludeTagIds, filterExcludeTagIds, excludedTagIds]);

  useEffect(() => {
    if ((isMassTagging || isFiltering) && availableTags.length === 0) {
      api.listTags().then(setAvailableTags).catch(console.error);
    }
  }, [isMassTagging, isFiltering, availableTags.length]);

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
        const combinedExcluded = Array.from(new Set([...Array.from(excludedTagIds || []), ...Array.from(filterExcludeTagIds)]));
        const res = await api.listArtistPosts(slug, page, 25, search, Array.from(filterIncludeTagIds), combinedExcluded);
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setIsFiltering(!isFiltering);
                if (!isFiltering) setIsMassTagging(false);
              }}
              className="btn-secondary"
              style={{
                borderColor: isFiltering ? 'var(--accent)' : 'var(--border-color)',
                background: isFiltering ? 'var(--bg-card-hover)' : 'var(--bg-elevated)'
              }}
            >
              Filter by Tags {(filterIncludeTagIds.size + filterExcludeTagIds.size) > 0 ? `(${filterIncludeTagIds.size + filterExcludeTagIds.size})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMassTagging(!isMassTagging);
                if (!isMassTagging) setIsFiltering(false);
                setTaggingStatus(null);
              }}
              className="btn-secondary"
              style={{
                borderColor: isMassTagging ? 'var(--accent)' : 'var(--border-color)',
                background: isMassTagging ? 'var(--bg-card-hover)' : 'var(--bg-elevated)'
              }}
            >
              Mass Tag Mode {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ''}
            </button>
            <Link to={`/posts/new?artist=${artist.slug}`} className="btn-primary">
              + Upload Post for {artist.name}
            </Link>
          </div>
        </div>

        {/* Non-persistent Tag Filtering Controls Banner */}
        {isFiltering && (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Non-Persistent Tag Filter
                </h3>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Click a tag once to <strong style={{ color: 'var(--success)' }}>Include (+)</strong>, click twice to <strong style={{ color: 'var(--danger)' }}>Exclude (-)</strong>, click a third time to reset.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(filterIncludeTagIds.size > 0 || filterExcludeTagIds.size > 0) && (
                  <button
                    type="button"
                    onClick={() => { setFilterIncludeTagIds(new Set()); setFilterExcludeTagIds(new Set()); setPage(1); }}
                    className="btn-danger"
                  >
                    Reset Filters ({filterIncludeTagIds.size + filterExcludeTagIds.size})
                  </button>
                )}
                {excludedTagIds && excludedTagIds.size > 0 && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--danger)', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    +{excludedTagIds.size} persistent blacklist tag(s) active
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={filterTagSearch}
                onChange={(e) => setFilterTagSearch(e.target.value)}
                placeholder="Search tags to include or exclude..."
                style={{ width: '100%', maxWidth: '360px', background: 'var(--bg-card)' }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
              {availableTags
                .filter(t => !filterTagSearch.trim() || t.name.toLowerCase().includes(filterTagSearch.toLowerCase()) || t.slug.includes(filterTagSearch.toLowerCase()))
                .slice(0, 60)
                .map(tag => {
                  const isInc = filterIncludeTagIds.has(tag.id);
                  const isExc = filterExcludeTagIds.has(tag.id);
                  const isPersistExc = excludedTagIds?.has(tag.id);

                  let bg = 'var(--bg-card)';
                  let border = '1px solid var(--border-color)';
                  let color = 'var(--text-secondary)';
                  let prefix = '+ ';
                  if (isPersistExc) {
                    bg = 'var(--bg-input)'; border = '1px dashed var(--border-color)'; color = 'var(--danger)'; prefix = '🚫 ';
                  } else if (isInc) {
                    bg = 'var(--success)'; color = '#fff'; border = '1px solid var(--success)'; prefix = '✓ ';
                  } else if (isExc) {
                    bg = 'var(--danger)'; color = '#fff'; border = '1px solid var(--danger)'; prefix = '✕ ';
                  }

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (isPersistExc) return;
                        const newInc = new Set(filterIncludeTagIds);
                        const newExc = new Set(filterExcludeTagIds);
                        if (isInc) {
                          newInc.delete(tag.id);
                          newExc.add(tag.id);
                        } else if (isExc) {
                          newExc.delete(tag.id);
                        } else {
                          newInc.add(tag.id);
                        }
                        setFilterIncludeTagIds(newInc);
                        setFilterExcludeTagIds(newExc);
                        setPage(1);
                      }}
                      disabled={isPersistExc}
                      style={{ background: bg, border, color, padding: '4px 10px', borderRadius: '14px', fontSize: 'var(--fs-xs)', fontWeight: (isInc || isExc) ? 600 : 400, cursor: isPersistExc ? 'not-allowed' : 'pointer', transition: 'background var(--transition-fast)' }}
                    >
                      <span>{prefix}{tag.name}</span>
                      <span style={{ opacity: 0.7, marginLeft: '4px' }}>({tag.post_count})</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Mass Tagging Controls Banner */}
        {isMassTagging && (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-lg)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-light)',
              marginBottom: '16px'
            }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 'var(--fs-md)', fontWeight: 600 }}>
                  Batch Post Tagging
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
                  Select tags below and click on any post cards across pages to maintain your selection.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--fs-xs)',
                  fontWeight: 600
                }}>
                  Selected Posts: {selectedPostIds.size}
                </span>
                <button
                  type="button"
                  onClick={handleSelectCurrentPage}
                  className="btn-secondary"
                >
                  Select Page ({posts?.data?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectCurrentPage}
                  className="btn-secondary"
                >
                  Deselect Page
                </button>
                {selectedPostIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPostIds(new Set())}
                    className="btn-danger"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            {taggingStatus && (
              <div className="form-success">
                ✓ {taggingStatus}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                  Choose Tags to Apply / Remove ({selectedTagIds.size} selected)
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Filter tags..."
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      padding: '4px 10px',
                      fontSize: 'var(--fs-xs)',
                      width: '180px'
                    }}
                  />
                  <Link
                    to="/tags"
                    target="_blank"
                    style={{ color: 'var(--accent)', fontSize: 'var(--fs-xs)', textDecoration: 'none' }}
                  >
                    Manage Tags ↗
                  </Link>
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '8px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px'
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
                        border: isSel ? '1px solid #fff' : '1px solid transparent',
                        background: isSel ? 'var(--bg-elevated)' : 'transparent',
                        opacity: isSel ? 1 : 0.75,
                        padding: '4px 8px',
                        fontSize: 'var(--fs-xs)'
                      }}
                    >
                      {isSel ? '✓ ' : ''}{tag.name}
                    </button>
                  );
                })}
                {availableTags.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)', padding: '12px', width: '100%', textAlign: 'center' }}>
                    No tags available in library yet.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => executeMassTag('add')}
                  disabled={taggingLoading || selectedPostIds.size === 0 || selectedTagIds.size === 0}
                  className="btn-primary"
                >
                  {taggingLoading ? 'Processing...' : `Apply (${selectedTagIds.size}) Tags to (${selectedPostIds.size}) Posts`}
                </button>
                <button
                  type="button"
                  onClick={() => executeMassTag('remove')}
                  disabled={taggingLoading || selectedPostIds.size === 0 || selectedTagIds.size === 0}
                  className="btn-secondary"
                  style={{ color: 'var(--danger)' }}
                >
                  Remove Selected Tags
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

