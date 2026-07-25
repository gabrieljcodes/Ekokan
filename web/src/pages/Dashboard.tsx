import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, PaginatedResult } from '../types/models';
import ArtistCard from '../components/ArtistCard';
import Pagination from '../components/Pagination';

export default function Dashboard() {
  const [result, setResult] = useState<PaginatedResult<Artist> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.listArtists(page, 50, search)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="app-container">
      <div className="action-bar">
        <div className="search-bar" style={{ margin: 0, flex: 1, maxWidth: '600px' }}>
          <span className="search-bar__icon">🔍</span>
          <input
            type="text"
            className="search-bar__input"
            placeholder="Search artists..."
            value={search}
            onChange={handleSearch}
          />
        </div>
        <Link to="/artists/new" className="btn-primary">
          ✨ + Add Artist Profile
        </Link>
      </div>

      {loading ? (
        <div className="loading">Loading artists...</div>
      ) : result && result.data.length > 0 ? (
        <>
          <div className="artist-grid">
            {result.data.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
          <Pagination
            page={result.page}
            totalPages={result.total_pages}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className="empty-state">
          {search ? 'No artists found match your search' : (
            <div style={{ padding: '2rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎨</div>
              <p style={{ marginBottom: '1.5rem', fontSize: 'var(--fs-md)', color: 'var(--text-primary)', fontWeight: 500 }}>
                Your personal Ekokan archive is empty!
              </p>
              <Link to="/artists/new" className="btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
                + Create First Artist Profile
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

