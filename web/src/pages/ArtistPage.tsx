import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Post, PaginatedResult } from '../types/models';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';

export default function ArtistPage() {
  const { slug } = useParams<{ slug: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
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
          <h1 className="artist-profile__name">{artist.name}</h1>
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
            {/* Search posts */}
            <div className="search-bar">
              <span className="search-bar__icon">🔍</span>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search posts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                {search ? 'No posts match your search' : 'No posts yet'}
              </div>
            )}
          </>
        )}

        {activeTab === 'tags' && (
          <div className="empty-state">Tags view coming soon</div>
        )}
      </div>
    </div>
  );
}
