import React, { useMemo } from 'react';
import { IconChevronLeft, IconChevronRight } from './Icons';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<Props> = React.memo(({ page, totalPages, onPageChange }) => {
  const { pages, start, end } = useMemo(() => {
    const list: number[] = [];
    const s = Math.max(1, page - 2);
    const e = Math.min(totalPages, page + 2);
    for (let i = s; i <= e; i++) {
      list.push(i);
    }
    return { pages: list, start: s, end: e };
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav role="navigation" aria-label="Pagination navigation">
      <div className="pagination">
        <button
          type="button"
          className="pagination__btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Go to previous page"
        >
          <IconChevronLeft size={16} aria-hidden={true} />
          <span>Prev</span>
        </button>

        {start > 1 && (
          <>
            <button
              type="button"
              className="pagination__btn"
              onClick={() => onPageChange(1)}
              aria-label="Go to page 1"
            >
              1
            </button>
            {start > 2 && <span className="pagination__info" aria-hidden={true}>…</span>}
          </>
        )}

        {pages.map((p) => {
          const isActive = p === page;
          return (
            <button
              key={p}
              type="button"
              className={`pagination__btn ${isActive ? 'pagination__btn--active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={isActive ? `Current page, page ${p}` : `Go to page ${p}`}
            >
              {p}
            </button>
          );
        })}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="pagination__info" aria-hidden={true}>…</span>}
            <button
              type="button"
              className="pagination__btn"
              onClick={() => onPageChange(totalPages)}
              aria-label={`Go to last page, page ${totalPages}`}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          className="pagination__btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Go to next page"
        >
          <span>Next</span>
          <IconChevronRight size={16} aria-hidden={true} />
        </button>
      </div>
    </nav>
  );
});

export default Pagination;
