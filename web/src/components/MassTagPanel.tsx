import React, { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Tag } from '../types/models';
import {
  IconCheck,
  IconExternalLink,
  IconTag,
  IconTrash,
  IconX,
  IconFilter,
} from './Icons';

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

interface TagBadgeProps {
  tag: Tag;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const TagBadgeItem: React.FC<TagBadgeProps> = React.memo(({ tag, isSelected, onToggle }) => {
  const handleClick = useCallback(() => {
    onToggle(tag.id);
  }, [tag.id, onToggle]);

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={handleClick}
      className={`tag-badge tag-badge--${tag.category || 'general'} ${
        isSelected ? 'tag-badge--selected' : ''
      }`}
    >
      {isSelected && <IconCheck size={12} aria-hidden={true} />}{' '}
      <span>{tag.name}</span>
    </button>
  );
});

const MassTagPanel = React.memo(function MassTagPanel({
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

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
    },
    [onSearchChange],
  );

  return (
    <div
      className="tag-panel"
      role="region"
      aria-label="Batch post tagging control panel"
      aria-busy={taggingLoading}
    >
      <div className="tag-panel__header">
        <div>
          <h2 className="tag-panel__title">Batch Post Tagging</h2>
          <p className="tag-panel__subtitle">
            Select tags below and click on any post cards across pages to maintain your selection.
          </p>
        </div>
        <div className="tag-panel__header-actions">
          <span
            className="tag-panel__badge tag-panel__badge--accent"
            aria-live="polite"
          >
            Selected Posts: {selectedPostCount}
          </span>
          <button
            type="button"
            onClick={onSelectPage}
            className="btn-secondary"
            disabled={taggingLoading}
          >
            <IconCheck size={14} aria-hidden={true} />
            <span>Select Page ({currentPagePostCount})</span>
          </button>
          <button
            type="button"
            onClick={onDeselectPage}
            className="btn-secondary"
            disabled={taggingLoading}
          >
            <span>Deselect Page</span>
          </button>
          {selectedPostCount > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="btn-danger"
              disabled={taggingLoading}
            >
              <IconX size={14} aria-hidden={true} />
              <span>Clear Selection</span>
            </button>
          )}
        </div>
      </div>

      {taggingStatus && (
        <div className="form-success" role="status" aria-live="polite">
          <IconCheck size={14} aria-hidden={true} /> <span>{taggingStatus}</span>
        </div>
      )}

      <div>
        <div className="tag-panel__sub-header">
          <span className="tag-panel__sub-title" aria-live="polite">
            Choose Tags to Apply / Remove ({selectedTagIds.size} selected)
          </span>
          <div className="tag-panel__sub-actions">
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '8px', opacity: 0.65, display: 'flex', alignItems: 'center' }} aria-hidden={true}>
                <IconFilter size={12} />
              </span>
              <input
                type="text"
                placeholder="Filter tags…"
                value={search}
                onChange={handleSearchChange}
                className="tag-panel__search-input tag-panel__search-input--compact"
                style={{ paddingLeft: '26px' }}
                aria-label="Filter tag library by name or category"
              />
            </div>
            <Link to="/tags" target="_blank" className="tag-panel__link">
              <span>Manage Tags</span> <IconExternalLink size={12} aria-hidden={true} />
            </Link>
          </div>
        </div>

        <div
          className="tag-panel__grid tag-panel__grid--compact"
          role="region"
          aria-label="Tag library selection grid"
        >
          {filteredTags.map((tag) => (
            <TagBadgeItem
              key={tag.id}
              tag={tag}
              isSelected={selectedTagIds.has(tag.id)}
              onToggle={onToggleTag}
            />
          ))}
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
            <IconTag size={16} aria-hidden={true} />
            <span>
              {taggingLoading
                ? 'Processing…'
                : `Apply (${selectedTagIds.size}) Tags to (${selectedPostCount}) Posts`}
            </span>
          </button>
          <button
            type="button"
            onClick={onRemoveTags}
            disabled={taggingLoading || selectedPostCount === 0 || selectedTagIds.size === 0}
            className="btn-secondary btn-secondary--danger"
          >
            <IconTrash size={16} aria-hidden={true} />
            <span>Remove Selected Tags</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default MassTagPanel;
