import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Tag } from '../types/models';
import {
  IconUpload,
  IconWarning,
  IconPlus,
  IconCheck,
  IconImage,
  IconFilm,
  IconPackage,
  IconTrash,
  IconBolt,

} from '../components/Icons';

interface MediaItem {
  file: File;
  caption: string;
  preview: string;
}

interface AttachmentItem {
  file: File;
  displayName: string;
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialArtistSlug = searchParams.get('artist');

  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [customSlug, setCustomSlug] = useState(false);
  const [content, setContent] = useState('');

  const getInitialLocalDatetime = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const local = new Date(now.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
  };
  const [publishedAt, setPublishedAt] = useState(getInitialLocalDatetime);

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('general');
  const [tagCreating, setTagCreating] = useState(false);

  // Files state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [attachmentItems, setAttachmentItems] = useState<AttachmentItem[]>([]);

  // Submission & network state
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const mediaRefs = useRef<MediaItem[]>([]);

  useEffect(() => {
    mediaRefs.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // [P0 Fix] Revoke active Object URLs on unmount to prevent browser memory leaks
      mediaRefs.current.forEach((item) => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, []);

  useEffect(() => {
    api.listArtists(1, 200).then((res) => {
      if (!isMountedRef.current) return;
      setArtists(res.data);
      if (initialArtistSlug) {
        const found = res.data.find((a) => a.slug === initialArtistSlug);
        if (found) setSelectedArtistId(found.id);
      } else if (res.data.length > 0 && !selectedArtistId) {
        setSelectedArtistId(res.data[0].id);
      }
    }).catch((err: unknown) => {
      console.error('Error loading artists:', err);
    });

    api.listTags().then((loadedTags) => {
      if (isMountedRef.current) setTags(loadedTags);
    }).catch((err: unknown) => {
      console.error('Error loading tags:', err);
    });
  }, [initialArtistSlug, selectedArtistId]);

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val);
    if (!customSlug) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  }, [customSlug]);

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const handleQuickCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return;
    setTagCreating(true);
    setError(null);
    try {
      const created = await api.createTag({
        name: newTagName.trim(),
        category: newTagCategory
      });
      if (isMountedRef.current) {
        setTags((prev) => [...prev, created]);
        setSelectedTagIds((prev) => [...prev, created.id]);
        setNewTagName('');
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError((err as Error).message || 'Failed to create tag. Please verify network connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setTagCreating(false);
      }
    }
  }, [newTagName, newTagCategory]);

  const handleAddMedia = useCallback((files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);

    // Defensive file size validation guardrail (250MB limit per artwork image/video)
    const oversized = incoming.find((file) => file.size > 250 * 1024 * 1024);
    if (oversized) {
      setError(`File "${oversized.name}" exceeds the maximum artwork size limit (250MB).`);
      return;
    }

    const newItems: MediaItem[] = incoming.map((file) => ({
      file,
      caption: '',
      preview: URL.createObjectURL(file)
    }));
    setMediaItems((prev) => [...prev, ...newItems]);
    setError(null);
  }, []);

  const removeMedia = useCallback((index: number) => {
    setMediaItems((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleAddAttachments = useCallback((files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);

    // Defensive attachment size validation guardrail (1GB limit per archive)
    const oversized = incoming.find((file) => file.size > 1024 * 1024 * 1024);
    if (oversized) {
      setError(`Attachment "${oversized.name}" exceeds the maximum archive size limit (1GB).`);
      return;
    }

    const newItems: AttachmentItem[] = incoming.map((file) => ({
      file,
      displayName: file.name
    }));
    setAttachmentItems((prev) => [...prev, ...newItems]);
    setError(null);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachmentItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedArtistId) {
      setError('Please select an artist for this post.');
      return;
    }
    if (!title.trim() || !slug.trim()) {
      setError('Title and slug are required.');
      return;
    }

    const artist = artists.find((a) => a.id === selectedArtistId);
    if (!artist) {
      setError('Selected artist is invalid.');
      return;
    }

    setLoading(true);
    try {
      if (isMountedRef.current) {
        setStatusText('Creating post metadata...');
        setProgressPercent(10);
      }

      const createdPost = await api.createPost({
        artist_id: selectedArtistId,
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim() || undefined,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      });

      const totalFiles = mediaItems.length + attachmentItems.length;
      let finishedFiles = 0;

      // Upload media items
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        if (isMountedRef.current) {
          setStatusText(`Uploading artwork ${i + 1} of ${mediaItems.length}: ${item.file.name}...`);
        }
        await api.uploadMedia(createdPost.id, item.file, item.caption.trim());
        finishedFiles++;
        if (isMountedRef.current) {
          setProgressPercent(10 + Math.round((finishedFiles / Math.max(1, totalFiles)) * 85));
        }
      }

      // Upload attachment archives
      for (let i = 0; i < attachmentItems.length; i++) {
        const item = attachmentItems[i];
        if (isMountedRef.current) {
          setStatusText(`Uploading file ${i + 1} of ${attachmentItems.length}: ${item.file.name}...`);
        }
        await api.uploadAttachment(createdPost.id, item.file, item.displayName.trim());
        finishedFiles++;
        if (isMountedRef.current) {
          setProgressPercent(10 + Math.round((finishedFiles / Math.max(1, totalFiles)) * 85));
        }
      }

      if (isMountedRef.current) {
        setStatusText('Upload completed! Redirecting...');
        setProgressPercent(100);
        navigate(`/artist/${artist.slug}/post/${createdPost.id}`);
      }
    } catch (err: unknown) {
      console.error(err);
      if (isMountedRef.current) {
        setError((err as Error).message || 'Error creating post or uploading files');
        setLoading(false);
      }
    }
  }, [selectedArtistId, title, slug, content, selectedTagIds, publishedAt, mediaItems, attachmentItems, artists, navigate]);

  return (
    <main role="main" className="app-container">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Gallery</Link> &nbsp;/&nbsp; <span>Upload New Post</span>
      </nav>

      <div className="form-card">
        <div className="form-card__header">
          <h1 className="form-card__title">
            <span className="create-post__title-icon">
              <IconUpload size={28} aria-hidden={true} />
              <span>Upload New Art Post</span>
            </span>
          </h1>
          <p className="form-card__subtitle">
            Create an archive post with high-res illustrations, tags, and downloadable bonus files.
          </p>
        </div>

        {error && (
          <div className="form-error" role="alert" aria-live="assertive">
            <IconWarning size={18} aria-hidden={true} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-stack">
          {/* Artist Selector */}
          <div className="form-group">
            <div className="create-post__label-row">
              <label htmlFor="create-artist-select" className="form-label">
                <span>Artist / Creator</span>
                <span className="create-post__required-mark" aria-hidden="true">*</span>
                <span className="sr-only">(Required)</span>
              </label>
              <Link to="/artists/new" className="create-post__label-link">
                <IconPlus size={14} aria-hidden={true} />
                <span>Create New Artist</span>
              </Link>
            </div>
            <select
              id="create-artist-select"
              value={selectedArtistId}
              onChange={(e) => setSelectedArtistId(e.target.value)}
              required
              disabled={loading || artists.length === 0}
            >
              {artists.length === 0 ? (
                <option value="">No artists found — Please create one first</option>
              ) : (
                <>
                  <option value="" disabled>-- Select an artist --</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.slug})
                    </option>
                  ))}
                </>
              )}
            </select>
            <span className="form-helper">The original creator of this content.</span>
          </div>

          {/* Title */}
          <div className="form-group">
            <label htmlFor="create-title-input" className="form-label">
              <span>Post Title</span>
              <span className="create-post__required-mark" aria-hidden="true">*</span>
              <span className="sr-only">(Required)</span>
            </label>
            <input
              id="create-title-input"
              type="text"
              placeholder="e.g. Summer Vacation Illustration Pack #04"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Slug */}
          <div className="form-group">
            <label htmlFor="create-slug-input" className="form-label">
              <span>URL Slug</span>
              <span className="create-post__required-mark" aria-hidden="true">*</span>
              <span className="sr-only">(Required)</span>
              <span className="form-label__hint">Auto-generated identifier</span>
            </label>
            <input
              id="create-slug-input"
              type="text"
              placeholder="e.g. summer-vacation-illustration-pack-04"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setCustomSlug(true);
              }}
              required
              disabled={loading}
            />
          </div>

          {/* Content / Notes */}
          <div className="form-group">
            <label htmlFor="create-description-textarea" className="form-label">
              <span>Description & Commentary</span>
              <span className="form-label__hint">Optional</span>
            </label>
            <textarea
              id="create-description-textarea"
              rows={5}
              placeholder="Artist remarks, translation, source links, or archiving commentary..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Published At Date / Time */}
          <div className="form-group">
            <label htmlFor="create-published-at" className="form-label">
              <span>Published Date & Time</span>
              <span className="form-label__hint">Optional</span>
            </label>
            <input
              id="create-published-at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={loading}
              className="create-post__datetime-input"
            />
            <span className="form-helper">
              Set the original publication timestamp of this artwork or post. Defaults to current local clock if unchanged.
            </span>
          </div>

          {/* Tags Picker & Creator */}
          <div className="form-group" role="region" aria-label="Tag categorization">
            <span className="form-label" id="create-tags-heading">
              <span>Tags & Categories</span>
              <span className="form-label__hint">{selectedTagIds.length} selected</span>
            </span>
            
            <div className="tag-selector" aria-labelledby="create-tags-heading">
              {tags.length === 0 ? (
                <span className="create-post__tag-empty">No tags created yet. Add one below!</span>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleTag(tag.id)}
                      className={`tag-badge tag-badge--${tag.category || 'general'} tag-selector__pill create-post__tag-btn ${
                        isSelected ? 'create-post__tag-pill--selected' : 'create-post__tag-pill--unselected'
                      }`.trim()}
                    >
                      {isSelected ? (
                        <IconCheck size={13} aria-hidden={true} />
                      ) : (
                        <IconPlus size={13} aria-hidden={true} />
                      )}
                      <span>{tag.name}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Inline Quick Create Tag */}
            <div className="create-post__quick-tag-row">
              <label htmlFor="create-tag-name-input" className="sr-only">New tag name</label>
              <input
                id="create-tag-name-input"
                type="text"
                placeholder="New tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="form-input create-post__quick-tag-input"
                disabled={loading || tagCreating}
              />

              <label htmlFor="create-tag-cat-select" className="sr-only">New tag category</label>
              <select
                id="create-tag-cat-select"
                value={newTagCategory}
                onChange={(e) => setNewTagCategory(e.target.value)}
                className="form-input create-post__quick-tag-select"
                disabled={loading || tagCreating}
              >
                <option value="general">General</option>
                <option value="character">Character</option>
                <option value="copyright">Copyright</option>
                <option value="artist">Artist</option>
                <option value="meta">Meta</option>
              </select>

              <button
                type="button"
                className="btn-secondary create-post__quick-tag-btn"
                onClick={handleQuickCreateTag}
                disabled={loading || tagCreating || !newTagName.trim()}
                aria-label="Quickly create and select this tag"
              >
                <IconPlus size={14} aria-hidden={true} />
                <span>{tagCreating ? 'Adding...' : 'Quick Add Tag'}</span>
              </button>
            </div>
          </div>

          {/* Media Gallery Uploads */}
          <div className="form-group create-post__group--spaced">
            <label htmlFor="create-media-dropzone-input" className="form-label">
              <span className="create-post__title-icon">
                <IconImage size={20} aria-hidden={true} />
                <span>Artwork & Media Gallery</span>
              </span>
              <span className="form-label__hint">Illustrations, comics, animations</span>
            </label>
            
            <div className="dropzone">
              <input
                id="create-media-dropzone-input"
                type="file"
                multiple
                accept="image/*,video/*"
                className="dropzone__input"
                onChange={(e) => handleAddMedia(e.target.files)}
                disabled={loading}
                aria-label="Upload artwork images or videos to gallery"
              />
              <div className="dropzone__icon" aria-hidden="true">
                <IconImage size={40} />
              </div>
              <div className="dropzone__text">Click or drop multiple images & videos here</div>
              <div className="dropzone__subtext">Select multiple files at once — Order is maintained (Max 250MB/file)</div>
            </div>

            {mediaItems.length > 0 && (
              <div className="file-preview-list">
                {mediaItems.map((item, idx) => (
                  <div key={idx} className="file-preview-item motion-arrive-row">
                    {item.file.type.startsWith('video') ? (
                      <div className="file-preview-item__thumb create-post__thumb--video" aria-hidden="true">
                        <IconFilm size={24} />
                      </div>
                    ) : (
                      <img src={item.preview} alt="" aria-hidden="true" className="file-preview-item__thumb" decoding="async" />
                    )}
                    <div className="file-preview-item__info">
                      <div className="file-preview-item__name">#{idx + 1} — {item.file.name}</div>
                      <div className="file-preview-item__size">{Math.round(item.file.size / 1024)} KB</div>
                      <label htmlFor={`media-caption-${idx}`} className="sr-only">Caption for image {idx + 1}</label>
                      <input
                        id={`media-caption-${idx}`}
                        type="text"
                        placeholder="Optional image caption..."
                        value={item.caption}
                        onChange={(e) => {
                          const next = [...mediaItems];
                          next[idx].caption = e.target.value;
                          setMediaItems(next);
                        }}
                        className="form-input create-post__caption-input"
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-danger create-post__delete-btn"
                      onClick={() => removeMedia(idx)}
                      disabled={loading}
                      aria-label={`Remove image ${item.file.name}`}
                    >
                      <IconTrash size={16} aria-hidden={true} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments / Archives Uploads */}
          <div className="form-group create-post__group--attachments">
            <label htmlFor="create-attachment-dropzone-input" className="form-label">
              <span className="create-post__title-icon">
                <IconPackage size={20} aria-hidden={true} />
                <span>Downloadable Attachments</span>
              </span>
              <span className="form-label__hint">ZIPs, PSDs, brush sets, PDFs</span>
            </label>

            <div className="dropzone create-post__dropzone--attachments">
              <input
                id="create-attachment-dropzone-input"
                type="file"
                multiple
                className="dropzone__input"
                onChange={(e) => handleAddAttachments(e.target.files)}
                disabled={loading}
                aria-label="Upload archive attachments such as ZIP or PSD files"
              />
              <div className="dropzone__icon" aria-hidden="true">
                <IconPackage size={42} />
              </div>
              <div className="dropzone__text">Click or drop zip files, PSDs, or extras here</div>
              <div className="dropzone__subtext">Support for large archives and brushes (Max 1GB/file)</div>
            </div>

            {attachmentItems.length > 0 && (
              <div className="file-preview-list">
                {attachmentItems.map((item, idx) => (
                  <div key={idx} className="file-preview-item motion-arrive-row">
                    <div className="file-preview-item__thumb create-post__thumb--archive" aria-hidden="true">
                      <IconPackage size={26} />
                    </div>
                    <div className="file-preview-item__info">
                      <div className="file-preview-item__name">
                        <label htmlFor={`attachment-name-${idx}`} className="sr-only">Display filename for attachment {idx + 1}</label>
                        <input
                          id={`attachment-name-${idx}`}
                          type="text"
                          value={item.displayName}
                          onChange={(e) => {
                            const next = [...attachmentItems];
                            next[idx].displayName = e.target.value;
                            setAttachmentItems(next);
                          }}
                          placeholder="Display filename (e.g. High-Res Lineart.zip)"
                          className="form-input create-post__attachment-name-input"
                          disabled={loading}
                        />
                      </div>
                      <div className="file-preview-item__size">{Math.round(item.file.size / (1024 * 1024) * 100) / 100} MB</div>
                    </div>
                    <button
                      type="button"
                      className="btn-danger create-post__delete-btn"
                      onClick={() => removeAttachment(idx)}
                      disabled={loading}
                      aria-label={`Remove attachment ${item.file.name}`}
                    >
                      <IconTrash size={16} aria-hidden={true} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="progress-box" role="status" aria-live="polite">
              <div className="progress-box__title create-post__title-icon">
                <IconBolt size={20} aria-hidden={true} />
                <span>{statusText || 'Uploading in progress...'}</span>
              </div>
              <div
                className="progress-bar"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          <div className="create-post__form-actions">
            <Link
              to={initialArtistSlug ? `/artist/${initialArtistSlug}` : '/'}
              className="btn-secondary create-post__action-btn"
              aria-disabled={loading}
            >
              <span>Cancel</span>
            </Link>
            <button
              type="submit"
              className="btn-primary create-post__action-btn"
              disabled={loading || artists.length === 0}
            >
              <IconCheck size={16} aria-hidden={true} />
              <span>{loading ? `Uploading (${progressPercent}%)...` : 'Publish & Upload Post'}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
