import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Post, Comment, AdjacentPosts } from '../types/models';
import MediaViewer from '../components/MediaViewer';
import TagList from '../components/TagList';
import AttachmentList from '../components/AttachmentList';
import CommentSection from '../components/CommentSection';
import { useAuth } from '../context/AuthContext';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').substring(0, 19);
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

  const loadPost = () => {
    if (!postId) return;
    setLoading(true);
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
  };

  useEffect(() => {
    loadPost();
    window.scrollTo(0, 0);
  }, [postId]);

  const reloadComments = () => {
    if (!postId) return;
    api.listComments(postId).then(setComments).catch(console.error);
  };

  if (loading) {
    return <div className="loading">Loading post...</div>;
  }

  if (!post) {
    return (
      <div className="app-container">
        <div className="empty-state">Post not found</div>
        <Link to={`/artist/${slug}`} style={{ display: 'block', textAlign: 'center', marginTop: '1rem' }}>
          ← Back to artist
        </Link>
      </div>
    );
  }

  const artist = post.artist;

  return (
    <div className="app-container">
      {/* Navigation */}
      <div className="post-nav">
        <span>
          {adjacent.previous ? (
            <Link to={`/artist/${slug}/post/${adjacent.previous.id}`}>
              ‹ previous
            </Link>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>‹ previous</span>
          )}
        </span>
        <span>
          {adjacent.next ? (
            <Link to={`/artist/${slug}/post/${adjacent.next.id}`}>
              next ›
            </Link>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>next ›</span>
          )}
        </span>
      </div>

      {/* Post header */}
      <div className="post-header">
        {artist && (
          <Link to={`/artist/${slug}`}>
            {artist.avatar_url ? (
              <img
                src={artist.avatar_url}
                alt={artist.name}
                className="post-header__artist-avatar"
              />
            ) : (
              <div className="post-header__artist-avatar" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)',
              }}>
                {artist.name.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
        )}
        <div className="post-header__info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 className="post-header__title" style={{ margin: 0, marginRight: '8px' }}>{post.title}</h1>
            <button
              onClick={async () => {
                if (!user) { alert('Please login to like posts'); return; }
                try {
                  const isNowLiked = await toggleLikePost(post.id);
                  setPost(prev => prev ? { ...prev, like_count: isNowLiked ? (prev.like_count || 0) + 1 : Math.max(0, (prev.like_count || 1) - 1) } : null);
                } catch (e) { console.error(e); }
              }}
              className={`btn-secondary ${liked ? 'fav-btn--active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: 'var(--fs-sm)' }}
            >
              {liked ? '❤️' : '🤍'} {post.like_count || 0}
            </button>
            <button
              onClick={async () => {
                if (!user) { alert('Please login to bookmark posts'); return; }
                try { await toggleFavoritePost(post.id); } catch (e) { console.error(e); }
              }}
              className={`btn-secondary ${favorited ? 'fav-btn--active' : ''}`}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: 'var(--fs-sm)' }}
            >
              {favorited ? '⭐ Bookmarked' : '☆ Bookmark'}
            </button>
            <Link
              to={`/artist/${slug}/post/${post.id}/edit`}
              className="btn-secondary"
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: 'var(--fs-sm)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}
              title="Edit Post Details & Media"
            >
              ✏️ Edit Post
            </Link>
          </div>
          <div className="post-header__date">
            <span>Published:</span> {formatDate(post.published_at)}
          </div>
          {post.imported_at && (
            <div className="post-header__date">
              <span>Imported:</span> {formatDate(post.imported_at)}
            </div>
          )}
          {artist && (
            <Link to={`/artist/${slug}`} className="post-header__artist-name">
              {artist.name}
            </Link>
          )}
          {post.tags && post.tags.length > 0 && (
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <TagList tags={post.tags} />
            </div>
          )}
        </div>
      </div>

      {/* Content / Files tabs */}
      <div className="post-content-tabs">
        <button
          className={`post-content-tabs__tab ${activeTab === 'content' ? 'post-content-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button
          className={`post-content-tabs__tab ${activeTab === 'files' ? 'post-content-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files {post.attachment_count > 0 && `(${post.attachment_count})`}
        </button>
      </div>

      {activeTab === 'content' ? (
        <div className="post-content-body">
          {post.content || <span style={{ color: 'var(--text-muted)' }}>No description</span>}
        </div>
      ) : (
        <div className="post-content-body">
          {post.attachments && post.attachments.length > 0 ? (
            <AttachmentList attachments={post.attachments} />
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>No attachments</span>
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
    </div>
  );
}
