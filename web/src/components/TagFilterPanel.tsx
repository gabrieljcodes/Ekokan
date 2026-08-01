import { useMemo } from 'react';
import type { Tag } from '../types/models';
import { IconCheck, IconX, IconBan } from './Icons';

interface Props {
  tags: Tag[];
  includeTagIds: Set<string>;
  excludeTagIds: Set<string>;
  persistentExcludeTagIds?: Set<string>;
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (tagId: string) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export default function TagFilterPanel({
  tags,
  includeTagIds,
  excludeTagIds,
  persistentExcludeTagIds,
  search,
  onSearchChange,
  onToggle,
  onReset,
  activeFilterCount,
}: Props) {
  const matchingTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tags.filter((t) => !q || t.name.toLowerCase().includes(q) || t.slug.includes(q));
  }, [tags, search]);

  const visibleTags = useMemo(() => matchingTags.slice(0, 60), [matchingTags]);
  const hiddenCount = matchingTags.length - visibleTags.length;

  return (
    <section className="tag-panel" aria-label="Tag filter panel">
      <div className="tag-panel__header">
        <div>
          <h2 className="tag-panel__title">Non-Persistent Tag Filter</h2>
          <p className="tag-panel__subtitle">
            Click a tag once to <strong className="text-success">Include (+)</strong>,
            click twice to <strong className="text-danger">Exclude (−)</strong>,
            click a third time to reset.
          </p>
        </div>
        <div className="tag-panel__header-actions">
          {activeFilterCount > 0 && (
            <button type="button" onClick={onReset} className="btn-danger">
              Reset Filters ({activeFilterCount})
            </button>
          )}
          {persistentExcludeTagIds && persistentExcludeTagIds.size > 0 && (
            <span className="tag-panel__badge tag-panel__badge--warning">
              +{persistentExcludeTagIds.size} persistent blacklist tag(s) active
            </span>
          )}
        </div>
      </div>

      <div className="tag-panel__search">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tags to include or exclude…"
          className="tag-panel__search-input"
          aria-label="Search tags to include or exclude"
        />
      </div>

      <div className="tag-panel__grid" role="group" aria-label="Available filter tags">
        {visibleTags.map((tag) => {
          const isInc = includeTagIds.has(tag.id);
          const isExc = excludeTagIds.has(tag.id);
          const isPersistExc = persistentExcludeTagIds?.has(tag.id);

          let stateClass = '';
          let prefix = null;
          let statusText = 'Neutral';
          if (isPersistExc) {
            stateClass = 'tag-pill--banned';
            prefix = <IconBan size={12} />;
            statusText = 'Permanently blacklisted in user profile';
          } else if (isInc) {
            stateClass = 'tag-pill--include';
            prefix = <IconCheck size={12} />;
            statusText = 'Included (+)';
          } else if (isExc) {
            stateClass = 'tag-pill--exclude';
            prefix = <IconX size={12} />;
            statusText = 'Excluded (−)';
          }

          const ariaLabel = `${tag.name} (${tag.post_count} posts) — Current status: ${statusText}. Click to change filter state.`;

          return (
            <button
              key={tag.id}
              type="button"
              aria-label={ariaLabel}
              aria-pressed={isInc || isExc ? 'true' : 'false'}
              onClick={() => !isPersistExc && onToggle(tag.id)}
              disabled={isPersistExc}
              className={`tag-pill ${stateClass}`}
            >
              {prefix && <span className="tag-pill__icon">{prefix}</span>}
              <span>{tag.name}</span>
              <span className="tag-pill__count">({tag.post_count})</span>
            </button>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="tag-panel__notice" role="status" aria-live="polite">
          Showing 60 of {matchingTags.length} tags (+{hiddenCount} hidden). Type in the search box above to find more.
        </div>
      )}
    </section>
  );
}
