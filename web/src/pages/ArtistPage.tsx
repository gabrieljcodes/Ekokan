import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Post, PaginatedResult } from '../types/models';
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
  const [activeTab, setActiveTab] = useState<'posts' | 'tags'>('posts');

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
    api.listArtistPosts(slug, page, 25)
      .then(setPosts)
      .catch(console.error);
  }, [slug, page]);

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

  const filteredPosts = search && posts
    ? {
        ...posts,
        data: posts.data.filter(p =>
          p.title.toLowerCase().includes(search.toLowerCase())
        ),
      }
    : posts;

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
          </div>
          {artist.bio && <p className="artist-profile__bio">{artist.bio}</p>}
        </div>
      </div>

      <div className="app-container">
        {/* Tabs */}
        <div className="artist-tabs">
          <button
            className={`artist-tabs__tab ${activeTab === 'posts' ? 'artist-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button
            className={`artist-tabs__tab ${activeTab === 'tags' ? 'artist-tabs__tab--active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            Tags
          </button>
        </div>

        {activeTab === 'posts' && (
          <>
            {/* Search and action bar */}
            <div className="action-bar">
              <div className="search-bar" style={{ margin: 0, flex: 1, maxWidth: '500px' }}>
                <span className="search-bar__icon">🔍</span>
                <input
                  type="text"
                  className="search-bar__input"
                  placeholder="Search artist's posts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Link to={`/posts/new?artist=${artist.slug}`} className="btn-primary">
                📤 + Upload Post for {artist.name}
              </Link>
            </div>

            {/* Posts grid */}
            {filteredPosts && filteredPosts.data.length > 0 ? (
              <>
                <div className="post-grid">
                  {filteredPosts.data.map((post) => (
                    <PostCard key={post.id} post={post} artistSlug={artist.slug} />
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
          </>
        )}

        {activeTab === 'tags' && (
          <div className="empty-state">
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              Manage all categorization systems and colored tags in the centralized library.
            </p>
            <Link to="/tags" className="btn-secondary">Open Tag Library →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

