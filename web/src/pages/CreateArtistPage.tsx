import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function CreateArtistPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState(() => Math.floor(10000000 + Math.random() * 90000000).toString());
  const [bio, setBio] = useState('');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([
    { label: 'Twitter / X', url: '' },
    { label: 'Pixiv', url: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
  };

  const avatarPreview = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  const bannerPreview = useMemo(() => {
    if (!bannerFile) return null;
    return URL.createObjectURL(bannerFile);
  }, [bannerFile]);

  const addLinkField = () => {
    setLinks([...links, { label: '', url: '' }]);
  };

  const updateLink = (index: number, key: 'label' | 'url', value: string) => {
    const next = [...links];
    next[index][key] = value;
    setLinks(next);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Artist name is required.');
      return;
    }
    if (!slug.trim()) {
      setError('URL slug is required.');
      return;
    }

    setLoading(true);
    try {
      setStatusText('Creating artist profile...');
      const linksMap: Record<string, string> = {};
      for (const item of links) {
        if (item.label.trim() && item.url.trim()) {
          linksMap[item.label.trim()] = item.url.trim();
        }
      }

      const created = await api.createArtist({
        name: name.trim(),
        slug: slug.trim(),
        bio: bio.trim(),
        links: Object.keys(linksMap).length > 0 ? linksMap : undefined
      });

      if (avatarFile) {
        setStatusText('Uploading avatar...');
        await api.uploadAvatar(created.id, avatarFile);
      }

      if (bannerFile) {
        setStatusText('Uploading banner...');
        await api.uploadBanner(created.id, bannerFile);
      }

      setStatusText('Done! Redirecting...');
      navigate(`/artist/${created.slug}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create artist');
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="breadcrumb">
        <Link to="/">Artists</Link> &nbsp;/&nbsp; <span>New Artist Profile</span>
      </div>

      <div className="form-card">
        <div className="form-card__header">
          <h1 className="form-card__title">✨ Create New Artist</h1>
          <p className="form-card__subtitle">
            Add an illustrator, creator, or art studio to your personal Ekokan gallery.
          </p>
        </div>

        {error && <div className="form-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Artist Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mika Pikazo, Kantoku, Mochizuki Kei"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              disabled={loading}
            />
            <span className="form-helper">The primary visual display name of the artist.</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              Artist URL ID <span style={{ color: 'var(--danger)' }}>*</span>
              <span className="form-label__hint">Numeric or Creator ID (e.g., 37736420)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 37736420"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              disabled={loading}
            />
            <span className="form-helper">Accessed via /artist/<strong>{slug || '37736420'}</strong></span>
          </div>

          <div className="form-group">
            <label className="form-label">
              Biography / Notes
              <span className="form-label__hint">Optional</span>
            </label>
            <textarea
              rows={4}
              placeholder="Brief overview, style descriptions, or personal archiving notes..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Avatar Upload */}
          <div className="form-group">
            <label className="form-label">
              Avatar Image
              <span className="form-label__hint">Square aspect ratio recommended</span>
            </label>
            {!avatarPreview ? (
              <div className="dropzone">
                <input
                  type="file"
                  accept="image/*"
                  className="dropzone__input"
                  onChange={(e) => e.target.files?.[0] && setAvatarFile(e.target.files[0])}
                  disabled={loading}
                />
                <div className="dropzone__icon">🖼️</div>
                <div className="dropzone__text">Click or drag an image here to upload avatar</div>
                <div className="dropzone__subtext">PNG, JPG, WebP supported</div>
              </div>
            ) : (
              <div className="file-preview-item">
                <img src={avatarPreview} alt="Avatar preview" className="file-preview-item__thumb" />
                <div className="file-preview-item__info">
                  <div className="file-preview-item__name">{avatarFile?.name}</div>
                  <div className="file-preview-item__size">
                    {avatarFile && `${Math.round(avatarFile.size / 1024)} KB`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setAvatarFile(null)}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Banner Upload */}
          <div className="form-group">
            <label className="form-label">
              Profile Banner Image
              <span className="form-label__hint">Wide cover background (e.g. 1920x400)</span>
            </label>
            {!bannerPreview ? (
              <div className="dropzone">
                <input
                  type="file"
                  accept="image/*"
                  className="dropzone__input"
                  onChange={(e) => e.target.files?.[0] && setBannerFile(e.target.files[0])}
                  disabled={loading}
                />
                <div className="dropzone__icon">🌄</div>
                <div className="dropzone__text">Click or drag a cover banner here</div>
                <div className="dropzone__subtext">Large widescreen illustrations work best</div>
              </div>
            ) : (
              <div className="file-preview-item">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="file-preview-item__thumb"
                  style={{ width: '120px', height: '40px' }}
                />
                <div className="file-preview-item__info">
                  <div className="file-preview-item__name">{bannerFile?.name}</div>
                  <div className="file-preview-item__size">
                    {bannerFile && `${Math.round(bannerFile.size / 1024)} KB`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setBannerFile(null)}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="form-group">
            <label className="form-label">External Links</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {links.map((link, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Platform (e.g. Pixiv)"
                    value={link.label}
                    onChange={(e) => updateLink(idx, 'label', e.target.value)}
                    style={{ width: '180px' }}
                    disabled={loading}
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateLink(idx, 'url', e.target.value)}
                    style={{ flex: 1 }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => removeLink(idx)}
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={addLinkField}
              style={{ alignSelf: 'flex-start', marginTop: 'var(--space-sm)' }}
              disabled={loading}
            >
              + Add Another Link
            </button>
          </div>

          {loading && (
            <div className="progress-box">
              <div className="progress-box__title">⏳ {statusText || 'Processing...'}</div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: '100%', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
            <Link to="/" className="btn-secondary" style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '✓ Save & Create Artist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
