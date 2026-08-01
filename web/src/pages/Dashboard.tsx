import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, PaginatedResult } from '../types/models';
import ArtistCard from '../components/ArtistCard';
import Pagination from '../components/Pagination';
import { IconSearch, IconPlus, IconUsers, IconWarning, IconRefresh, IconX } from '../components/Icons';

export default function Dashboard() {
  const [result, setResult] = useState<PaginatedResult<Artist> | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const setPage = useCallback((newPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newPage > 1) {
        next.set('page', newPage.toString());
      } else {
        next.delete('page');
      }
      return next;
    });
  }, [setSearchParams]);

  // Debounce search inputs to prevent network flooding
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch artist archive catalog with out-of-order race condition guard
  const fetchCatalog = useCallback((targetPage: number, targetQuery: string) => {
    setLoading(true);
    setError(null);
    let ignore = false;

    api.listArtists(targetPage, 50, targetQuery)
      .then((data) => {
        if (!ignore) {
          setResult(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load artist archive:', err);
          setError('Failed to contact the Ekokan archive service. Please check your network connection or self-hosted backend status.');
          setResult(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const cancel = fetchCatalog(page, debouncedSearch);
    return cancel;
  }, [page, debouncedSearch, fetchCatalog]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, [setPage]);

  const handleRetry = useCallback(() => {
    fetchCatalog(page, debouncedSearch);
  }, [page, debouncedSearch, fetchCatalog]);

  return (
    <div className="app-container">
      <main className="dashboard-main" role="main">
        <h1 className="sr-only">Ekokan Creator Archive Dashboard</h1>

        <div className="action-bar dashboard-action-bar">
          <div className="search-bar dashboard-search-wrap">
            <IconSearch className="search-bar__icon" size={18} aria-hidden={true} />
            <input
              id="artist-search-input"
              type="text"
              className="search-bar__input dashboard-search__input"
              placeholder="Search artists..."
              value={search}
              onChange={handleSearch}
              aria-label="Search artist profiles by name"
            />
          </div>
          <Link to="/artists/new" className="btn-primary dashboard-add-btn">
            <IconPlus size={16} aria-hidden={true} />
            <span>Add Artist Profile</span>
          </Link>
        </div>

        <div role="status" aria-live="polite" className="dashboard-status-region">
          {loading ? (
            <div className="loading dashboard-loading-state">
              <span className="loading-spinner" aria-hidden="true" />
              <span>Loading creator archive...</span>
            </div>
          ) : error ? (
            <div className="dashboard-error-card" role="alert">
              <IconWarning size={40} className="dashboard-error__icon" aria-hidden={true} />
              <h2 className="dashboard-error__title">Archive Catalog Offline</h2>
              <p className="dashboard-error__desc">{error}</p>
              <button
                type="button"
                className="btn-primary dashboard-error__retry"
                onClick={handleRetry}
              >
                <IconRefresh size={16} aria-hidden={true} />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : result && result.data.length > 0 ? (
            <>
              <div className="dashboard-results-header">
                <h2 className="dashboard-results__title">
                  {debouncedSearch ? `Search results for "${debouncedSearch}"` : 'Creator Archive Catalog'}
                </h2>
                <span className="dashboard-results__count">
                  {result.total} {result.total === 1 ? 'creator profile archived' : 'creator profiles archived'}
                </span>
              </div>
              <div className="artist-grid">
                {result.data.map((artist, index) => (
                  <ArtistCard
                    key={artist.id}
                    artist={artist}
                    style={{ '--card-idx': Math.min(index, 6) } as React.CSSProperties}
                  />
                ))}
              </div>
              <Pagination
                page={result.page}
                totalPages={result.total_pages}
                onPageChange={setPage}
              />
            </>
          ) : (
            <div className="empty-state dashboard-empty-card">
              <IconUsers size={48} className="dashboard-empty__icon" aria-hidden={true} />
              <h2 className="dashboard-empty__title">
                {debouncedSearch ? 'No matching creators found' : 'Your personal Ekokan archive is empty!'}
              </h2>
              <p className="dashboard-empty__desc">
                {debouncedSearch
                  ? `No artist profile matches the search term "${debouncedSearch}". Try broadening your keywords.`
                  : 'Start building your high-fidelity collection by adding your first creator profile.'}
              </p>
              {debouncedSearch ? (
                <button
                  type="button"
                  className="btn-secondary dashboard-empty__cta"
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                >
                  <IconX size={16} aria-hidden={true} />
                  <span>Clear Search Filter</span>
                </button>
              ) : (
                <Link to="/artists/new" className="btn-primary dashboard-empty__cta">
                  <IconPlus size={16} aria-hidden={true} />
                  <span>Create First Artist Profile</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
