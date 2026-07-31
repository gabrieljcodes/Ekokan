import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Tag } from '../types/models';
import { IconCheck, IconExternalLink } from './Icons';

interface Props {
  tags: Tag[];
  selectedTagIds: Set<string>;
  selectedPostCount: number;
  currentPagePostCount: number;
  search: string;
  taggingStatus: string | null;
  taggingLoading: boolean;
  onSearchChange: (value: string) => void;
  onToggleTag: (tagId: string) => void;
  onSelectPage: () => void;
  onDeselectPage: () => void;
  onClearSelection: () => void;
  onApplyTags: () => void;
  onRemoveTags: () => void;
}

export default function MassTagPanel({
  tags,
  selectedTagIds,
  selectedPostCount,
  currentPagePostCount,
  search,
  taggingStatus,
  taggingLoading,
  onSearchChange,
  onToggleTag,
  onSelectPage,
  onDeselectPage,
  onClearSelection,
  onApplyTags,
  onRemoveTags,
}: Props) {
  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [tags, search]);

  return (
    <div className="tag-panel" role="group" aria-label="Batch post tagging panel">
      <div className="tag-panel__header">
        <div>
          <h2 className="tag-panel__title">Batch Post Tagging</h2>
          <p className="tag-panel__subtitle">
            Select tags below and click on any post cards across pages to maintain your selection.
          </p>
        </div>
        <div className="tag-panel__header-actions">
          <span className="tag-panel__badge tag-panel__badge--accent">
            Selected Posts: {selectedPostCount}
          </span>
          <button type="button" onClick={onSelectPage} className="btn-secondary">
            Select Page ({currentPagePostCount})
          </button>
          <button type="button" onClick={onDeselectPage} className="btn-secondary">
            Deselect Page
          </button>
          {selectedPostCount > 0 && (
            <button type="button" onClick={onClearSelection} className="btn-danger">
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {taggingStatus && (
        <div className="form-success" role="status" aria-live="polite">
          <IconCheck size={14} /> {taggingStatus}
        </div>
      )}

      <div>
        <div className="tag-panel__sub-header">
          <span className="tag-panel__sub-title">
            Choose Tags to Apply / Remove ({selectedTagIds.size} selected)
          </span>
          <div className="tag-panel__sub-actions">
            <input
              type="text"
              placeholder="Filter tags…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="tag-panel__search-input tag-panel__search-input--compact"
              aria-label="Filter tags"
            />
            <Link to="/tags" target="_blank" className="tag-panel__link">
              Manage Tags <IconExternalLink size={12} />
            </Link>
          </div>
        </div>

        <div className="tag-panel__grid tag-panel__grid--compact" role="listbox" aria-label="Tag library">
          {filteredTags.map((tag) => {
            const isSel = selectedTagIds.has(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => onToggleTag(tag.id)}
                className={`tag-badge tag-badge--${tag.category || 'general'} ${isSel ? 'tag-badge--selected' : ''}`}
              >
                {isSel && <IconCheck size={12} />} {tag.name}
              </button>
            );
          })}
          {tags.length === 0 && (
            <div className="tag-panel__empty">No tags available in library yet.</div>
          )}
        </div>

        <div className="tag-panel__actions">
          <button
            type="button"
            onClick={onApplyTags}
            disabled={taggingLoading || selectedPostCount === 0 || selectedTagIds.size === 0}
            className="btn-primary"
          >
            {taggingLoading ? 'Processing…' : `Apply (${selectedTagIds.size}) Tags to (${selectedPostCount}) Posts`}
          </button>
          <button
            type="button"
            onClick={onRemoveTags}
            disabled={taggingLoading || selectedPostCount === 0 || selectedTagIds.size === 0}
            className="btn-secondary btn-secondary--danger"
          >
            Remove Selected Tags
          </button>
        </div>
      </div>
    </div>
  );
}
