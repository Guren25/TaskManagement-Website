import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import axios from 'axios';
import TaskModal from './TaskModal';
import './AdminDashboard.css';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  });
};

const AdminDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    location: '',
    assignedTo: '',
    startDate: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [activityLog, setActivityLog] = useState([]);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});

  useEffect(() => {
    fetchTasks().then(() => fetchActivityLog());
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/tasks');
      const data = response.data;
      setTasks(data);
      setFilteredTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    try {
      const response = await axios.get('/api/activity-logs/recent');
      setActivityLog(response.data);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const handleFilterChange = async (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);

    if (!value) {
      setFilteredTasks(tasks);
      return;
    }

    try {
      const response = await axios.get(`/api/tasks/filter/${filterType}/${value}`);
      const data = response.data;
      setFilteredTasks(data);
    } catch (error) {
      console.error('Error applying filter:', error);
    }
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const toggleLogExpansion = (logId) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const prepareChartData = () => {
    const last30Days = [...Array(30)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const completedTasksByDate = {};
    const createdTasksByDate = {};
    const subtasksByDate = {};
    tasks.forEach(task => {
      const creationDate = new Date(task.CreatedAt).toISOString().split('T')[0];
      createdTasksByDate[creationDate] = (createdTasksByDate[creationDate] || 0) + 1;
      if (task.Status === 'completed') {
        const completionDate = new Date(task.UpdatedAt).toISOString().split('T')[0];
        completedTasksByDate[completionDate] = (completedTasksByDate[completionDate] || 0) + 1;
      }
      if (task.subtask && task.subtask.length > 0) {
        subtasksByDate[creationDate] = (subtasksByDate[creationDate] || 0) + task.subtask.length;
        task.subtask.forEach(subtask => {
          if (subtask.Status === 'completed') {
            const completionDate = new Date(task.UpdatedAt).toISOString().split('T')[0];
            completedTasksByDate[completionDate] = (completedTasksByDate[completionDate] || 0) + 1;
          }
        });
      }
    });

    return {
      labels: last30Days.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          label: 'Completed Tasks',
          data: last30Days.map(date => completedTasksByDate[date] || 0),
          borderColor: '#34C759', 
          backgroundColor: 'rgba(52, 199, 89, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#34C759',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        },
        {
          label: 'New Tasks',
          data: last30Days.map(date => createdTasksByDate[date] || 0),
          borderColor: '#007AFF', 
          backgroundColor: 'rgba(0, 122, 255, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#007AFF',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        },
        {
          label: 'Subtasks',
          data: last30Days.map(date => subtasksByDate[date] || 0),
          borderColor: '#FF9500',
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#FF9500',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            size: 12
          },
          usePointStyle: true,
          padding: 15
        }
      },
      title: {
        display: true,
        text: 'Activity Graph',
        font: {
          size: 16,
          weight: '600',
          family: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        },
        padding: {
          top: 20,
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#000',
        bodyColor: '#333',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value} task${value !== 1 ? 's' : ''}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          precision: 0,
          font: {
            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            size: 10
          }
        }
      }
    }
  };

  const handleTaskCreated = (newTask) => {
    setTasks([...tasks, newTask]);
    setFilteredTasks([...filteredTasks, newTask]);
    
    const newLog = {
      _id: `task-created-${newTask._id}`,
      type: 'task-created',
      taskName: newTask.TaskName,
      user: newTask.AssignedBy,
      timestamp: new Date().toISOString(),
      message: `Task "${newTask.TaskName}" created by ${newTask.AssignedBy}`
    };
    
    const subtaskLogs = newTask.subtask && newTask.subtask.length > 0 ? 
      newTask.subtask.map((subtask, index) => ({
        _id: `subtask-added-${newTask._id}-${index}`,
        type: 'subtask-added',
        taskName: newTask.TaskName,
        subtaskName: subtask.TaskName,
        user: newTask.AssignedBy,
        timestamp: new Date().toISOString(),
        message: `Subtask "${subtask.TaskName}" added to "${newTask.TaskName}" by ${newTask.AssignedBy}`
      })) : [];
    
    setActivityLog([newLog, ...subtaskLogs, ...activityLog]);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'status-badge completed';
      case 'in-progress': return 'status-badge in-progress';
      case 'not-started': return 'status-badge not-started';
      default: return 'status-badge';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'priority-badge high';
      case 'medium': return 'priority-badge medium';
      case 'low': return 'priority-badge low';
      default: return 'priority-badge';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return format(date, 'MM/dd/yy hh:mm a');
  };

  const renderLogDetails = (log) => {
    if (!log) return null;

    const getFormattedValue = (value) => {
      if (!value) return null;
      return {
        Task: value.TaskName,
        Location: value.Location,
        Priority: value.Priority,
        Status: value.Status,
        "Assigned To": value.AssignedTo,
        "Start Date": formatDate(value.StartDate),
        "End Date": formatDate(value.EndDate),
        "Task ID": value.TaskID
      };
    };

    const getSummaryMessage = () => {
      const taskName = log.newValue?.TaskName || log.oldValue?.TaskName;
      switch (log.changeType) {
        case 'Created':
          return `New task "${taskName}" created`;
        case 'Updated':
          if (log.newValue?.Status !== log.oldValue?.Status) {
            return `Task "${taskName}" status changed to ${log.newValue.Status}`;
          }
          return `Task "${taskName}" updated`;
        case 'Deleted':
          return `Task "${taskName}" deleted`;
        default:
          return `Task "${taskName}" modified`;
      }
    };

    return (
      <div className="log-entry">
        <div 
          className="log-header"
          onClick={() => toggleLogExpansion(log._id)}
        >
          <div className="log-title">
            <span className={`change-type ${log.changeType ? log.changeType.toLowerCase() : ''}`}>
              {log.changeType || 'N/A'}
            </span>
            <span className="log-summary">{getSummaryMessage()}</span>
          </div>
          <div className="log-meta">
            <span className="log-user">{log.changedBy}</span>
            <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
            <span className={`expand-icon ${expandedLogs[log._id] ? 'expanded' : ''}`}>▼</span>
          </div>
        </div>
        
        {expandedLogs[log._id] && (
          <div className="log-content">
            <div className="log-grid">
              {log.oldValue && log.newValue && (
                Object.entries(getFormattedValue(log.newValue)).map(([key, newValue]) => {
                  const oldValue = getFormattedValue(log.oldValue)[key];
                  if (oldValue !== newValue) {
                    return (
                      <div key={`${log._id}-${key}`} className="change-item">
                        <span className="change-key">{key}</span>
                        <div className="change-values">
                          <span className="old-value">{oldValue}</span>
                          <span className="arrow">→</span>
                          <span className="new-value">{newValue}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })
              )}
              {!log.oldValue && log.newValue && (
                Object.entries(getFormattedValue(log.newValue)).map(([key, value]) => (
                  <div key={`${log._id}-${key}`} className="change-item">
                    <span className="change-key">{key}</span>
                    <span className="change-value">{value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div>
          <h1 className="admin-dashboard-title">ADMIN DASHBOARD</h1>
        </div>
      </div>
      
      <div className="dashboard-metrics">
        <div className="metric-card">
          <span className="metric-value">{tasks.length}</span>
          <span className="metric-label">Total Tasks</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">
            {tasks.filter(task => task.Status === 'completed').length}
          </span>
          <span className="metric-label">Completed</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">
            {tasks.filter(task => task.Status === 'in-progress').length}
          </span>
          <span className="metric-label">In Progress</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">
            {tasks.filter(task => task.Status === 'not-started').length}
          </span>
          <span className="metric-label">Not Started</span>
        </div>
      </div>

      <div className="dashboard-layout two-column">
        <div className="chart-section">
          <h2 className="panel-title">Activity Graph</h2>
          <div className="chart-container">
            <Line data={prepareChartData()} options={chartOptions} />
          </div>
        </div>

        <div className="task-list-panel">
          <div className="task-list-header">
            <h2>Tasks & Subtasks</h2>
            <button className="add-task-btn" onClick={() => setIsModalOpen(true)}>
              Task
            </button>
          </div>
          <div className="filter-section">
            <div 
              className="filter-toggle" 
              onClick={() => setExpandedFilters(!expandedFilters)}
            >
              <span>Filters</span>
              <span className={`filter-toggle-icon ${expandedFilters ? 'expanded' : ''}`}>▼</span>
            </div>
            
            <div className={`filter-content ${expandedFilters ? 'expanded' : ''}`}>
              <div className="filter-row">
                <div className="filter-group">
                  <label className="filter-label">Status</label>
                  <select 
                    className="filter-input"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="completed">Completed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="not-started">Not Started</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Priority</label>
                  <select
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="filter-input"
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="filter-row">
                <div className="filter-group">
                  <label className="filter-label">Location</label>
                  <input
                    type="text"
                    placeholder="Enter location"
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Assignee</label>
                  <input
                    type="text"
                    placeholder="Enter email"
                    onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                    className="filter-input"
                  />
                </div>
              </div>

              <div className="filter-row">
                <div className="filter-group">
                  <label className="filter-label">Start Date</label>
                  <input
                    type="date"
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="filter-input date-input"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="loading-spinner">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="no-tasks-message">
              <p>No tasks found matching your criteria.</p>
            </div>
          ) : (
            <div className="task-list">
              {filteredTasks.map(task => (
                <div key={task._id} className="task-card">
                  <div 
                    className="task-header" 
                    onClick={() => toggleTaskExpansion(task._id)}
                  >
                    <div className="task-title-section">
                      <span className={`expand-icon ${expandedTasks[task._id] ? 'expanded' : ''}`}>
                        ▶
                      </span>
                      <span className="task-name">{task.TaskName}</span>
                    </div>
                    <div className="task-badges">
                      <span className={getStatusBadgeClass(task.Status)}>
                        {task.Status.replace('-', ' ')}
                      </span>
                      <span className={getPriorityBadgeClass(task.Priority)}>
                        {task.Priority}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`task-details ${expandedTasks[task._id] ? 'expanded' : ''}`}>
                    <div className="task-detail-row">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{task.Location}</span>
                    </div>
                    <div className="task-detail-row">
                      <span className="detail-label">Assigned To:</span>
                      <span className="detail-value">{task.AssignedTo}</span>
                    </div>
                    <div className="task-detail-row">
                      <span className="detail-label">Dates:</span>
                      <span className="detail-value">
                        {formatDate(task.StartDate)} - {formatDate(task.EndDate)}
                      </span>
                    </div>
                    <div className="task-detail-row">
                      <span className="detail-label">Progress:</span>
                      <div className="progress-container">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${task.percentage}%` }}
                        ></div>
                        <span className="progress-text">{task.percentage}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {task.subtask && task.subtask.length > 0 && (
                    <div className={`subtask-list ${expandedTasks[task._id] ? 'expanded' : ''}`}>
                      <div className="subtask-header">Subtasks ({task.subtask.length})</div>
                      {task.subtask.map((subtask, index) => (
                        <div key={`${task._id}-sub-${index}`} className="subtask-item">
                          <div className="subtask-content">
                            <div className="subtask-title-section">
                              <span className="subtask-bullet">•</span>
                              <span className="subtask-name">{subtask.TaskName}</span>
                            </div>
                            <div className="subtask-badges">
                              <span className={getStatusBadgeClass(subtask.Status)}>
                                {subtask.Status.replace('-', ' ')}
                              </span>   
                              <span className={getPriorityBadgeClass(subtask.Priority)}>
                                {subtask.Priority}
                              </span>
                            </div>
                          </div>
                          <div className="subtask-detail">
                            <span className="detail-label">Assigned To:</span>
                            <span className="detail-value">{subtask.AssignedTo}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="activity-log-panel">
          <h2 className="panel-title">Activity Logs</h2>
          <div className="activity-log">
            {activityLog.length === 0 ? (
              <div className="no-activity">No recent activity</div>
            ) : (
              activityLog.map(log => (
                <div key={log._id || `log-${log.timestamp}-${log.type}`}>
                  {renderLogDetails(log)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
};

export default AdminDashboard; 