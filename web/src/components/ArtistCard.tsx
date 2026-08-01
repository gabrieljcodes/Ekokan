import React, { useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import type { Artist } from '../types/models';
import { useAuth } from '../context/AuthContext';
import { IconStar, IconStarFilled } from './Icons';

interface Props {
  artist: Artist;
  style?: React.CSSProperties;
}

const ArtistCard = memo(function ArtistCard({ artist, style }: Props) {
  const { user, isFavoriteArtist, toggleFavoriteArtist } = useAuth();
  const favorited = isFavoriteArtist(artist.id) || artist.is_favorited;

  const handleFavorite = useCallback(async (e: React.MouseEvent) => {
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
  }, [user, artist.id, toggleFavoriteArtist]);

  return (
    <Link
      to={`/artist/${artist.slug}`}
      className="artist-card"
      style={style}
      aria-label={`View artist profile: ${artist.name}, ${artist.post_count} ${artist.post_count === 1 ? 'post' : 'posts'}`}
    >
      <button
        type="button"
        onClick={handleFavorite}
        className={`fav-btn artist-card__fav-btn ${favorited ? 'fav-btn--active' : ''}`}
        aria-label={favorited ? `Remove ${artist.name} from favorites` : `Add ${artist.name} to favorites`}
        title={favorited ? 'Remove from favorites' : 'Add artist to favorites'}
      >
        {favorited ? (
          <IconStarFilled size={16} aria-hidden={true} />
        ) : (
          <IconStar size={16} aria-hidden={true} />
        )}
      </button>

      {artist.avatar_url ? (
        <img
          src={artist.avatar_url}
          alt={`Avatar for creator ${artist.name}`}
          className="artist-card__avatar"
          loading="lazy"
        />
      ) : (
        <div
          className="artist-card__avatar artist-card__avatar--fallback"
          aria-hidden="true"
        >
          {artist.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="artist-card__name" title={artist.name}>{artist.name}</div>
      <div className="artist-card__count">
        {artist.post_count} {artist.post_count === 1 ? 'post' : 'posts'}
      </div>
    </Link>
  );
});

export default ArtistCard;
