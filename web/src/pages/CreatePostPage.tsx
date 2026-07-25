import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Artist, Tag } from '../types/models';

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

  // Tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('general');
  const [tagCreating, setTagCreating] = useState(false);

  // Files
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [attachmentItems, setAttachmentItems] = useState<AttachmentItem[]>([]);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listArtists(1, 200).then((res) => {
      setArtists(res.data);
      if (initialArtistSlug) {
        const found = res.data.find((a) => a.slug === initialArtistSlug);
        if (found) setSelectedArtistId(found.id);
      } else if (res.data.length > 0 && !selectedArtistId) {
        setSelectedArtistId(res.data[0].id);
      }
    }).catch(console.error);

    api.listTags().then(setTags).catch(console.error);
  }, [initialArtistSlug]);

  const handleTitleChange = (val: string) => {
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
  };

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
      setTags([...tags, created]);
      setSelectedTagIds([...selectedTagIds, created.id]);
      setNewTagName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create tag');
    } finally {
      setTagCreating(false);
    }
  };

  const handleAddMedia = (files: FileList | null) => {
    if (!files) return;
    const newItems: MediaItem[] = Array.from(files).map((file) => ({
      file,
      caption: '',
      preview: URL.createObjectURL(file)
    }));
    setMediaItems((prev) => [...prev, ...newItems]);
  };

  const removeMedia = (index: number) => {
    const next = [...mediaItems];
    URL.revokeObjectURL(next[index].preview);
    next.splice(index, 1);
    setMediaItems(next);
  };

  const handleAddAttachments = (files: FileList | null) => {
    if (!files) return;
    const newItems: AttachmentItem[] = Array.from(files).map((file) => ({
      file,
      displayName: file.name
    }));
    setAttachmentItems((prev) => [...prev, ...newItems]);
  };

  const removeAttachment = (index: number) => {
    setAttachmentItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      setStatusText('Creating post metadata...');
      setProgressPercent(10);

      const createdPost = await api.createPost({
        artist_id: selectedArtistId,
        title: title.trim(),
        slug: slug.trim(),
        content: content.trim() || undefined,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined
      });

      const totalFiles = mediaItems.length + attachmentItems.length;
      let finishedFiles = 0;

      // Upload media items
      for (let i = 0; i < mediaItems.length; i++) {
        const item = mediaItems[i];
        setStatusText(`Uploading artwork ${i + 1} of ${mediaItems.length}: ${item.file.name}...`);
        await api.uploadMedia(createdPost.id, item.file, item.caption.trim());
        finishedFiles++;
        setProgressPercent(10 + Math.round((finishedFiles / Math.max(1, totalFiles)) * 85));
      }

      // Upload attachment archives
      for (let i = 0; i < attachmentItems.length; i++) {
        const item = attachmentItems[i];
        setStatusText(`Uploading file ${i + 1} of ${attachmentItems.length}: ${item.file.name}...`);
        await api.uploadAttachment(createdPost.id, item.file, item.displayName.trim());
        finishedFiles++;
        setProgressPercent(10 + Math.round((finishedFiles / Math.max(1, totalFiles)) * 85));
      }

      setStatusText('Upload completed! Redirecting...');
      setProgressPercent(100);
      navigate(`/artist/${artist.slug}/post/${createdPost.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error creating post or uploading files');
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="breadcrumb">
        <Link to="/">Gallery</Link> &nbsp;/&nbsp; <span>Upload New Post</span>
      </div>

      <div className="form-card">
        <div className="form-card__header">
          <h1 className="form-card__title">📤 Upload New Art Post</h1>
          <p className="form-card__subtitle">
            Create an archive post with high-res illustrations, tags, and downloadable bonus files.
          </p>
        </div>

        {error && <div className="form-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Artist Selector */}
          <div className="form-group">
            <label className="form-label">
              Artist / Creator <span style={{ color: 'var(--danger)' }}>*</span>
              <Link to="/artists/new" style={{ fontWeight: 500, fontSize: 'var(--fs-xs)' }}>
                + Create New Artist
              </Link>
            </label>
            <select
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
            <label className="form-label">
              Post Title <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
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
            <label className="form-label">
              URL Slug <span style={{ color: 'var(--danger)' }}>*</span>
              <span className="form-label__hint">Auto-generated identifier</span>
            </label>
            <input
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
            <label className="form-label">
              Description & Commentary
              <span className="form-label__hint">Optional</span>
            </label>
            <textarea
              rows={5}
              placeholder="Artist remarks, translation, source links, or archiving commentary..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Tags Picker & Creator */}
          <div className="form-group">
            <label className="form-label">
              Tags & Categories
              <span className="form-label__hint">{selectedTagIds.length} selected</span>
            </label>
            <div className="tag-selector">
              {tags.length === 0 ? (
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>No tags created yet. Add one below!</span>
              ) : (
                tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <span
                      key={tag.id}
                      className={`tag-badge tag-badge--${tag.category || 'general'} tag-selector__pill ${
                        isSelected ? 'tag-selector__pill--selected' : ''
                      }`}
                      style={isSelected ? { opacity: 1, boxShadow: '0 0 0 2px var(--text-primary)' } : { opacity: 0.6 }}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {isSelected ? '✓ ' : '+ '}{tag.name}
                    </span>
                  );
                })
              )}
            </div>

            {/* Inline Quick Create Tag */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="New tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                style={{ width: '200px', fontSize: 'var(--fs-xs)', padding: '6px 10px' }}
                disabled={loading || tagCreating}
              />
              <select
                value={newTagCategory}
                onChange={(e) => setNewTagCategory(e.target.value)}
                style={{ width: '130px', fontSize: 'var(--fs-xs)', padding: '6px 10px' }}
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
                className="btn-secondary"
                style={{ fontSize: 'var(--fs-xs)', padding: '6px 12px' }}
                onClick={handleQuickCreateTag}
                disabled={loading || tagCreating || !newTagName.trim()}
              >
                {tagCreating ? 'Adding...' : '+ Quick Add Tag'}
              </button>
            </div>
          </div>

          {/* Media Gallery Uploads */}
          <div className="form-group" style={{ marginTop: 'var(--space-xl)' }}>
            <label className="form-label">
              🖼️ Artwork / Media Gallery
              <span className="form-label__hint">Illustrations, comics, animations</span>
            </label>
            
            <div className="dropzone">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="dropzone__input"
                onChange={(e) => handleAddMedia(e.target.files)}
                disabled={loading}
              />
              <div className="dropzone__icon">📚</div>
              <div className="dropzone__text">Click or drop multiple images & videos here</div>
              <div className="dropzone__subtext">Select multiple files at once — Order is maintained</div>
            </div>

            {mediaItems.length > 0 && (
              <div className="file-preview-list">
                {mediaItems.map((item, idx) => (
                  <div key={idx} className="file-preview-item">
                    {item.file.type.startsWith('video') ? (
                      <div className="file-preview-item__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🎥
                      </div>
                    ) : (
                      <img src={item.preview} alt="" className="file-preview-item__thumb" />
                    )}
                    <div className="file-preview-item__info">
                      <div className="file-preview-item__name">#{idx + 1} — {item.file.name}</div>
                      <div className="file-preview-item__size">{Math.round(item.file.size / 1024)} KB</div>
                      <input
                        type="text"
                        placeholder="Optional image caption..."
                        value={item.caption}
                        onChange={(e) => {
                          const next = [...mediaItems];
                          next[idx].caption = e.target.value;
                          setMediaItems(next);
                        }}
                        style={{ marginTop: '4px', width: '100%', fontSize: 'var(--fs-xs)', padding: '4px 8px' }}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => removeMedia(idx)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments / Archives Uploads */}
          <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
            <label className="form-label">
              📦 Downloadable Attachments
              <span className="form-label__hint">ZIPs, PSDs, brush sets, PDFs</span>
            </label>

            <div className="dropzone" style={{ padding: 'var(--space-lg)' }}>
              <input
                type="file"
                multiple
                className="dropzone__input"
                onChange={(e) => handleAddAttachments(e.target.files)}
                disabled={loading}
              />
              <div className="dropzone__icon" style={{ fontSize: 'var(--fs-xl)' }}>📁</div>
              <div className="dropzone__text">Click or drop zip files, PSDs, or extras here</div>
            </div>

            {attachmentItems.length > 0 && (
              <div className="file-preview-list">
                {attachmentItems.map((item, idx) => (
                  <div key={idx} className="file-preview-item">
                    <div className="file-preview-item__thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                      📦
                    </div>
                    <div className="file-preview-item__info">
                      <div className="file-preview-item__name">
                        <input
                          type="text"
                          value={item.displayName}
                          onChange={(e) => {
                            const next = [...attachmentItems];
                            next[idx].displayName = e.target.value;
                            setAttachmentItems(next);
                          }}
                          placeholder="Display filename (e.g. High-Res Lineart.zip)"
                          style={{ width: '100%', fontSize: 'var(--fs-sm)' }}
                          disabled={loading}
                        />
                      </div>
                      <div className="file-preview-item__size">{Math.round(item.file.size / (1024 * 1024) * 100) / 100} MB</div>
                    </div>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => removeAttachment(idx)}
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="progress-box">
              <div className="progress-box__title">🚀 {statusText || 'Uploading...'}</div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
            <Link to={initialArtistSlug ? `/artist/${initialArtistSlug}` : '/'} className="btn-secondary" style={{ padding: 'var(--space-sm) var(--space-lg)' }}>
              Cancel
            </Link>
            <button type="submit" className="btn-primary" disabled={loading || artists.length === 0}>
              {loading ? `Uploading (${progressPercent}%)...` : '✓ Publish & Upload Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
