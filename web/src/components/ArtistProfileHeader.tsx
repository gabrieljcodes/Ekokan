import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Artist } from '../types/models';
import { IconStarFilled, IconStar, IconEdit } from './Icons';

interface Props {
  artist: Artist;
  favorited: boolean;
  onToggleFavorite: () => void;
}

const ArtistProfileHeader: React.FC<Props> = React.memo(({ artist, favorited, onToggleFavorite }) => {
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleBannerError = useCallback(() => {
    setBannerError(true);
  }, []);

  const handleAvatarError = useCallback(() => {
    setAvatarError(true);
  }, []);

  const showBanner = Boolean(artist.banner_url) && !bannerError;
  const showAvatar = Boolean(artist.avatar_url) && !avatarError;
  const initialChar = (artist.name?.charAt(0) || '?').toUpperCase();

  return (
    <header className="artist-profile-header" aria-label={`Profile header for ${artist.name || 'artist'}`}>
      {/* Banner */}
      {showBanner ? (
        <img
          src={artist.banner_url}
          alt=""
          aria-hidden="true"
          className="artist-banner"
          decoding="async"
          loading="eager"
          onError={handleBannerError}
        />
      ) : (
        <div className="artist-banner" role="presentation" aria-hidden="true" />
      )}

      {/* Profile Section */}
      <div className="artist-profile">
        {showAvatar ? (
          <img
            src={artist.avatar_url}
            alt=""
            aria-hidden="true"
            className="artist-profile__avatar"
            decoding="async"
            loading="eager"
            onError={handleAvatarError}
          />
        ) : (
          <div
            className="artist-profile__avatar artist-profile__avatar--placeholder"
            role="presentation"
            aria-hidden="true"
          >
            {initialChar}
          </div>
        )}

        <div className="artist-profile__info">
          <div className="artist-profile__row">
            <h1 className="artist-profile__name">{artist.name}</h1>
            
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`btn-secondary btn-secondary--pill ${favorited ? 'artist-header-fav--active' : ''}`.trim()}
              aria-label={favorited ? `Remove ${artist.name} from favorites` : `Add ${artist.name} to favorites`}
              aria-pressed={favorited}
            >
              {favorited ? (
                <IconStarFilled size={15} aria-hidden={true} />
              ) : (
                <IconStar size={15} aria-hidden={true} />
              )}
              <span>{favorited ? 'Favorited Creator' : 'Favorite Creator'}</span>
            </button>

            <Link
              to={`/artist/${artist.slug}/edit`}
              className="btn-secondary btn-secondary--pill"
              title="Edit Artist Details & Profile Pictures"
              aria-label={`Edit ${artist.name} details and profile pictures`}
            >
              <IconEdit size={14} aria-hidden={true} />
              <span>Edit Artist</span>
            </Link>
          </div>

          {artist.bio && <p className="artist-profile__bio">{artist.bio}</p>}
        </div>
      </div>
    </header>
  );
});

ArtistProfileHeader.displayName = 'ArtistProfileHeader';

export default ArtistProfileHeader;
