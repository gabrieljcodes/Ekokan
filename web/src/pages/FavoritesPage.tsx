import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Post } from '../types/models';
import ArtistCard from '../components/ArtistCard';
import PostCard from '../components/PostCard';

export default function FavoritesPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'artists' | 'posts'>('artists');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.listMyFavorites()
      .then((res) => {
        setArtists(res.artists || []);
        setPosts(res.posts || []);
      })
      .catch((err) => setError(err.message || 'Failed to fetch your favorites'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading your favorites gallery...</div>;
  }

  if (error) {
    return <div className="form-error" style={{ maxWidth: '600px', margin: '40px auto' }}>{error}</div>;
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <div className="action-bar">
        <div>
          <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: '700', marginBottom: '4px' }}>My Favorites Dashboard</h1>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Quick access to your bookmarked creators and cherished gallery updates
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-secondary ${activeTab === 'artists' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('artists')}
          >
            ⭐ Artists ({artists.length})
          </button>
          <button
            className={`btn-secondary ${activeTab === 'posts' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            ❤️ Posts ({posts.length})
          </button>
        </div>
      </div>

      {activeTab === 'artists' ? (
        artists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>You haven't favorited any artists yet.</p>
            <Link to="/" className="btn-primary">Explore Artist Directory</Link>
          </div>
        ) : (
          <div className="artist-grid">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        )
      ) : (
        posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No favorited posts in your collection yet.</p>
            <Link to="/" className="btn-primary">Browse Recent Posts</Link>
          </div>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} artistSlug={post.artist?.slug || 'unknown'} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
