import React from 'react';
import './Dashboards/Dashboard.css';

const LogEntry = ({ log }) => {
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Check if we have a user reference that might contain an email
  const formatUser = (user) => {
    if (!user) return 'Unknown';
    
    // If the user value contains an @ symbol, it's likely an email
    // In this case, we want to display a more user-friendly value
    if (typeof user === 'string' && user.includes('@')) {
      // Try to extract a username from the email
      const username = user.split('@')[0];
      // Capitalize the first letter and format the username
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    
    return user;
  };

  if (log.newValue?.type === 'due_date_notification') {
    return (
      <div className="log-entry reminder">
        <div className="log-title">
          <span className="task-name">{log.newValue.message}</span>
          <span className="log-badge reminder">Reminder</span>
        </div>
        <div className="log-footer">
          <span className="log-user">System</span>
          <span className="log-time">{getTimeAgo(log.timestamp)}</span>
        </div>
      </div>
    );
  }
  
  // Special handling for subtask status changes
  if (log.changeType === 'SubtaskStatusUpdated' || log.subtaskName) {
    return (
      <div className="log-entry">
        <div className="log-title">
          <span className="task-name">
            {log.subtaskName ? `Subtask: ${log.subtaskName}` : 'Subtask'} 
            {log.taskName ? ` (in ${log.taskName})` : ''}
          </span>
          <span className={`log-badge ${log.changeType?.toLowerCase() || 'updated'}`}>
            {log.changeType?.toLowerCase() || 'status changed'}
          </span>
        </div>
        
        {log.oldValue && log.newValue && (
          <div className="status-change">
            <span className="old-status">{log.oldValue.Status || log.oldStatus}</span>
            <span className="new-status">{log.newValue.Status || log.newStatus}</span>
          </div>
        )}
        
        <div className="log-footer">
          <span className="log-user">{formatUser(log.changedBy)}</span>
          <span className="log-time">{getTimeAgo(log.timestamp)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="log-entry">
      <div className="log-title">
        <span className="task-name">{log.newValue?.TaskName || log.taskName}</span>
        <span className={`log-badge ${log.changeType?.toLowerCase()}`}>
          {log.changeType?.toLowerCase()}
        </span>
      </div>
      
      {log.newValue?.message ? (
        <div className="status-change">
          <span className="change-message">{log.newValue.message}</span>
        </div>
      ) : log.oldValue && log.newValue && ['Status'].includes(Object.keys(log.oldValue)[0]) && (
        <div className="status-change">
          <span className="old-status">{log.oldValue.Status}</span>
          <span className="new-status">{log.newValue.Status}</span>
        </div>
      )}
      
      <div className="log-footer">
        <span className="log-user">{formatUser(log.changedBy)}</span>
        <span className="log-time">{getTimeAgo(log.timestamp)}</span>
      </div>
    </div>
  );
};

export default LogEntry; 