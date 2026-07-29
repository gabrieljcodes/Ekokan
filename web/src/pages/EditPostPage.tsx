import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Post, Tag, PostMedia, PostAttachment } from '../types/models';

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

  useEffect(() => {
    if (!postId) return;
    setLoading(true);

    // Fetch Post and Tags
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
      alert(err.message || 'Failed to create tag');
    } finally {
      setTagCreating(false);
    }
  };

  // New Media Handlers
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
    URL.revokeObjectURL(next[index].preview);
    next.splice(index, 1);
    setNewMediaItems(next);
  };

  const handleDeleteExistingMedia = async (mediaId: string) => {
    if (!postId || !window.confirm('Are you sure you want to delete this media file from the post?')) return;
    try {
      await api.removeMedia(postId, mediaId);
      setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete media');
    }
  };

  // New Attachment Handlers
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

  const handleDeleteExistingAttachment = async (attId: string) => {
    if (!postId || !window.confirm('Are you sure you want to delete this attachment from the post?')) return;
    try {
      await api.removeAttachment(postId, attId);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete attachment');
    }
  };

  const handleDeletePost = async () => {
    if (!postId || !window.confirm('WARNING: Are you sure you want to permanently delete this entire post and all associated files?')) return;
    setSaving(true);
    try {
      await api.deletePost(postId);
      navigate(artistSlug ? `/artist/${artistSlug}` : '/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
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

      // Upload newly added artwork
      for (let i = 0; i < newMediaItems.length; i++) {
        const item = newMediaItems[i];
        setStatusText(`Uploading new artwork ${i + 1} of ${newMediaItems.length}: ${item.file.name}...`);
        await api.uploadMedia(postId, item.file, item.caption.trim());
        completedFiles++;
        setProgressPercent(15 + Math.round((completedFiles / Math.max(1, totalNewFiles)) * 80));
      }

      // Upload newly added attachments
      for (let i = 0; i < newAttachmentItems.length; i++) {
        const item = newAttachmentItems[i];
        setStatusText(`Uploading new archive ${i + 1} of ${newAttachmentItems.length}: ${item.file.name}...`);
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
    return <div className="app-container"><div className="loading-spinner">Loading post data...</div></div>;
  }

  if (!post) {
    return <div className="app-container"><div className="error-message">Post not found.</div></div>;
  }

  return (
    <div className="app-container">
      <div className="breadcrumb">
        <Link to="/">Gallery</Link> &nbsp;/&nbsp;
        {artistSlug && <><Link to={`/artist/${artistSlug}`}>Artist</Link> &nbsp;/&nbsp;</>}
        <Link to={`/artist/${artistSlug}/post/${post.id}`}>{post.title}</Link> &nbsp;/&nbsp;
        <span>Edit Post</span>
      </div>

      <div className="form-card" style={{ maxWidth: '850px' }}>
        <div className="form-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="form-card__title">✏️ Edit Post</h2>
            <p className="form-card__subtitle">Modify post details, assign tags, or manage uploaded media and attachments.</p>
          </div>
          <button
            type="button"
            onClick={handleDeletePost}
            className="btn-danger"
            style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            disabled={saving}
          >
            🗑️ Delete Post
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-card__body">
          {error && <div className="error-message" style={{ marginBottom: '1rem', padding: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid #f87171', color: '#fca5a5', borderRadius: 'var(--radius-sm)' }}>{error}</div>}

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
              className="form-input"
              style={{ minHeight: '130px', resize: 'vertical', fontFamily: 'inherit' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={saving}
              placeholder="Add details, notes, or links..."
            />
          </div>

          {/* Published At Date / Time */}
          <div className="form-group">
            <label htmlFor="edit-published-at" className="form-label">
              Published Date & Time
            </label>
            <input
              id="edit-published-at"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              disabled={saving}
              style={{ colorScheme: 'dark', width: '100%' }}
            />
            <span className="form-helper">
              Change the historical publication date of this post.
            </span>
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: 'var(--space-lg) 0' }} />

          {/* Tags Section */}
          <div className="form-group">
            <label>Tags</label>
            <p className="text-muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: '8px' }}>
              Click tags to attach or detach them from this post.
            </p>
            <div className="tag-picker">
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`tag-picker__badge tag-picker__badge--${tag.category} ${isSelected ? 'tag-picker__badge--selected' : ''}`}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-color)',
                      margin: '3px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      fontWeight: isSelected ? 600 : 400
                    }}
                  >
                    {tag.name} {isSelected && '✓'}
                  </button>
                );
              })}
              {availableTags.length === 0 && <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>No tags available. Create one below!</span>}
            </div>

            {/* Quick tag creation */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <input
                type="text"
                placeholder="New tag name..."
                className="form-input"
                style={{ flex: 1, margin: 0, padding: '6px 12px' }}
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                disabled={saving || tagCreating}
              />
              <select
                className="form-input"
                style={{ width: '130px', margin: 0, padding: '6px 10px' }}
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
                className="btn-secondary"
                style={{ padding: '6px 14px', whiteSpace: 'nowrap' }}
                disabled={saving || tagCreating || !newTagName.trim()}
              >
                {tagCreating ? '...' : '+ Create Tag'}
              </button>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: 'var(--space-lg) 0' }} />

          {/* Existing & New Media Section */}
          <div className="form-group">
            <label>Manage Artwork / Media</label>
            {existingMedia.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Existing Artwork ({existingMedia.length}):</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {existingMedia.map((m) => (
                    <div key={m.id} style={{ position: 'relative', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-elevated)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.file?.mime_type?.startsWith('video/') ? (
                        <video src={m.file?.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={m.file?.url} alt={m.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingMedia(m.id)}
                        style={{ position: 'absolute', top: '6px', right: '6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                        title="Remove artwork"
                      >
                        ×
                      </button>
                      {m.caption && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', fontSize: '11px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {m.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Add More Artwork / Media:</span>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => { handleAddNewMedia(e.target.files); e.target.value = ''; }}
              disabled={saving}
              className="form-input"
              style={{ padding: '8px', background: 'var(--bg-primary)' }}
            />
            {newMediaItems.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {newMediaItems.map((item, idx) => (
                  <div key={idx} style={{ position: 'relative', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-elevated)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ aspectRatio: '1', position: 'relative', overflow: 'hidden', borderRadius: '4px' }}>
                      {item.file.type.startsWith('video/') ? (
                        <video src={item.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={item.preview} alt={item.file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewMedia(idx)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer' }}
                      >
                        ×
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Caption..."
                      value={item.caption}
                      onChange={(e) => {
                        const next = [...newMediaItems];
                        next[idx].caption = e.target.value;
                        setNewMediaItems(next);
                      }}
                      disabled={saving}
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: '12px', margin: 0 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: 'var(--space-lg) 0' }} />

          {/* Existing & New Attachments Section */}
          <div className="form-group">
            <label>Manage Downloadable Attachments</label>
            {existingAttachments.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Existing Attachments ({existingAttachments.length}):</span>
                <ul className="attachment-list">
                  {existingAttachments.map((a) => (
                    <li key={a.id} className="attachment-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="attachment-item__icon">📦 </span>
                        <span className="attachment-item__name" style={{ fontWeight: 500 }}>{a.display_name || a.file?.original_name}</span>
                        <span className="attachment-item__size" style={{ marginLeft: '8px' }}>({a.file ? Math.round(a.file.file_size / 1024) : 0} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingAttachment(a.id)}
                        style={{ background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Add More Attachments:</span>
            <input
              type="file"
              multiple
              onChange={(e) => { handleAddNewAttachments(e.target.files); e.target.value = ''; }}
              disabled={saving}
              className="form-input"
              style={{ padding: '8px', background: 'var(--bg-primary)' }}
            />
            {newAttachmentItems.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px' }}>
                {newAttachmentItems.map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '4px', border: '1px solid var(--border-color)' }}>
                    <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {item.file.name} ({Math.round(item.file.size / 1024)} KB)</span>
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={item.displayName}
                      onChange={(e) => {
                        const next = [...newAttachmentItems];
                        next[idx].displayName = e.target.value;
                        setNewAttachmentItems(next);
                      }}
                      disabled={saving}
                      className="form-input"
                      style={{ width: '180px', padding: '4px 8px', fontSize: '12px', margin: 0 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeNewAttachment(idx)}
                      style={{ color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {saving && (
            <div style={{ marginTop: '20px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--fs-sm)', color: 'var(--accent)' }}>
                <span>{statusText}</span>
                <span>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', background: 'var(--bg-elevated)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, background: 'var(--accent)', height: '100%', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ padding: '10px 24px', fontWeight: 600 }}
            >
              {saving ? 'Saving Changes...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
