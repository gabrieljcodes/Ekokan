import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist } from '../types/models';
import {
  IconEdit,
  IconTrash,
  IconWarning,
  IconImage,
  IconRefresh,
  IconCheck,
  IconArrowLeft,
  IconPlus,
  IconX,
} from '../components/Icons';

export default function EditArtistPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

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

  // Securely manage Object URLs without DOM memory leaks
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [avatarFile]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [bannerFile]);

  // Keyboard trap and escape handler for accessibility in dialog modal
  useEffect(() => {
    if (!showDeleteModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal, loading]);

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
    return (
      <div className="loading" role="status" aria-live="polite">
        <IconRefresh size={22} className="admin-icon--spinning" />
        <span>Loading artist settings...</span>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="app-container">
        <div className="empty-state" role="alert">Artist not found</div>
        <div className="empty-state__actions">
          <Link to="/" className="edit-artist__return-link">
            <IconArrowLeft size={16} /> Return to Artist Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Artists</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <Link to={`/artist/${artist.slug}`}>{artist.name}</Link>
        <span className="breadcrumb__sep" aria-hidden="true">/</span>
        <span aria-current="page">Edit Artist Profile</span>
      </nav>

      <div className="form-card">
        <div className="form-card__header form-card__header--split">
          <div>
            <h1 className="form-card__title">
              <IconEdit size={22} /> Edit Artist: {artist.name}
            </h1>
            <p className="form-card__subtitle">
              Modify artist profile details, biography, links, avatar, and banner.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger edit-artist__delete-btn"
            disabled={loading}
          >
            <IconTrash size={16} /> Delete Creator
          </button>
        </div>

        {error && (
          <div className="form-error motion-arrive-card" role="alert">
            <IconWarning size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="artist-name">
              <span>Artist Name</span>
              <span className="edit-artist__required-mark">*</span>
            </label>
            <input
              id="artist-name"
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
            <label className="form-label" htmlFor="artist-slug-readonly">
              <span>URL Slug</span>
              <span className="edit-artist__readonly-hint">(Read Only)</span>
            </label>
            <input
              id="artist-slug-readonly"
              type="text"
              value={artist.slug}
              readOnly={true}
              aria-readonly="true"
              className="edit-artist__readonly-input"
            />
            <span className="form-helper">
              The unique gallery URL slug (/artist/<strong>{artist.slug}</strong>) cannot be modified after initial creation to protect existing hyperlinks.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="artist-bio">
              <span>Biography / Notes</span>
              <span className="form-label__hint">Optional</span>
            </label>
            <textarea
              id="artist-bio"
              rows={4}
              placeholder="Overview, artist style descriptions, or personal archiving notes..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Avatar Upload */}
          <div className="form-group">
            <label className="form-label" htmlFor="avatar-upload-input">
              <span>Avatar Image</span>
              <span className="form-label__hint">Leave blank to keep current avatar</span>
            </label>
            {artist.avatar_url && !avatarPreview && (
              <div className="edit-artist__current-card">
                <img src={artist.avatar_url} alt="" className="edit-artist__current-avatar" />
                <div>
                  <div className="edit-artist__current-title">Current Avatar Active</div>
                  <div className="edit-artist__current-subtitle">Upload below to replace this image</div>
                </div>
              </div>
            )}
            {!avatarPreview ? (
              <div className="dropzone">
                <input
                  id="avatar-upload-input"
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                  className="dropzone__input"
                  aria-label="Upload new artist avatar image (including animated GIF)"
                  onChange={(e) => e.target.files?.[0] && setAvatarFile(e.target.files[0])}
                  disabled={loading}
                />
                <div className="dropzone__icon">
                  <IconImage size={28} />
                </div>
                <div className="dropzone__text">Click or drag an image here to upload new avatar</div>
                <div className="dropzone__subtext">PNG, JPG, WebP & animated GIF supported</div>
              </div>
            ) : (
              <div className="file-preview-item motion-arrive-card">
                <img src={avatarPreview} alt="" className="file-preview-item__thumb" />
                <div className="file-preview-item__info">
                  <div className="file-preview-item__name">{avatarFile?.name}</div>
                  <div className="file-preview-item__size">
                    {avatarFile && `${Math.round(avatarFile.size / 1024)} KB`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger edit-artist__delete-btn"
                  onClick={() => setAvatarFile(null)}
                  disabled={loading}
                >
                  <IconX size={14} /> Cancel Replacement
                </button>
              </div>
            )}
          </div>

          {/* Banner Upload */}
          <div className="form-group">
            <label className="form-label" htmlFor="banner-upload-input">
              <span>Profile Banner Image</span>
              <span className="form-label__hint">Leave blank to keep current cover</span>
            </label>
            {artist.banner_url && !bannerPreview && (
              <div className="edit-artist__banner-container">
                <img src={artist.banner_url} alt="" className="edit-artist__current-banner" />
                <div className="edit-artist__banner-badge">
                  Current Cover Banner Active
                </div>
              </div>
            )}
            {!bannerPreview ? (
              <div className="dropzone">
                <input
                  id="banner-upload-input"
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                  className="dropzone__input"
                  aria-label="Upload new profile cover banner"
                  onChange={(e) => e.target.files?.[0] && setBannerFile(e.target.files[0])}
                  disabled={loading}
                />
                <div className="dropzone__icon">
                  <IconImage size={28} />
                </div>
                <div className="dropzone__text">Click or drag an image here to replace cover banner</div>
                <div className="dropzone__subtext">Large widescreen animations or artworks work best</div>
              </div>
            ) : (
              <div className="file-preview-item motion-arrive-card">
                <img
                  src={bannerPreview}
                  alt=""
                  className="file-preview-item__thumb edit-artist__banner-preview-thumb"
                />
                <div className="file-preview-item__info">
                  <div className="file-preview-item__name">{bannerFile?.name}</div>
                  <div className="file-preview-item__size">
                    {bannerFile && `${Math.round(bannerFile.size / 1024)} KB`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger edit-artist__delete-btn"
                  onClick={() => setBannerFile(null)}
                  disabled={loading}
                >
                  <IconX size={14} /> Cancel Replacement
                </button>
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="form-group">
            <label className="form-label">External Links</label>
            <div className="edit-artist__links-stack">
              {links.map((link, idx) => (
                <div key={idx} className="edit-artist__link-row motion-arrive-row">
                  <input
                    type="text"
                    placeholder="Platform (e.g. Patreon, Pixiv, Twitter)"
                    aria-label={`Link platform name for row ${idx + 1}`}
                    value={link.label}
                    onChange={(e) => updateLink(idx, 'label', e.target.value)}
                    className="edit-artist__link-label"
                    disabled={loading}
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    aria-label={`Link web URL for row ${idx + 1}`}
                    value={link.url}
                    onChange={(e) => updateLink(idx, 'url', e.target.value)}
                    className="edit-artist__link-url"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn-danger"
                    aria-label={`Remove link row ${idx + 1}`}
                    onClick={() => removeLink(idx)}
                    disabled={loading}
                  >
                    <IconX size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn-secondary edit-artist__add-link-btn"
              onClick={addLinkField}
              disabled={loading}
            >
              <IconPlus size={16} /> Add Another Link
            </button>
          </div>

          {loading && (
            <div className="progress-box" role="status" aria-live="polite">
              <div className="progress-box__title">
                <IconRefresh size={16} className="admin-icon--spinning" />
                <span>{statusText || 'Saving changes...'}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" />
              </div>
            </div>
          )}

          <div className="edit-artist__form-actions">
            <Link to={`/artist/${artist.slug}`} className="btn-secondary edit-artist__action-btn">
              <IconArrowLeft size={16} /> Cancel
            </Link>
            <button type="submit" className="btn-primary edit-artist__action-btn" disabled={loading}>
              {loading ? (
                <>
                  <IconRefresh size={16} className="admin-icon--spinning" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <IconCheck size={16} />
                  <span>Save Artist Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" role="presentation">
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-artist-title"
          >
            <h3 id="delete-artist-title" className="modal-card__title">
              <IconWarning size={22} /> Delete Artist?
            </h3>
            <p className="modal-card__description">
              Are you sure you want to completely delete <strong>{artist.name}</strong> and all associated posts, attachments, and files? <strong>This action is permanent and cannot be undone.</strong>
            </p>
            <div className="modal-card__actions">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary modal-card__btn"
                disabled={loading}
              >
                Keep Creator
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger modal-card__btn"
                disabled={loading}
              >
                <IconTrash size={16} /> Yes, Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
