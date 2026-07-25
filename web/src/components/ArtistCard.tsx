import { Link } from 'react-router-dom';
import type { Artist } from '../types/models';

interface Props {
  artist: Artist;
}

export default function ArtistCard({ artist }: Props) {
  return (
    <Link to={`/artist/${artist.slug}`} className="artist-card" style={{ textDecoration: 'none' }}>
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
