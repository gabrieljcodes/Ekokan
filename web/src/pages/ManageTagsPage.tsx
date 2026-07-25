import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Tag } from '../types/models';

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

  const loadTags = () => {
    setLoading(true);
    api.listTags(activeCategory === 'all' ? '' : activeCategory)
      .then(setTags)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTags();
  }, [activeCategory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSuccess(null);
    setCreating(true);

    try {
      const created = await api.createTag({
        name: name.trim(),
        category
      });
      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setName('');
      setSuccess(`Tag "${created.name}" created successfully in category "${created.category}"!`);
    } catch (err: any) {
      setError(err.message || 'Error creating tag');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tag.name}"?`)) {
      return;
    }
    try {
      await api.deleteTag(tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } catch (err: any) {
      alert(err.message || 'Error deleting tag');
    }
  };

  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [
    { id: 'all', label: 'All Tags' },
    { id: 'general', label: 'General' },
    { id: 'character', label: 'Character' },
    { id: 'copyright', label: 'Copyright' },
    { id: 'artist', label: 'Artist' },
    { id: 'meta', label: 'Meta' },
  ];

  return (
    <div className="app-container">
      <div className="breadcrumb">
        <Link to="/">Gallery</Link> &nbsp;/&nbsp; <span>Tag Library</span>
      </div>

      <div className="form-card" style={{ maxWidth: '1000px', marginBottom: 'var(--space-2xl)' }}>
        <div className="form-card__header">
          <h1 className="form-card__title">🏷️ Tag Library & Management</h1>
          <p className="form-card__subtitle">
            Organize gallery content using colored categorization tags (characters, series, styles, and meta info).
          </p>
        </div>

        {/* Add Tag Form */}
        <form onSubmit={handleCreate} style={{ marginBottom: 'var(--space-xl)', background: 'var(--bg-elevated)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-sm)' }}>
            + Create New Tag
          </div>
          {error && <div className="form-error" style={{ marginBottom: 'var(--space-sm)' }}>{error}</div>}
          {success && <div className="form-success" style={{ marginBottom: 'var(--space-sm)' }}>{success}</div>}
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Tag name (e.g. hatsune miku, genshin impact, sketch)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%' }}
                disabled={creating}
                required
              />
            </div>
            <div style={{ width: '180px' }}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
                disabled={creating}
              >
                <option value="general">🔵 General</option>
                <option value="character">🟢 Character</option>
                <option value="copyright">🟣 Copyright</option>
                <option value="artist">🟠 Artist</option>
                <option value="meta">⚪ Meta</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={creating || !name.trim()}>
              {creating ? 'Adding...' : 'Add Tag'}
            </button>
          </div>
        </form>

        {/* Filter Tabs & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div className="artist-tabs" style={{ margin: 0, border: 'none', borderBottom: '1px solid var(--border-color)', flex: 1 }}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`artist-tabs__tab ${activeCategory === cat.id ? 'artist-tabs__tab--active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="search-bar" style={{ margin: 0, minWidth: '250px' }}>
            <span className="search-bar__icon">🔍</span>
            <input
              type="text"
              className="search-bar__input"
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Tags Grid */}
        {loading ? (
          <div className="loading">Loading tag library...</div>
        ) : filteredTags.length > 0 ? (
          <div className="tag-manager-grid">
            {filteredTags.map((tag) => (
              <div key={tag.id} className="tag-manager-card">
                <span className={`tag-badge tag-badge--${tag.category || 'general'}`} style={{ fontSize: 'var(--fs-sm)' }}>
                  {tag.name}
                </span>
                <button
                  type="button"
                  className="btn-danger"
                  style={{ padding: '2px 6px', fontSize: '11px', opacity: 0.8 }}
                  onClick={() => handleDelete(tag)}
                  title="Delete tag"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {search ? 'No matching tags found' : 'No tags in this category yet'}
          </div>
        )}
      </div>
    </div>
  );
}
