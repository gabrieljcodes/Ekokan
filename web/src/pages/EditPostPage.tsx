import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Post, Tag, PostMedia, PostAttachment } from '../types/models';
import {
  IconEdit,
  IconTrash,
  IconWarning,
  IconRefresh,
  IconCheck,
  IconPlus,
  IconX,
  IconArrowLeft,
  IconFilm,
  IconPackage,
  IconFileText,
  IconSave
} from '../components/Icons';

interface NewMediaItem {
  file: File;
  caption: string;
  preview: string;
}

interface NewAttachmentItem {
  file: File;
  displayName: string;
}

export default function EditPostPage() {
  const navigate = useNavigate();
  const { slug: urlArtistSlug, postId } = useParams<{ slug?: string; postId: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [artistSlug, setArtistSlug] = useState<string>(urlArtistSlug || '');

  const toDatetimeLocal = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const offsetMs = date.getTimezoneOffset() * 60 * 1000;
      const local = new Date(date.getTime() - offsetMs);
      return local.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  // Tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('general');
  const [tagCreating, setTagCreating] = useState(false);

  // Existing Media / Attachments
  const [existingMedia, setExistingMedia] = useState<PostMedia[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<PostAttachment[]>([]);

  // Newly added Files
  const [newMediaItems, setNewMediaItems] = useState<NewMediaItem[]>([]);
  const [newAttachmentItems, setNewAttachmentItems] = useState<NewAttachmentItem[]>([]);

  // Submission / Loading State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Declarative Modals & Alert state
  const [showDeletePostModal, setShowDeletePostModal] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const newMediaItemsRef = useRef<NewMediaItem[]>([]);
  newMediaItemsRef.current = newMediaItems;

  // Cleanup Blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      newMediaItemsRef.current.forEach((item) => {
        if (item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, []);

  // Keyboard accessibility for modals
  const closeModal = useCallback(() => {
    setShowDeletePostModal(false);
    setMediaToDelete(null);
    setAttachmentToDelete(null);
    setAlertMessage(null);
  }, []);

  useEffect(() => {
    const isAnyModalOpen = showDeletePostModal || mediaToDelete !== null || attachmentToDelete !== null || alertMessage !== null;
    if (!isAnyModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeletePostModal, mediaToDelete, attachmentToDelete, alertMessage, closeModal]);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    Promise.all([
      api.getPost(postId),
      api.listTags()
    ]).then(([fetchedPost, tagsRes]) => {
      setPost(fetchedPost);
      setTitle(fetchedPost.title || '');
      setContent(fetchedPost.content || '');
      setPublishedAt(toDatetimeLocal(fetchedPost.published_at));
      setSelectedTagIds(fetchedPost.tags ? fetchedPost.tags.map((t) => t.id) : []);
      setExistingMedia(fetchedPost.media || []);
      setExistingAttachments(fetchedPost.attachments || []);
      setAvailableTags(tagsRes);

      if (fetchedPost.artist && !artistSlug) {
        setArtistSlug(fetchedPost.artist.slug);
      } else if (!artistSlug && urlArtistSlug) {
        setArtistSlug(urlArtistSlug);
      }
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load post details.');
      setLoading(false);
    });
  }, [postId, urlArtistSlug]);

  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id)) {
      setSelectedTagIds(selectedTagIds.filter((t) => t !== id));
    } else {
      setSelectedTagIds([...selectedTagIds, id]);
    }
  };

  const handleQuickCreateTag = async () => {
    if (!newTagName.trim()) return;
    setTagCreating(true);
    try {
      const created = await api.createTag({
        name: newTagName.trim(),
        category: newTagCategory
      });
      setAvailableTags([...availableTags, created]);
      setSelectedTagIds([...selectedTagIds, created.id]);
      setNewTagName('');
    } catch (err: any) {
      setAlertMessage(err.message || 'Failed to create tag');
    } finally {
      setTagCreating(false);
    }
  };

  const handleAddNewMedia = (files: FileList | null) => {
    if (!files) return;
    const items: NewMediaItem[] = Array.from(files).map((file) => ({
      file,
      caption: '',
      preview: URL.createObjectURL(file)
    }));
    setNewMediaItems((prev) => [...prev, ...items]);
  };

  const removeNewMedia = (index: number) => {
    const next = [...newMediaItems];
    if (next[index]?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(next[index].preview);
    }
    next.splice(index, 1);
    setNewMediaItems(next);
  };

  const confirmDeleteExistingMedia = async () => {
    if (!postId || !mediaToDelete) return;
    try {
      await api.removeMedia(postId, mediaToDelete);
      setExistingMedia((prev) => prev.filter((m) => m.id !== mediaToDelete));
      setMediaToDelete(null);
    } catch (err: any) {
      setMediaToDelete(null);
      setAlertMessage(err.message || 'Failed to delete media');
    }
  };

  const handleAddNewAttachments = (files: FileList | null) => {
    if (!files) return;
    const items: NewAttachmentItem[] = Array.from(files).map((file) => ({
      file,
      displayName: file.name
    }));
    setNewAttachmentItems((prev) => [...prev, ...items]);
  };

  const removeNewAttachment = (index: number) => {
    setNewAttachmentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmDeleteExistingAttachment = async () => {
    if (!postId || !attachmentToDelete) return;
    try {
      await api.removeAttachment(postId, attachmentToDelete);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentToDelete));
      setAttachmentToDelete(null);
    } catch (err: any) {
      setAttachmentToDelete(null);
      setAlertMessage(err.message || 'Failed to delete attachment');
    }
  };

  const executeDeletePost = async () => {
    if (!postId) return;
    setSaving(true);
    try {
      await api.deletePost(postId);
      setShowDeletePostModal(false);
      navigate(artistSlug ? `/artist/${artistSlug}` : '/');
    } catch (err: any) {
      setShowDeletePostModal(false);
      setAlertMessage(err.message || 'Failed to delete post');
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postId || !post) return;
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    try {
      setStatusText('Updating post details and tags...');
      setProgressPercent(15);

      await api.updatePost(postId, {
        title: title.trim(),
        content: content.trim() || '',
        tag_ids: selectedTagIds,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : undefined,
      });

      const totalNewFiles = newMediaItems.length + newAttachmentItems.length;
      let completedFiles = 0;

      for (let i = 0; i < newMediaItems.length; i++) {
        const item = newMediaItems[i];
        setStatusText(`Uploading artwork ${i + 1} of ${newMediaItems.length}: ${item.file.name}...`);
        await api.uploadMedia(postId, item.file, item.caption.trim());
        completedFiles++;
        setProgressPercent(15 + Math.round((completedFiles / Math.max(1, totalNewFiles)) * 80));
      }

      for (let i = 0; i < newAttachmentItems.length; i++) {
        const item = newAttachmentItems[i];
        setStatusText(`Uploading archive ${i + 1} of ${newAttachmentItems.length}: ${item.file.name}...`);
        await api.uploadAttachment(postId, item.file, item.displayName.trim());
        completedFiles++;
        setProgressPercent(15 + Math.round((completedFiles / Math.max(1, totalNewFiles)) * 80));
      }

      setStatusText('Update successful! Redirecting...');
      setProgressPercent(100);
      const targetSlug = artistSlug || (post.artist?.slug) || 'gallery';
      navigate(`/artist/${targetSlug}/post/${postId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error updating post');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading" role="status" aria-live="polite">
          <IconRefresh className="admin-icon--spinning" />
          <span>Loading post data...</span>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="app-container">
        <div className="empty-state">
          <IconWarning size={32} />
          <h3>Post not found</h3>
          <p>The post you are trying to edit does not exist or has been deleted.</p>
          <Link to="/" className="btn-secondary">
            <IconArrowLeft />
            <span>Return to Gallery</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Gallery</Link>
        <span className="breadcrumb-separator" aria-hidden="true">/</span>
        {artistSlug && (
          <>
            <Link to={`/artist/${artistSlug}`}>Artist</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
          </>
        )}
        <Link to={`/artist/${artistSlug}/post/${post.id}`}>{post.title}</Link>
        <span className="breadcrumb-separator" aria-hidden="true">/</span>
        <span aria-current="page">Edit Post</span>
      </nav>

      <div className="form-card edit-post-card motion-arrive-card">
        <div className="form-card__header edit-post__header">
          <div className="edit-post__header-text">
            <h2 className="form-card__title">
              <IconEdit size={22} />
              <span>Edit Post</span>
            </h2>
            <p className="form-card__subtitle">Modify post details, assign tags, or manage uploaded artwork and attachments.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeletePostModal(true)}
            className="btn-danger edit-post__delete-btn"
            disabled={saving}
          >
            <IconTrash size={16} />
            <span>Delete Post</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-card__body">
          {error && (
            <div className="form-error" role="alert">
              <IconWarning size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="edit-title">Post Title *</label>
            <input
              id="edit-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-content">Content / Description</label>
            <textarea
              id="edit-content"
              className="form-input form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={saving}
              placeholder="Add details, notes, or links..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-published-at" className="form-label">
              Published Date & Time
            </label>
            <input
              id="edit-published-at"
              type="datetime-local"
              className="form-input"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={saving}
            />
            <span className="form-helper">
              Change the historical publication timestamp of this post.
            </span>
          </div>

          <hr className="edit-post__divider" />

          {/* Tags Section */}
          <div className="form-group">
            <label id="tags-group-label">Tags</label>
            <span className="edit-post__section-desc">
              Click tags to attach or detach them from this post.
            </span>
            <div className="edit-post__tag-picker" role="region" aria-labelledby="tags-group-label">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={isSelected}
                    className={`edit-post__tag-badge tag-picker__badge--${tag.category} ${isSelected ? 'edit-post__tag-badge--selected' : ''}`}
                  >
                    <span>{tag.name}</span>
                    {isSelected && (
                      <span className="edit-post__tag-check-animate">
                        <IconCheck size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
              {availableTags.length === 0 && (
                <span className="text-muted">No tags available. Create one below!</span>
              )}
            </div>

            {/* Quick tag creation */}
            <div className="edit-post__tag-create-box">
              <input
                type="text"
                placeholder="New tag name..."
                className="form-input edit-post__tag-input"
                aria-label="New tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                disabled={saving || tagCreating}
              />
              <select
                className="form-input edit-post__tag-select"
                aria-label="New tag category"
                value={newTagCategory}
                onChange={(e) => setNewTagCategory(e.target.value)}
                disabled={saving || tagCreating}
              >
                <option value="general">General</option>
                <option value="character">Character</option>
                <option value="copyright">Copyright</option>
                <option value="artist">Artist</option>
                <option value="meta">Meta</option>
              </select>
              <button
                type="button"
                onClick={handleQuickCreateTag}
                className="btn-secondary edit-post__tag-create-btn"
                disabled={saving || tagCreating || !newTagName.trim()}
              >
                {tagCreating ? <IconRefresh className="admin-icon--spinning" size={16} /> : <IconPlus size={16} />}
                <span>{tagCreating ? 'Creating...' : 'Create Tag'}</span>
              </button>
            </div>
          </div>

          <hr className="edit-post__divider" />

          {/* Manage Media Section */}
          <div className="form-group">
            <label id="artwork-group-label">Manage Artwork / Media</label>
            {existingMedia.length > 0 && (
              <div className="motion-arrive-row">
                <span className="edit-post__section-desc">Existing Artwork ({existingMedia.length}):</span>
                <div className="edit-post__media-grid" role="region" aria-labelledby="artwork-group-label">
                  {existingMedia.map((m) => (
                    <div key={m.id} className="edit-post__media-card">
                      {m.file?.mime_type?.startsWith('video/') ? (
                        <div className="edit-post__media-thumb-wrap">
                          <img
                            src={m.file?.thumbnail_url || m.file?.url}
                            alt="Video Thumbnail"
                            className="edit-post__media-thumb"
                            onError={(e) => { if (m.file?.url && e.currentTarget.src !== m.file.url) e.currentTarget.src = m.file.url; }}
                          />
                          <span className="edit-post__video-badge">
                            <IconFilm size={12} />
                            <span>Video</span>
                          </span>
                        </div>
                      ) : (
                        <img
                          src={m.file?.thumbnail_url || m.file?.url}
                          alt={m.caption || 'Artwork file'}
                          className="edit-post__media-thumb"
                          onError={(e) => { if (m.file?.url && e.currentTarget.src !== m.file.url) e.currentTarget.src = m.file.url; }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setMediaToDelete(m.id)}
                        className="edit-post__remove-media-btn"
                        aria-label={`Remove existing artwork ${m.caption || m.file?.original_name || ''}`}
                        title="Remove artwork"
                      >
                        <IconX size={18} />
                      </button>
                      {m.caption && (
                        <div className="edit-post__media-caption-bar">
                          {m.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label htmlFor="upload-more-artwork" className="edit-post__section-desc">Add More Artwork / Media:</label>
            <input
              id="upload-more-artwork"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => { handleAddNewMedia(e.target.files); e.target.value = ''; }}
              disabled={saving}
              className="form-input edit-post__file-upload"
            />
            {newMediaItems.length > 0 && (
              <div className="edit-post__media-grid motion-arrive-row">
                {newMediaItems.map((item, idx) => (
                  <div key={idx} className="edit-post__media-card edit-post__media-card--new">
                    <div className="edit-post__media-thumb-wrap">
                      {item.file.type.startsWith('video/') ? (
                        <video src={item.preview} className="edit-post__media-thumb" />
                      ) : (
                        <img src={item.preview} alt={item.file.name} className="edit-post__media-thumb" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewMedia(idx)}
                        className="edit-post__remove-media-btn"
                        aria-label={`Remove new file ${item.file.name}`}
                      >
                        <IconX size={18} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Caption..."
                      aria-label={`Caption for new artwork ${item.file.name}`}
                      value={item.caption}
                      onChange={(e) => {
                        const next = [...newMediaItems];
                        next[idx].caption = e.target.value;
                        setNewMediaItems(next);
                      }}
                      disabled={saving}
                      className="form-input edit-post__media-caption-input"
                    />
                  </div>
                ))}
              </div>
            )}
            {existingMedia.length === 0 && newMediaItems.length === 0 && (
              <p className="form-helper">
                No artwork currently assigned. Upload high-resolution illustrations or videos above.
              </p>
            )}
          </div>

          <hr className="edit-post__divider" />

          {/* Manage Attachments Section */}
          <div className="form-group">
            <label id="attachments-group-label">Manage Downloadable Attachments</label>
            {existingAttachments.length > 0 && (
              <div className="motion-arrive-row">
                <span className="edit-post__section-desc">Existing Attachments ({existingAttachments.length}):</span>
                <div role="region" aria-labelledby="attachments-group-label">
                  {existingAttachments.map((a) => (
                    <div key={a.id} className="edit-post__attachment-row">
                      <div className="edit-post__attachment-info">
                        <IconPackage size={18} />
                        <span>{a.display_name || a.file?.original_name}</span>
                        <span className="edit-post__attachment-size">({a.file ? Math.round(a.file.file_size / 1024) : 0} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachmentToDelete(a.id)}
                        className="edit-post__attachment-remove-btn"
                        aria-label={`Remove attachment ${a.display_name || a.file?.original_name}`}
                      >
                        <IconTrash size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label htmlFor="upload-more-attachments" className="edit-post__section-desc">Add More Attachments:</label>
            <input
              id="upload-more-attachments"
              type="file"
              multiple
              onChange={(e) => { handleAddNewAttachments(e.target.files); e.target.value = ''; }}
              disabled={saving}
              className="form-input edit-post__file-upload"
            />
            {newAttachmentItems.length > 0 && (
              <div className="motion-arrive-row">
                {newAttachmentItems.map((item, idx) => (
                  <div key={idx} className="edit-post__attachment-row">
                    <div className="edit-post__attachment-info">
                      <IconFileText size={18} />
                      <span>{item.file.name}</span>
                      <span className="edit-post__attachment-size">({Math.round(item.file.size / 1024)} KB)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Display Name"
                      aria-label={`Display name for archive ${item.file.name}`}
                      value={item.displayName}
                      onChange={(e) => {
                        const next = [...newAttachmentItems];
                        next[idx].displayName = e.target.value;
                        setNewAttachmentItems(next);
                      }}
                      disabled={saving}
                      className="form-input edit-post__attachment-name-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewAttachment(idx)}
                      className="edit-post__attachment-remove-btn"
                      aria-label={`Remove new archive ${item.file.name}`}
                    >
                      <IconX size={16} />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {existingAttachments.length === 0 && newAttachmentItems.length === 0 && (
              <p className="form-helper">
                No archive bundles attached. Upload ZIP or PDF packages above for visitor downloading.
              </p>
            )}
          </div>

          {saving && (
            <div
              className="progress-card motion-arrive-card"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="progress-card__header">
                <span>{statusText}</span>
                <span>{progressPercent}%</span>
              </div>
              <div
                className="progress-bar"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="progress-bar__fill edit-post__progress-fill--animate" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          <div className="edit-post__form-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary edit-post__action-btn"
              disabled={saving}
            >
              <IconArrowLeft size={16} />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="btn-primary edit-post__action-btn"
              disabled={saving}
            >
              {saving ? (
                <>
                  <IconRefresh className="admin-icon--spinning" size={18} />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <IconSave size={18} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Declarative Confirmation Dialog for Delete Post */}
      {showDeletePostModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-delete-title">
          <div className="modal-card motion-arrive-card">
            <div className="modal-card__header">
              <IconWarning size={28} />
              <h3 id="modal-delete-title" className="modal-card__title">Permanent Deletion</h3>
            </div>
            <p className="modal-card__text">
              Are you completely certain you wish to permanently erase this entire post along with all uploaded artwork and archive attachments? This action cannot be reverted.
            </p>
            <div className="modal-card__actions">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary modal-card__btn"
                disabled={saving}
              >
                Keep Post
              </button>
              <button
                type="button"
                onClick={executeDeletePost}
                className="btn-danger modal-card__btn"
                disabled={saving}
              >
                <IconTrash size={16} />
                <span>Yes, Delete Post</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Declarative Confirmation Dialog for Existing Media Deletion */}
      {mediaToDelete && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-media-delete-title">
          <div className="modal-card motion-arrive-card">
            <div className="modal-card__header">
              <IconWarning size={28} />
              <h3 id="modal-media-delete-title" className="modal-card__title">Delete Artwork</h3>
            </div>
            <p className="modal-card__text">
              Are you sure you want to detach and permanently delete this artwork file from the post?
            </p>
            <div className="modal-card__actions">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary modal-card__btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExistingMedia}
                className="btn-danger modal-card__btn"
              >
                <IconTrash size={16} />
                <span>Delete Artwork</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Declarative Confirmation Dialog for Existing Attachment Deletion */}
      {attachmentToDelete && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-att-delete-title">
          <div className="modal-card motion-arrive-card">
            <div className="modal-card__header">
              <IconWarning size={28} />
              <h3 id="modal-att-delete-title" className="modal-card__title">Delete Attachment</h3>
            </div>
            <p className="modal-card__text">
              Are you sure you want to permanently delete this archive attachment from the post?
            </p>
            <div className="modal-card__actions">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary modal-card__btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExistingAttachment}
                className="btn-danger modal-card__btn"
              >
                <IconTrash size={16} />
                <span>Delete Attachment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Declarative Error/Info Alert Modal */}
      {alertMessage && (
        <div className="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="modal-alert-title">
          <div className="modal-card motion-arrive-card">
            <div className="modal-card__header">
              <IconWarning size={28} />
              <h3 id="modal-alert-title" className="modal-card__title">Notice</h3>
            </div>
            <p className="modal-card__text">
              {alertMessage}
            </p>
            <div className="modal-card__actions">
              <button
                type="button"
                onClick={closeModal}
                className="btn-primary modal-card__btn"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
