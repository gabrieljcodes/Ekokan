import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist } from '../types/models';

export default function EditArtistPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);

  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setFetching(true);
    api.getArtist(slug)
      .then((data) => {
        setArtist(data);
        setName(data.name || '');
        setBio(data.bio || '');
        if (data.links) {
          const loadedLinks = Object.entries(data.links).map(([label, url]) => ({ label, url }));
          setLinks(loadedLinks.length > 0 ? loadedLinks : [{ label: 'Twitter / X', url: '' }]);
        } else {
          setLinks([{ label: 'Twitter / X', url: '' }]);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load artist details.');
      })
      .finally(() => setFetching(false));
  }, [slug]);

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
    if (!artist) return;
    setError(null);

    if (!name.trim()) {
      setError('Artist name is required.');
      return;
    }

    setLoading(true);
    try {
      setStatusText('Updating artist details...');
      const linksMap: Record<string, string> = {};
      for (const item of links) {
        if (item.label.trim() && item.url.trim()) {
          linksMap[item.label.trim()] = item.url.trim();
        }
      }

      await api.updateArtist(artist.id, {
        name: name.trim(),
        bio: bio.trim(),
        links: linksMap
      });

      if (avatarFile) {
        setStatusText('Uploading new avatar...');
        await api.uploadAvatar(artist.id, avatarFile);
      }

      if (bannerFile) {
        setStatusText('Uploading new banner...');
        await api.uploadBanner(artist.id, bannerFile);
      }

      setStatusText('Done! Redirecting...');
      navigate(`/artist/${artist.slug}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update artist');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!artist) return;
    setLoading(true);
    setStatusText('Deleting artist...');
    try {
      await api.deleteArtist(artist.id);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to delete artist');
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (fetching) {
    return <div className="loading">Loading artist settings...</div>;
  }

  if (!artist) {
    return (
      <div className="app-container">
        <div className="empty-state">Artist not found</div>
        <Link to="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem' }}>
          ← Return to Artist Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="breadcrumb">
        <Link to="/">Artists</Link> &nbsp;/&nbsp;
        <Link to={`/artist/${artist.slug}`}>{artist.name}</Link> &nbsp;/&nbsp;
        <span>Edit Artist Profile</span>
      </div>

      <div className="form-card">
        <div className="form-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="form-card__title">✏️ Edit Artist: {artist.name}</h1>
            <p className="form-card__subtitle">
              Modify artist profile details, biography, links, avatar, and banner.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger"
            style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}
            disabled={loading}
          >
            🗑️ Delete Creator
          </button>
        </div>

        {error && <div className="form-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Artist Name <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mika Pikazo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
            <span className="form-helper">The primary display name of the artist.</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              URL Slug <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>(Read Only)</span>
            </label>
            <input
              type="text"
              value={artist.slug}
              disabled={true}
              style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
            />
            <span className="form-helper">The unique gallery URL slug (/artist/<strong>{artist.slug}</strong>) cannot be modified after initial creation to protect existing hyperlinks.</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              Biography / Notes
              <span className="form-label__hint">Optional</span>
            </label>
            <textarea
              rows={4}
              placeholder="Overview, artist style descriptions, or personal archiving notes..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Avatar Upload */}
          <div className="form-group">
            <label className="form-label">
              Avatar Image
              <span className="form-label__hint">Leave blank to keep current avatar</span>
            </label>
            {artist.avatar_url && !avatarPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <img src={artist.avatar_url} alt="Current Avatar" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
                <div>
                  <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Current Avatar Active</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>Upload below to replace this image</div>
                </div>
              </div>
            )}
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
                <div className="dropzone__text">Click or drag an image here to upload new avatar</div>
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
                  Cancel Replacement
                </button>
              </div>
            )}
          </div>

          {/* Banner Upload */}
          <div className="form-group">
            <label className="form-label">
              Profile Banner Image
              <span className="form-label__hint">Leave blank to keep current cover</span>
            </label>
            {artist.banner_url && !bannerPreview && (
              <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                <img src={artist.banner_url} alt="Current Banner" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: 'var(--fs-sm)', fontWeight: 500 }}>
                  Current Cover Banner
                </div>
              </div>
            )}
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
                <div className="dropzone__text">Click or drag an image here to replace cover banner</div>
                <div className="dropzone__subtext">Large widescreen animations or artworks work best</div>
              </div>
            ) : (
              <div className="file-preview-item">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="file-preview-item__thumb"
                  style={{ width: '140px', height: '48px', objectFit: 'cover' }}
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
                  Cancel Replacement
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
                    placeholder="Platform (e.g. Patreon, Pixiv, Twitter)"
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
              <div className="progress-box__title">⏳ {statusText || 'Saving changes...'}</div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: '100%', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
            <Link to={`/artist/${artist.slug}`} className="btn-secondary" style={{ padding: 'var(--space-sm) var(--space-lg)', textDecoration: 'none' }}>
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
              {loading ? 'Saving...' : '✓ Save Artist Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--danger)', fontSize: '1.4rem' }}>⚠️ Delete Artist?</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: 'var(--fs-sm)' }}>
              Are you sure you want to completely delete <strong>{artist.name}</strong> and all associated posts, attachments, and files? <strong>This action is permanent and cannot be undone.</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 18px', borderRadius: '8px' }}
                disabled={loading}
              >
                Keep Creator
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger"
                style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: 'bold' }}
                disabled={loading}
              >
                Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
