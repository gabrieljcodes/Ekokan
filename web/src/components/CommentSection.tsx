import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Comment } from '../types/models';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconUser, IconWarning } from './Icons';

interface Props {
  postId: string;
  comments: Comment[];
  onCommentAdded: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

// [P0 Fix] Wrap CommentItem in React.memo to prevent recursive virtual DOM re-render churn during textarea typing
const CommentItem = React.memo(function CommentItem({ comment }: { comment: Comment }) {
  const isMember = comment.is_member || !!comment.user_id;
  const isAdmin = comment.author_role === 'admin';

  return (
    <div className={`comment ${isMember ? 'comment-item--member' : ''}`} role="article" aria-label={`Comment by ${comment.author_name || 'Anonymous'}`}>
      <div className="comment__header comment__header-row">
        <span className={`comment__author ${isMember ? 'comment__author--member' : ''}`}>
          {comment.author_name}
        </span>
        {isAdmin ? (
          <span className="member-badge member-badge--admin">Admin</span>
        ) : isMember ? (
          <span className="member-badge">Member</span>
        ) : null}
        <time className="comment__date" dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
        {comment.is_edited && <span className="comment__date">(edited)</span>}
      </div>
      <div className="comment__body">{comment.content}</div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment__replies" role="group" aria-label={`Replies to ${comment.author_name || 'comment'}`}>
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );
});

export default function CommentSection({ postId, comments, onCommentAdded }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await api.createComment(postId, {
        author_name: user ? (user.display_name || user.username) : (name.trim() || undefined),
        content: content.trim(),
      });
      if (isMountedRef.current) {
        setContent('');
        setError(null);
        onCommentAdded();
      }
    } catch (err: unknown) {
      console.error('Failed to post comment:', err);
      if (isMountedRef.current) {
        setError((err as Error).message || 'Failed to post comment. Please check your connection and try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [content, postId, user, name, onCommentAdded]);

  return (
    <section className="comment-section" aria-labelledby="comment-section-title">
      <h3 id="comment-section-title" className="comment-section__title">
        Comments ({comments.length})
      </h3>

      {error && (
        <div className="form-error" role="alert" aria-live="assertive">
          <IconWarning size={18} aria-hidden={true} />
          <span>{error}</span>
        </div>
      )}

      <form className="comment-form" onSubmit={handleSubmit} aria-busy={submitting}>
        {user ? (
          <div className="comment-form__user-status">
            <span className="comment-form__user-status-icon">
              <IconUser size={16} aria-hidden={true} />
              <span>Commenting as authenticated Member: <strong>{user.display_name || user.username}</strong></span>
            </span>
            <span className="member-badge">Member</span>
          </div>
        ) : (
          <div className="comment-form__row">
            <label htmlFor="comment-guest-name" className="sr-only">Your Name (optional)</label>
            <input
              id="comment-guest-name"
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="comment-form__name-input"
              disabled={submitting}
              aria-label="Your Name (optional)"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="comment-content" className="sr-only">Comment content (required)</label>
          <textarea
            id="comment-content"
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={2000}
            disabled={submitting}
            aria-label="Comment content (required)"
            aria-invalid={!!error}
          />
        </div>

        <div className="comment-form__footer">
          <span className="comment-form__counter" aria-live="polite">
            {content.length} / 2000 characters
          </span>
          <button type="submit" className="btn-primary" disabled={submitting || !content.trim()}>
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </form>

      <div role="region" aria-label="Discussion thread">
        {comments.length === 0 ? (
          <div className="empty-state">No comments yet</div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </section>
  );
}
