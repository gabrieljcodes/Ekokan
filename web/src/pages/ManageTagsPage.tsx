import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Tag } from '../types/models';
import { IconTag, IconSearch, IconTrash, IconWarning, IconCheck, IconPlus, IconRefresh } from '../components/Icons';

export default function ManageTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // New tag state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadTags = useCallback(() => {
    setLoading(true);
    api.listTags(activeCategory === 'all' ? '' : activeCategory)
      .then((data) => {
        if (isMountedRef.current) {
          setTags(data);
        }
      })
      .catch((err: unknown) => {
        console.error('Error loading tags:', err);
        if (isMountedRef.current) {
          setError((err as Error).message || 'Failed to load tag library.');
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      });
  }, [activeCategory]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toLowerCase();
    if (!cleanName) return;

    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      const created = await api.createTag({
        name: cleanName,
        category,
      });
      if (isMountedRef.current) {
        setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setName('');
        setSuccess(`Tag "${created.name}" created successfully in category "${created.category}"!`);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError((err as Error).message || 'Failed to create tag. It may already exist.');
      }
    } finally {
      if (isMountedRef.current) {
        setCreating(false);
      }
    }
  }, [name, category]);

  const handleDelete = useCallback(async (tag: Tag) => {
    if (!window.confirm(`Are you sure you want to permanently delete the tag "${tag.name}"?`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await api.deleteTag(tag.id);
      if (isMountedRef.current) {
        setTags((prev) => prev.filter((t) => t.id !== tag.id));
        setSuccess(`Tag "${tag.name}" deleted successfully.`);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError((err as Error).message || 'Error deleting tag. It may be currently linked to posts.');
      }
    }
  }, []);

  const filteredTags = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(term));
  }, [tags, search]);

  const categories = [
    { id: 'all', label: 'All Tags' },
    { id: 'general', label: 'General' },
    { id: 'character', label: 'Character' },
    { id: 'copyright', label: 'Copyright' },
    { id: 'artist', label: 'Artist' },
    { id: 'meta', label: 'Meta' },
  ];

  return (
    <main role="main" className="app-container">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Gallery</Link> &nbsp;/&nbsp; <span>Tag Library</span>
      </nav>

      <div className="form-card manage-tags__card-wrapper">
        <div className="form-card__header">
          <h1 className="form-card__title manage-tags__title-icon">
            <IconTag size={28} aria-hidden={true} />
            <span>Tag Library & Management</span>
          </h1>
          <p className="form-card__subtitle">
            Organize gallery content using colored categorization tags (characters, series, styles, and meta info).
          </p>
        </div>

        {/* Add Tag Form */}
        <form onSubmit={handleCreate} className="manage-tags__create-form" aria-busy={creating}>
          <div className="manage-tags__create-title">
            <IconPlus size={16} aria-hidden={true} />
            <span>Create New Tag</span>
          </div>

          {error && (
            <div className="form-error" role="alert" aria-live="assertive">
              <IconWarning size={18} aria-hidden={true} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="form-success" role="status" aria-live="polite">
              <IconCheck size={18} aria-hidden={true} />
              <span>{success}</span>
            </div>
          )}

          <div className="manage-tags__form-row">
            <div className="manage-tags__input-col">
              <label htmlFor="manage-tag-name" className="sr-only">Tag Name</label>
              <input
                id="manage-tag-name"
                type="text"
                placeholder="Tag name (e.g. hatsune miku, genshin impact, sketch)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="manage-tags__full-width"
                disabled={creating}
                maxLength={50}
                aria-label="New tag name"
                required
              />
            </div>

            <div className="manage-tags__select-col">
              <label htmlFor="manage-tag-category" className="sr-only">Tag Category</label>
              <select
                id="manage-tag-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="manage-tags__full-width"
                disabled={creating}
                aria-label="New tag category"
              >
                <option value="general">General (Default)</option>
                <option value="character">Character</option>
                <option value="copyright">Copyright (Series)</option>
                <option value="artist">Artist (Creator)</option>
                <option value="meta">Meta (Information)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={creating || !name.trim()}>
              {creating ? 'Adding...' : 'Add Tag'}
            </button>
          </div>
        </form>

        {/* Filter Tabs & Search */}
        <div className="manage-tags__filter-row">
          <div className="artist-tabs manage-tags__filter-tabs" role="tablist" aria-label="Filter tags by category">
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`tag-tab-${cat.id}`}
                role="tab"
                aria-selected={activeCategory === cat.id}
                type="button"
                className={`artist-tabs__tab ${activeCategory === cat.id ? 'artist-tabs__tab--active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="search-bar manage-tags__search-wrapper">
            <span className="search-bar__icon">
              <IconSearch size={18} aria-hidden={true} />
            </span>
            <label htmlFor="manage-tag-search" className="sr-only">Search existing tags</label>
            <input
              id="manage-tag-search"
              type="text"
              className="search-bar__input"
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search existing tags"
            />
          </div>
        </div>

        {/* Tags Grid */}
        {loading ? (
          <div className="loading" role="status" aria-live="polite">
            <IconRefresh size={22} aria-hidden={true} />
            <span>Loading tag library...</span>
          </div>
        ) : filteredTags.length > 0 ? (
          <div className="tag-manager-grid" role="region" aria-label="Tag directory">
            {filteredTags.map((tag) => (
              <div key={tag.id} className="tag-manager-card">
                <span className={`tag-badge tag-badge--${tag.category || 'general'} manage-tags__tag-badge`}>
                  {tag.name}
                </span>
                <button
                  type="button"
                  className="btn-danger manage-tags__delete-btn"
                  onClick={() => handleDelete(tag)}
                  title={`Delete tag ${tag.name}`}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  <IconTrash size={16} aria-hidden={true} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status" aria-live="polite">
            {search ? 'No matching tags found' : 'No tags in this category yet'}
          </div>
        )}
      </div>
    </main>
  );
}
