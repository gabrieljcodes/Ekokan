import { useEffect, useState } from 'react';
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
      <div className="search-bar">
        <span className="search-bar__icon">🔍</span>
        <input
          type="text"
          className="search-bar__input"
          placeholder="Search artists..."
          value={search}
          onChange={handleSearch}
        />
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
          {search ? 'No artists found' : 'No artists yet'}
        </div>
      )}
    </div>
  );
}
