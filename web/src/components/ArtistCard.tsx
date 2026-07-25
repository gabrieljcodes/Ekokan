import React from 'react';
import { Link } from 'react-router-dom';
import type { Artist } from '../types/models';
import { useAuth } from '../context/AuthContext';

interface Props {
  artist: Artist;
}

export default function ArtistCard({ artist }: Props) {
  const { user, isFavoriteArtist, toggleFavoriteArtist } = useAuth();
  const favorited = isFavoriteArtist(artist.id) || artist.is_favorited;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please login to favorite creators');
      return;
    }
    try {
      await toggleFavoriteArtist(artist.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Link to={`/artist/${artist.slug}`} className="artist-card" style={{ textDecoration: 'none', position: 'relative' }}>
      <button
        onClick={handleFavorite}
        className={`fav-btn ${favorited ? 'fav-btn--active' : ''}`}
        style={{ position: 'absolute', top: '8px', right: '8px' }}
        title={favorited ? 'Remove from favorites' : 'Add artist to favorites'}
      >
        {favorited ? '⭐' : '☆'}
      </button>
      {artist.avatar_url ? (
        <img
          src={artist.avatar_url}
          alt={artist.name}
          className="artist-card__avatar"
          loading="lazy"
        />
      ) : (
        <div className="artist-card__avatar" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)',
        }}>
          {artist.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="artist-card__name">{artist.name}</div>
      <div className="artist-card__count">
        {artist.post_count} {artist.post_count === 1 ? 'post' : 'posts'}
      </div>
    </Link>
  );
}

