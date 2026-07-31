import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Post } from '../types/models';
import { useAuth } from '../context/AuthContext';
import { toast } from './Toast';
import { IconHeart, IconHeartFilled, IconStar, IconStarFilled, IconCheck, IconFilm } from './Icons';

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
      toast('Please login to bookmark posts', 'info');
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
      toast('Please login to like posts', 'info');
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
        <div className={`post-card__select ${selected ? 'post-card__select--active' : ''}`}>
          {selected && <IconCheck size={14} />}
        </div>
      )}
      <div className="post-card__actions">
        <button
          onClick={handleLike}
          className={`fav-btn ${liked ? 'fav-btn--active' : ''}`}
          aria-label={liked ? 'Unlike post' : 'Like post'}
          aria-pressed={liked}
        >
          {liked ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
          {likeCount > 0 && <span className="fav-btn__count">{likeCount}</span>}
        </button>
        <button
          onClick={handleFavorite}
          className={`fav-btn ${favorited ? 'fav-btn--active' : ''}`}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorited}
        >
          {favorited ? <IconStarFilled size={14} /> : <IconStar size={14} />}
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
            <div className="post-card__video-badge">
              <IconFilm size={12} /> Video
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
        className={`post-card ${selected ? 'post-card--selected' : ''}`}
        role="option"
        aria-selected={selected}
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
    >
      {cardContent}
    </Link>
  );
}
