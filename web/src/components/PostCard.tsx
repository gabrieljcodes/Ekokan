import React from 'react';
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
  const { user, isFavoritePost, toggleFavoritePost } = useAuth();
  const favorited = isFavoritePost(post.id) || post.is_favorited;

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

  return (
    <Link
      to={`/artist/${artistSlug}/post/${post.id}`}
      className="post-card"
      style={{ textDecoration: 'none', position: 'relative' }}
    >
      <button
        onClick={handleFavorite}
        className={`fav-btn ${favorited ? 'fav-btn--active' : ''}`}
        style={{ position: 'absolute', top: '8px', right: '8px' }}
        title={favorited ? 'Saved in favorites' : 'Bookmark post'}
      >
        {favorited ? '❤️' : '🤍'}
      </button>
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

