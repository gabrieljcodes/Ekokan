import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../types/models';
import { useAuth } from '../context/AuthContext';

interface Props {
  post: Post;
  artistSlug: string;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

export default function PostCard({ post, artistSlug, selectable = false, selected = false, onToggleSelect }: Props) {
  const thumb = post.media?.[0]?.file;
  const { user, isFavoritePost, toggleFavoritePost, isLikedPost, toggleLikePost } = useAuth();
  const favorited = isFavoritePost(post.id) || post.is_favorited;
  const liked = isLikedPost(post.id) || post.is_liked;
  const [likeCount, setLikeCount] = useState(post.like_count || 0);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please login to bookmark posts');
      return;
    }
    try {
      await toggleFavoritePost(post.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert('Please login to like posts');
      return;
    }
    try {
      const isNowLiked = await toggleLikePost(post.id);
      setLikeCount((prev) => (isNowLiked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (err) {
      console.error(err);
    }
  };

  const cardContent = (
    <>
      {selectable && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 4,
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selected ? 'linear-gradient(135deg, var(--accent), var(--success))' : 'rgba(18, 18, 18, 0.75)',
          border: selected ? '2px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.6)',
          boxShadow: selected ? '0 0 12px rgba(106, 175, 230, 0.8)' : '0 2px 6px rgba(0,0,0,0.5)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          color: '#fff',
          fontWeight: 800,
          fontSize: '15px'
        }}>
          {selected ? '✓' : ''}
        </div>
      )}
      <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, display: 'flex', gap: '6px' }}>
        <button
          onClick={handleLike}
          className={`fav-btn ${liked ? 'fav-btn--active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
          title={liked ? 'Liked' : 'Like post'}
        >
          <span>{liked ? '❤️' : '🤍'}</span>
          {likeCount > 0 && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{likeCount}</span>}
        </button>
        <button
          onClick={handleFavorite}
          className={`fav-btn ${favorited ? 'fav-btn--active' : ''}`}
          title={favorited ? 'Saved in favorites' : 'Add to favorites'}
        >
          {favorited ? '⭐' : '☆'}
        </button>
      </div>
      {thumb?.url ? (
        <>
          <img
            src={thumb.thumbnail_url || thumb.url}
            alt={post.title}
            className="post-card__thumb"
            loading="lazy"
            onError={(e) => {
              if (thumb.url && e.currentTarget.src !== thumb.url) {
                e.currentTarget.src = thumb.url;
              }
            }}
          />
          {thumb.mime_type?.startsWith('video/') && (
            <div style={{
              position: 'absolute',
              bottom: '60px',
              left: '10px',
              zIndex: 3,
              background: 'rgba(18, 18, 24, 0.85)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '4px 10px',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              🎬 Video
            </div>
          )}
        </>
      ) : (
        <div className="post-card__no-thumb">No media</div>
      )}
      <div className="post-card__overlay">
        <div className="post-card__title">{post.title}</div>
        <div className="post-card__meta">
          <span>{formatDate(post.published_at)}</span>
          {post.attachment_count > 0 && (
            <span>{post.attachment_count} attachment{post.attachment_count > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </>
  );

  if (selectable) {
    return (
      <div
        className="post-card"
        style={{
          cursor: 'pointer',
          textDecoration: 'none',
          position: 'relative',
          outline: selected ? '3px solid var(--accent)' : 'none',
          outlineOffset: '-3px',
          transform: selected ? 'scale(0.98)' : 'none',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
        onClick={(e) => {
          e.preventDefault();
          onToggleSelect?.(post.id);
        }}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      to={`/artist/${artistSlug}/post/${post.id}`}
      className="post-card"
      style={{ textDecoration: 'none', position: 'relative' }}
    >
      {cardContent}
    </Link>
  );
}

