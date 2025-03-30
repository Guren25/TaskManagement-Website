import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../components/Dashboards/Dashboard.css';

const SubtaskComments = ({ taskId, subtask, currentUser, onCommentAdded }) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState(subtask.comments || []);

  // Update local comments when subtask changes
  useEffect(() => {
    setComments(subtask.comments || []);
  }, [subtask]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    } else {
      const options = { 
        month: 'short', 
        day: 'numeric',
      };
      return date.toLocaleDateString(undefined, options);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const author = currentUser ? 
        `${currentUser.firstname} ${currentUser.lastname}` : 'Anonymous User';
      
      // Use TaskID here instead of _id
      const response = await axios.post(`/api/tasks/${taskId}/subtask/${subtask.TaskID}/comment`, {
        author,
        text: commentText
      });
      
      // Update local state with the new comment immediately
      const newComment = {
        author,
        text: commentText,
        timestamp: new Date()
      };
      setComments(prevComments => [...(prevComments || []), newComment]);
      
      setCommentText('');
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="subtask-comments-section">
      <h4 className="comments-title">Comments</h4>
      
      <div className="comments-list">
        {comments && comments.length > 0 ? (
          comments.map((comment, index) => (
            <div key={index} className="comment-item">
              <div className="comment-author-avatar">
                {getInitials(comment.author)}
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">{comment.author}</span>
                  <span className="comment-timestamp">· {formatDate(comment.timestamp)}</span>
                </div>
                <div className="comment-text">{comment.text}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-comments-message">No comments yet</div>
        )}
      </div>
      
      <form onSubmit={handleSubmitComment} className="comment-form">
        <textarea
          className="comment-input"
          placeholder="Post your reply"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          rows={1}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitComment(e);
            }
          }}
        />
        <button 
          type="submit" 
          className="comment-submit-btn"
          disabled={isSubmitting || !commentText.trim()}
          aria-label="Post comment"
        >
          <span>→</span>
        </button>
      </form>
    </div>
  );
};

export default SubtaskComments; 