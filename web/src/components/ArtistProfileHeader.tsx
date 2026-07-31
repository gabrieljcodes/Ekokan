import { Link } from 'react-router-dom';
import type { Artist } from '../types/models';
import { IconStarFilled, IconStar, IconEdit } from './Icons';

interface Props {
  artist: Artist;
  favorited: boolean;
  onToggleFavorite: () => void;
}

export default function ArtistProfileHeader({ artist, favorited, onToggleFavorite }: Props) {
  return (
    <>
      {/* Banner */}
      {artist.banner_url ? (
        <img
          src={artist.banner_url}
          alt={`${artist.name} banner`}
          className="artist-banner"
        />
      ) : (
        <div className="artist-banner" role="presentation" />
      )}

      {/* Profile */}
      <div className="artist-profile">
        {artist.avatar_url ? (
          <img
            src={artist.avatar_url}
            alt={artist.name}
            className="artist-profile__avatar"
          />
        ) : (
          <div className="artist-profile__avatar artist-profile__avatar--placeholder">
            {artist.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="artist-profile__info">
          <div className="artist-profile__row">
            <h1 className="artist-profile__name">{artist.name}</h1>
            <button
              onClick={onToggleFavorite}
              className={`btn-secondary btn-secondary--pill ${favorited ? 'btn-secondary--active' : ''}`}
              aria-label={favorited ? `Remove ${artist.name} from favorites` : `Add ${artist.name} to favorites`}
              aria-pressed={favorited}
            >
              {favorited ? <IconStarFilled size={14} /> : <IconStar size={14} />}
              {favorited ? 'Favorited Creator' : 'Favorite Creator'}
            </button>
            <Link
              to={`/artist/${artist.slug}/edit`}
              className="btn-secondary btn-secondary--pill"
              title="Edit Artist Details & Profile Pictures"
            >
              <IconEdit size={14} />
              Edit Artist
            </Link>
          </div>
          {artist.bio && <p className="artist-profile__bio">{artist.bio}</p>}
        </div>
      </div>
    </>
  );
}
