import React, { useState } from 'react';
import type { Comment } from '../types/models';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

function CommentItem({ comment }: { comment: Comment }) {
  const isMember = comment.is_member || !!comment.user_id;
  const isAdmin = comment.author_role === 'admin';

  return (
    <div className={`comment ${isMember ? 'comment-item--member' : ''}`}>
      <div className="comment__header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span className="comment__author" style={isMember ? { color: 'var(--accent)', fontWeight: '700' } : {}}>
          {comment.author_name}
        </span>
        {isAdmin ? (
          <span className="member-badge" style={{ borderColor: '#ff6b6b', color: '#ff6b6b' }}>Admin</span>
        ) : isMember ? (
          <span className="member-badge">Member</span>
        ) : null}
        <span className="comment__date">{formatDate(comment.created_at)}</span>
        {comment.is_edited && <span className="comment__date">(edited)</span>}
      </div>
      <div className="comment__body">{comment.content}</div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="comment__replies">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId, comments, onCommentAdded }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await api.createComment(postId, {
        author_name: user ? (user.display_name || user.username) : (name.trim() || undefined),
        content: content.trim(),
      });
      setContent('');
      onCommentAdded();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-section">
      <h3 className="comment-section__title">
        Comments ({comments.length})
      </h3>

      <form className="comment-form" onSubmit={handleSubmit}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--fs-sm)', color: 'var(--accent)', fontWeight: '600' }}>
            <span>👤 Commenting as authenticated Member: <strong>{user.display_name || user.username}</strong></span>
            <span className="member-badge">Member</span>
          </div>
        ) : (
          <div className="comment-form__row">
            <input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>
        )}
        <textarea
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting || !content.trim()}>
          {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>

      {comments.length === 0 ? (
        <div className="empty-state">No comments yet</div>
      ) : (
        comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))
      )}
    </div>
  );
}

