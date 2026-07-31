import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Post, Comment, AdjacentPosts } from '../types/models';
import MediaViewer from '../components/MediaViewer';
import TagList from '../components/TagList';
import AttachmentList from '../components/AttachmentList';
import CommentSection from '../components/CommentSection';
import { useAuth } from '../context/AuthContext';
import {
  IconHeart,
  IconHeartFilled,
  IconStar,
  IconStarFilled,
  IconEdit,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconWarning,
  IconArrowLeft,
  IconImage,
  IconFileText,
  IconUser,
} from '../components/Icons';

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Unknown date';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid timestamp';
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return 'Invalid timestamp';
  }
}

export default function PostPage() {
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const { user, isFavoritePost, toggleFavoritePost, isLikedPost, toggleLikePost } = useAuth();
  const favorited = post ? (isFavoritePost(post.id) || post.is_favorited) : false;
  const liked = post ? (isLikedPost(post.id) || post.is_liked) : false;
  const [adjacent, setAdjacent] = useState<AdjacentPosts>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'files'>('content');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const loadPost = useCallback(() => {
    if (!postId) return;
    setLoading(true);
    setAvatarError(false);
    Promise.all([
      api.getPost(postId),
      api.getAdjacentPosts(postId),
      api.listComments(postId),
    ])
      .then(([postData, adjData, commentsData]) => {
        setPost(postData);
        setAdjacent(adjData);
        setComments(commentsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(() => {
    loadPost();
    window.scrollTo(0, 0);
  }, [loadPost]);

  const reloadComments = useCallback(() => {
    if (!postId) return;
    api.listComments(postId).then(setComments).catch(console.error);
  }, [postId]);

  const handleLikeClick = useCallback(async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!post) return;
    try {
      const isNowLiked = await toggleLikePost(post.id);
      setPost(prev =>
        prev
          ? {
              ...prev,
              like_count: isNowLiked ? (prev.like_count || 0) + 1 : Math.max(0, (prev.like_count || 1) - 1),
              is_liked: isNowLiked,
            }
          : null
      );
    } catch (e) {
      console.error('Error toggling like:', e);
    }
  }, [user, post, toggleLikePost]);

  const handleFavoriteClick = useCallback(async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!post) return;
    try {
      await toggleFavoritePost(post.id);
    } catch (e) {
      console.error('Error toggling bookmark:', e);
    }
  }, [user, post, toggleFavoritePost]);

  if (loading) {
    return (
      <div className="app-container" role="status" aria-live="polite">
        <div className="empty-state">
          <IconRefresh className="admin-icon--spinning" size={24} />
          <p className="empty-state__text">Loading post artwork and details...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="app-container" role="alert" aria-live="assertive">
        <div className="empty-state">
          <IconWarning size={32} />
          <p className="empty-state__title">Post Not Found</p>
          <p className="empty-state__text">The requested artwork post does not exist or has been removed.</p>
          <Link to={`/artist/${slug || ''}`} className="btn-secondary post-empty-back">
            <IconArrowLeft size={16} />
            <span>Return to Artist Profile</span>
          </Link>
        </div>
      </div>
    );
  }

  const artist = post.artist;

  return (
    <div className="app-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb navigation">
        <Link to="/">Gallery</Link>
        <span className="breadcrumb-separator" aria-hidden="true">/</span>
        {artist && (
          <>
            <Link to={`/artist/${slug}`}>{artist.name}</Link>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page">{post.title}</span>
      </nav>

      {/* Adjacent Post Navigation */}
      <div className="post-nav" aria-label="Adjacent posts navigation">
        {adjacent.previous ? (
          <Link
            to={`/artist/${slug}/post/${adjacent.previous.id}`}
            className="post-nav__link"
            title={`Previous: ${adjacent.previous.title}`}
          >
            <IconChevronLeft size={16} />
            <span>Previous</span>
          </Link>
        ) : (
          <span className="post-nav__link--disabled" aria-disabled="true">
            <IconChevronLeft size={16} />
            <span>Previous</span>
          </span>
        )}
        {adjacent.next ? (
          <Link
            to={`/artist/${slug}/post/${adjacent.next.id}`}
            className="post-nav__link post-nav__link--next"
            title={`Next: ${adjacent.next.title}`}
          >
            <span>Next</span>
            <IconChevronRight size={16} />
          </Link>
        ) : (
          <span className="post-nav__link--disabled" aria-disabled="true">
            <span>Next</span>
            <IconChevronRight size={16} />
          </span>
        )}
      </div>

      {/* Post header */}
      <div className="post-header motion-arrive-card">
        {artist && (
          <Link to={`/artist/${slug}`} title={`View ${artist.name}'s profile`}>
            {artist.avatar_url && !avatarError ? (
              <img
                src={artist.avatar_url}
                alt={`${artist.name}'s profile avatar`}
                className="post-header__artist-avatar"
                loading="lazy"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="post-header__artist-avatar--placeholder" aria-label={artist.name}>
                {artist.name ? artist.name.charAt(0).toUpperCase() : <IconUser size={32} />}
              </div>
            )}
          </Link>
        )}
        <div className="post-header__info">
          <div className="post-header__title-row">
            <h1 className="post-header__title">{post.title}</h1>
            <div className="post-header__actions">
              <button
                type="button"
                onClick={handleLikeClick}
                aria-pressed={liked}
                aria-label={`Like post (${post.like_count || 0} total)`}
                className={`btn-secondary post-header__action-btn ${liked ? 'fav-btn--active' : ''}`}
              >
                {liked ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                <span>{post.like_count || 0}</span>
              </button>
              <button
                type="button"
                onClick={handleFavoriteClick}
                aria-pressed={favorited}
                aria-label={favorited ? 'Remove from bookmarked favorites' : 'Bookmark post to favorites'}
                className={`btn-secondary post-header__action-btn ${favorited ? 'fav-btn--active' : ''}`}
              >
                {favorited ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                <span>{favorited ? 'Bookmarked' : 'Bookmark'}</span>
              </button>
              <Link
                to={`/artist/${slug}/post/${post.id}/edit`}
                className="btn-secondary post-header__action-btn"
                title="Edit Post Details & Media"
              >
                <IconEdit size={16} />
                <span>Edit Post</span>
              </Link>
            </div>
          </div>
          <div className="post-header__date">
            <span>Published:</span>
            <time dateTime={post.published_at || undefined}>{formatDate(post.published_at)}</time>
          </div>
          {post.imported_at && (
            <div className="post-header__date">
              <span>Imported:</span>
              <time dateTime={post.imported_at}>{formatDate(post.imported_at)}</time>
            </div>
          )}
          {artist && (
            <Link to={`/artist/${slug}`} className="post-header__artist-name">
              <IconUser size={14} />
              <span>{artist.name}</span>
            </Link>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="post-header__tags-wrap">
              <TagList tags={post.tags} />
            </div>
          )}
        </div>
      </div>

      {/* Content / Files tabs */}
      <div className="post-content-tabs" role="tablist" aria-label="Post sections">
        <button
          type="button"
          role="tab"
          id="tab-content"
          aria-selected={activeTab === 'content'}
          aria-controls="tabpanel-content"
          tabIndex={activeTab === 'content' ? 0 : -1}
          className={`post-content-tabs__tab ${activeTab === 'content' ? 'post-content-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <IconImage size={16} />
          <span>Content</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-files"
          aria-selected={activeTab === 'files'}
          aria-controls="tabpanel-files"
          tabIndex={activeTab === 'files' ? 0 : -1}
          className={`post-content-tabs__tab ${activeTab === 'files' ? 'post-content-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <IconFileText size={16} />
          <span>Files {post.attachment_count > 0 && `(${post.attachment_count})`}</span>
        </button>
      </div>

      {activeTab === 'content' ? (
        <div
          id="tabpanel-content"
          role="tabpanel"
          aria-labelledby="tab-content"
          className="post-content-body motion-arrive-row"
        >
          {post.content ? (
            <div>{post.content}</div>
          ) : (
            <span className="text-muted">No description provided for this post.</span>
          )}
        </div>
      ) : (
        <div
          id="tabpanel-files"
          role="tabpanel"
          aria-labelledby="tab-files"
          className="post-content-body motion-arrive-row"
        >
          {post.attachments && post.attachments.length > 0 ? (
            <AttachmentList attachments={post.attachments} />
          ) : (
            <span className="text-muted">No downloadable attachments assigned to this post.</span>
          )}
        </div>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <MediaViewer media={post.media} />
      )}

      {/* Comments */}
      <CommentSection
        postId={post.id}
        comments={comments}
        onCommentAdded={reloadComments}
      />

      {/* Declarative Authentication Modal */}
      {showAuthModal && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="modal-card">
            <h3 id="auth-modal-title" className="modal-title">Authentication Required</h3>
            <p className="modal-text">
              You must be signed in to like posts or save them to your personal bookmarks collection.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <Link
                to="/login"
                className="btn-primary"
                onClick={() => setShowAuthModal(false)}
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

