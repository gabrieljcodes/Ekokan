import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  IconUser,
  IconWarning,
  IconImage,
  IconExternalLink,
  IconPlus,
  IconTrash,
  IconCheck,
  IconBolt,

} from '../components/Icons';

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

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // [P0 Fix] Manage Avatar preview blob URL and revoke upon change/unmount to eliminate memory leaks
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  // [P0 Fix] Manage Banner preview blob URL and revoke upon change/unmount to eliminate memory leaks
  useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(bannerFile);
    setBannerPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [bannerFile]);

  const handleNameChange = useCallback((val: string) => {
    setName(val);
  }, []);

  const handleAvatarSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Defensive client-side filesize guardrail (50MB maximum for avatars)
    if (file.size > 50 * 1024 * 1024) {
      setError(`Avatar image "${file.name}" exceeds the maximum file size limit (50MB).`);
      return;
    }
    setAvatarFile(file);
    setError(null);
  }, []);

  const handleBannerSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Defensive client-side filesize guardrail (150MB maximum for cover banners)
    if (file.size > 150 * 1024 * 1024) {
      setError(`Banner image "${file.name}" exceeds the maximum file size limit (150MB).`);
      return;
    }
    setBannerFile(file);
    setError(null);
  }, []);

  const addLinkField = useCallback(() => {
    setLinks((prev) => [...prev, { label: '', url: '' }]);
  }, []);

  const updateLink = useCallback((index: number, key: 'label' | 'url', value: string) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  }, []);

  const removeLink = useCallback((index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
      if (isMountedRef.current) setStatusText('Creating artist profile...');
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
        if (isMountedRef.current) setStatusText('Uploading avatar image...');
        await api.uploadAvatar(created.id, avatarFile);
      }

      if (bannerFile) {
        if (isMountedRef.current) setStatusText('Uploading profile banner image...');
        await api.uploadBanner(created.id, bannerFile);
      }

      if (isMountedRef.current) {
        setStatusText('Profile created! Redirecting to gallery...');
        navigate(`/artist/${created.slug}`);
      }
    } catch (err: unknown) {
      console.error(err);
      if (isMountedRef.current) {
        setError((err as Error).message || 'Failed to create artist profile');
        setLoading(false);
      }
    }
  }, [name, slug, bio, links, avatarFile, bannerFile, navigate]);

  return (
    <main role="main" className="app-container">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Artists</Link> &nbsp;/&nbsp; <span>New Artist Profile</span>
      </nav>

      <div className="form-card">
        <div className="form-card__header">
          <h1 className="form-card__title">
            <span className="create-artist__title-icon">
              <IconUser size={28} aria-hidden={true} />
              <span>Create New Artist</span>
            </span>
          </h1>
          <p className="form-card__subtitle">
            Add an illustrator, creator, or art studio to your personal Ekokan gallery.
          </p>
        </div>

        {error && (
          <div className="form-error" role="alert" aria-live="assertive">
            <IconWarning size={18} aria-hidden={true} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          {/* Artist Name */}
          <div className="form-group">
            <label htmlFor="create-artist-name" className="form-label">
              <span>Artist Name</span>
              <span className="create-artist__required-mark" aria-hidden="true">*</span>
              <span className="sr-only">(Required)</span>
            </label>
            <input
              id="create-artist-name"
              type="text"
              placeholder="e.g. Mika Pikazo, Kantoku, Mochizuki Kei"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              disabled={loading}
            />
            <span className="form-helper">The primary visual display name of the artist.</span>
          </div>

          {/* Artist URL ID / Slug */}
          <div className="form-group">
            <label htmlFor="create-artist-slug" className="form-label">
              <span>Artist URL ID</span>
              <span className="create-artist__required-mark" aria-hidden="true">*</span>
              <span className="sr-only">(Required)</span>
              <span className="form-label__hint">Numeric or Creator ID (e.g., 37736420)</span>
            </label>
            <input
              id="create-artist-slug"
              type="text"
              placeholder="e.g. 37736420"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              disabled={loading}
            />
            <span className="form-helper">Accessed via /artist/<strong>{slug || '37736420'}</strong></span>
          </div>

          {/* Biography / Notes */}
          <div className="form-group">
            <label htmlFor="create-artist-bio" className="form-label">
              <span>Biography & Notes</span>
              <span className="form-label__hint">Optional</span>
            </label>
            <textarea
              id="create-artist-bio"
              rows={4}
              placeholder="Brief overview, style descriptions, or personal archiving notes..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Avatar Upload */}
          <div className="form-group">
            <label htmlFor="create-avatar-input" className="form-label">
              <span>Avatar Image</span>
              <span className="form-label__hint">Square aspect ratio recommended</span>
            </label>
            {!avatarPreview ? (
              <div className="dropzone">
                <input
                  id="create-avatar-input"
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                  className="dropzone__input"
                  onChange={handleAvatarSelect}
                  disabled={loading}
                  aria-label="Upload artist avatar image (PNG, JPG, WebP & animated GIF supported)"
                />
                <div className="dropzone__icon" aria-hidden="true">
                  <IconImage size={40} />
                </div>
                <div className="dropzone__text">Click or drag an image here to upload avatar</div>
                <div className="dropzone__subtext">PNG, JPG, WebP & animated GIF supported (Max 50MB)</div>
              </div>
            ) : (
              <div className="file-preview-item motion-arrive-row">
                <img src={avatarPreview} alt="Avatar preview thumbnail" className="file-preview-item__thumb" decoding="async" />
                <div className="file-preview-item__info">
                  <div className="file-preview-item__name">{avatarFile?.name}</div>
                  <div className="file-preview-item__size">
                    {avatarFile && `${Math.round(avatarFile.size / 1024)} KB`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger create-artist__remove-link-btn"
                  onClick={() => setAvatarFile(null)}
                  disabled={loading}
                  aria-label="Remove selected avatar image"
                >
                  <IconTrash size={16} aria-hidden={true} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Banner Upload */}
          <div className="form-group">
            <label htmlFor="create-banner-input" className="form-label">
              <span>Profile Banner Image</span>
              <span className="form-label__hint">Wide cover background (e.g. 1920x400)</span>
            </label>
            {!bannerPreview ? (
              <div className="dropzone">
                <input
                  id="create-banner-input"
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
                  className="dropzone__input"
                  onChange={handleBannerSelect}
                  disabled={loading}
                  aria-label="Upload artist cover banner illustration (Large widescreen illustrations or GIF supported)"
                />
                <div className="dropzone__icon" aria-hidden="true">
                  <IconImage size={42} />
                </div>
                <div className="dropzone__text">Click or drag a cover banner here</div>
                <div className="dropzone__subtext">Large widescreen illustrations work best (Max 150MB)</div>
              </div>
            ) : (
              <div className="file-preview-item motion-arrive-row">
                <img
                  src={bannerPreview}
                  alt="Banner cover preview thumbnail"
                  className="create-artist__banner-thumb"
                  decoding="async"
                />
                <div className="file-preview-item__info">
                  <div className="file-preview-item__name">{bannerFile?.name}</div>
                  <div className="file-preview-item__size">
                    {bannerFile && `${Math.round(bannerFile.size / 1024)} KB`}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger create-artist__remove-link-btn"
                  onClick={() => setBannerFile(null)}
                  disabled={loading}
                  aria-label="Remove selected banner illustration"
                >
                  <IconTrash size={16} aria-hidden={true} />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* External Links */}
          <div className="form-group" role="region" aria-label="External portfolio links">
            <span className="form-label" id="create-links-heading">
              <span className="create-artist__title-icon">
                <IconExternalLink size={18} aria-hidden={true} />
                <span>External Links & Portfolios</span>
              </span>
            </span>

            <div className="create-artist__links-stack" aria-labelledby="create-links-heading">
              {links.map((link, idx) => (
                <div key={idx} className="create-artist__link-row motion-arrive-row">
                  <label htmlFor={`artist-link-label-${idx}`} className="sr-only">Platform name for link {idx + 1}</label>
                  <input
                    id={`artist-link-label-${idx}`}
                    type="text"
                    placeholder="Platform (e.g. Pixiv)"
                    value={link.label}
                    onChange={(e) => updateLink(idx, 'label', e.target.value)}
                    className="form-input create-artist__link-label"
                    disabled={loading}
                  />

                  <label htmlFor={`artist-link-url-${idx}`} className="sr-only">Web address URL for link {idx + 1}</label>
                  <input
                    id={`artist-link-url-${idx}`}
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateLink(idx, 'url', e.target.value)}
                    className="form-input create-artist__link-url"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className="btn-danger create-artist__remove-link-btn"
                    onClick={() => removeLink(idx)}
                    disabled={loading}
                    aria-label={`Remove link ${link.label || `number ${idx + 1}`}`}
                  >
                    <IconTrash size={16} aria-hidden={true} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn-secondary create-artist__add-link-btn"
              onClick={addLinkField}
              disabled={loading}
              aria-label="Add another external link row"
            >
              <IconPlus size={14} aria-hidden={true} />
              <span>Add Another Link</span>
            </button>
          </div>

          {loading && (
            <div className="progress-box" role="status" aria-live="polite">
              <div className="progress-box__title progress-box__title--icon">
                <IconBolt size={20} aria-hidden={true} />
                <span>{statusText || 'Processing profile archival...'}</span>
              </div>
              <div
                className="progress-bar"
                role="progressbar"
                aria-valuenow={50}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="progress-bar__fill" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          <div className="create-artist__form-actions">
            <Link to="/" className="btn-secondary create-artist__action-btn" aria-disabled={loading}>
              <span>Cancel</span>
            </Link>
            <button type="submit" className="btn-primary create-artist__action-btn" disabled={loading}>
              <IconCheck size={16} aria-hidden={true} />
              <span>{loading ? 'Creating Profile...' : 'Save & Create Artist'}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
