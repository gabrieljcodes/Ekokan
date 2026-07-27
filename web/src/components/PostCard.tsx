import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../types/models';
import { useAuth } from '../context/AuthContext';

interface Props {
  post: Post;
  artistSlug: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

export default function PostCard({ post, artistSlug }: Props) {
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

  return (
    <Link
      to={`/artist/${artistSlug}/post/${post.id}`}
      className="post-card"
      style={{ textDecoration: 'none', position: 'relative' }}
    >
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
        <img
          src={thumb.url}
          alt={post.title}
          className="post-card__thumb"
          loading="lazy"
        />
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
    </Link>
  );
}

