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
  return new Date(dateString).toLocaleDateString();
};

const TaskCard = ({ task, onTaskClick }) => {
  return (
    <div className="task-card" onClick={() => onTaskClick(task)}>
      <div className="task-header">
        <div className="task-content">
          <div className="task-info">
            <div className="task-name">
              <span className="task-id">{task.TaskID}:</span> {task.TaskName}
            </div>
            <div className="task-meta">
              <span className="task-date">
                <span className="date-label">Start:</span> {formatDate(task.StartDate)}
              </span>
              <span className="task-assignee">Assigned to: {task.AssignedTo}</span>
              {task.subtask && task.subtask.length > 0 && (
                <span>Subtasks: {task.subtask.length}</span>
              )}
            </div>
          </div>
          <div className="task-badges">
            <span className={`status-badge ${task.Status}`}>
              {task.Status.replace('-', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const calculateMetrics = (tasks) => {
  return {
    totalProjects: tasks.length,
    pending: tasks.filter(task => task.Status === 'not-started').length,
    overdue: tasks.filter(task => new Date(task.EndDate) < new Date() && task.Status !== 'completed').length,
    completed: tasks.filter(task => task.Status === 'completed').length
  };
};
const calculateTrend = (currentValue, previousValue) => {
  const difference = currentValue - previousValue;
  return {
    value: Math.abs(difference),
    isPositive: difference >= 0
  };
};

const MetricCard = ({ value, label }) => (
  <div className="metric-card">
    <div className="metric-header">
      <span>{value}</span>
    </div>
    <div className="metric-footer">
      <span>{label}</span>
    </div>
  </div>
);

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

  return (
    <div className="log-entry">
      <div className="log-title">
        <span className="task-name">{log.newValue?.TaskName}</span>
        <span className={`log-badge ${log.changeType?.toLowerCase()}`}>
          {log.changeType?.toLowerCase()}
        </span>
      </div>
      
      {log.oldValue && log.newValue && ['Status'].includes(Object.keys(log.oldValue)[0]) && (
        <div className="status-change">
          <span className="old-status">{log.oldValue.Status}</span>
          <span className="new-status">{log.newValue.Status}</span>
        </div>
      )}
      
      <div className="log-footer">
        <span className="log-user">{log.changedBy}</span>
        <span className="log-time">{getTimeAgo(log.timestamp)}</span>
      </div>
    </div>
  );
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
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    pending: 0,
    overdue: 0,
    completed: 0,
    trends: {
      projects: { value: 0, isPositive: true },
      pending: { value: 0, isPositive: true },
      overdue: { value: 0, isPositive: true },
      completed: { value: 0, isPositive: true }
    }
  });
  const [timeRange, setTimeRange] = useState(7);
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [uniqueAssignees, setUniqueAssignees] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchTasks().then(() => fetchActivityLog());
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setCurrentUser(userData);
    }
  }, []);


  useEffect(() => {
    if (tasks.length > 0) {
      const locations = [...new Set(tasks.map(task => task.Location))].filter(Boolean);
      const assignees = [...new Set(tasks.map(task => task.AssignedTo))].filter(Boolean);
      setUniqueLocations(locations);
      setUniqueAssignees(assignees);
    }
  }, [tasks]);

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

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);

    let filtered = [...tasks];

    if (newFilters.status) {
      filtered = filtered.filter(task => task.Status === newFilters.status);
    }
    if (newFilters.priority) {
      filtered = filtered.filter(task => task.Priority === newFilters.priority);
    }
    if (newFilters.location) {
      filtered = filtered.filter(task => task.Location === newFilters.location);
    }
    if (newFilters.assignedTo) {
      filtered = filtered.filter(task => task.AssignedTo === newFilters.assignedTo);
    }
    if (newFilters.startDate) {
      filtered = filtered.filter(task => {
        const taskDate = new Date(task.StartDate).toISOString().split('T')[0];
        return taskDate === newFilters.startDate;
      });
    }

    setFilteredTasks(filtered);
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

  const prepareChartData = (range = 30) => {
    const lastNDays = [...Array(range)].map((_, i) => {
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
      labels: lastNDays.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [
        {
          label: 'Completed Tasks',
          data: lastNDays.map(date => completedTasksByDate[date] || 0),
          borderColor: '#34C759', 
          backgroundColor: 'rgba(52, 199, 89, 0.12)',
          borderWidth: 2.5,
          pointBackgroundColor: '#34C759',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.4
        },
        {
          label: 'New Tasks',
          data: lastNDays.map(date => createdTasksByDate[date] || 0),
          borderColor: '#007AFF',
          backgroundColor: 'rgba(0, 122, 255, 0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#007AFF',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Subtasks',
          data: lastNDays.map(date => subtasksByDate[date] || 0),
          borderColor: '#FF9500',
          backgroundColor: 'rgba(255, 149, 0, 0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#FF9500',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.4
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
            size: 12,
            weight: '500'
          },
          usePointStyle: true,
          padding: 20,
          color: '#1d1d1f'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1d1d1f',
        titleFont: {
          size: 14,
          weight: '600',
          family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif'
        },
        bodyColor: '#374151',
        bodyFont: {
          size: 13,
          family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif'
        },
        borderColor: 'rgba(0, 0, 0, 0.05)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
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
        border: {
          display: false
        },
        ticks: {
          font: {
            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            size: 11
          },
          color: '#6e6e73',
          padding: 8
        }
      },
      y: {
        beginAtZero: true,
        border: {
          display: false
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.06)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          precision: 0,
          font: {
            family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
            size: 11
          },
          color: '#6e6e73',
          padding: 8,
          maxTicksLimit: 5
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 3,
        hoverRadius: 5
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
            <span className="log-time">{formatTimestamp(log.timestamp)}</span>
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

  const handleSortChange = (order) => {
    setSortOrder(order);
    const sorted = [...filteredTasks].sort((a, b) => {
      const dateA = new Date(a.StartDate);
      const dateB = new Date(b.StartDate);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    setFilteredTasks(sorted);
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <div className="header-left">
          <h1 className="welcome-text">
            Welcome back, {currentUser?.firstname || currentUser?.email || 'User'}!
          </h1>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="main-left">
          <div className="dashboard-metrics">
            <MetricCard value={metrics.totalProjects} label="Projects" />
            <MetricCard value={metrics.pending} label="Pending" />
            <MetricCard value={metrics.overdue} label="Overdue" />
            <MetricCard value={metrics.completed} label="Finished" />
          </div>

          <div className="project-status-section">
            <div className="section-header">
              <h2>Activity Graph</h2>
              <div className="period-selector">
                <select 
                  value={timeRange} 
                  onChange={(e) => setTimeRange(Number(e.target.value))}
                  className="range-select"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={60}>Last 60 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </div>
            </div>
            <div className="chart-container">
              <Line data={prepareChartData(timeRange)} options={chartOptions} />
            </div>
          </div>

          <div className="task-section">
            <div className="section-header">
              <h2>All Tasks</h2>
              <button 
                className="add-task-btn"
                onClick={() => setIsModalOpen(true)}
              >
                Add Task
              </button>
            </div>
            <div className="section-header">
              <div className="filter-group">
                <select
                  className="filter-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Status: All</option>
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  className="filter-select"
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                >
                  <option value="">Priority: All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <select
                  className="filter-select"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                >
                  <option value="">Location: All</option>
                  {uniqueLocations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={filters.assignedTo}
                  onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                >
                  <option value="">Assigned To: All</option>
                  {uniqueAssignees.map(assignee => (
                    <option key={assignee} value={assignee}>{assignee}</option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={sortOrder}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  <option value="desc">Newest First ↓</option>
                  <option value="asc">Oldest First ↑</option>
                </select>

                {Object.values(filters).some(Boolean) && (
                  <button
                    className="filter-clear-btn"
                    onClick={() => {
                      setFilters({
                        status: '',
                        priority: '',
                        location: '',
                        assignedTo: '',
                        startDate: ''
                      });
                      setFilteredTasks(tasks);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="task-list">
              {filteredTasks.map(task => (
                <TaskCard key={task._id} task={task} onTaskClick={setSelectedTask} />
              ))}
            </div>
          </div>
        </div>

        <div className="main-right">
          <div className="activity-log-panel">
            <h2>Task Logs</h2>
            <div className="activity-log">
              {activityLog.length === 0 ? (
                <div className="no-logs">No recent activity</div>
              ) : (
                activityLog.map((log, index) => (
                  <LogEntry key={log._id || index} log={log} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedTask && (
        <div className="task-modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="task-modal" onClick={e => e.stopPropagation()}>
            <div className="task-modal-header">
              <h2 className="task-modal-title">{selectedTask.TaskName}</h2>
              <button className="task-modal-close" onClick={() => setSelectedTask(null)}>×</button>
            </div>
            <div className="task-modal-content">
              <div className="task-modal-section">
                <h3 className="task-modal-section-title">Task Details</h3>
                <div className="task-detail-row">
                  <span className="detail-label">Task ID:</span>
                  <span className="detail-value">{selectedTask.TaskID}</span>
                </div>
                <div className="task-detail-row">
                  <span className="detail-label">Assigned To:</span>
                  <span className="detail-value">{selectedTask.AssignedTo}</span>
                </div>
                <div className="task-detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{selectedTask.Description}</span>
                </div>
                <div className="task-detail-row">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{selectedTask.Location}</span>
                </div>
                <div className="task-detail-row">
                  <span className="detail-label">Priority:</span>
                  <span className={`priority-badge ${selectedTask.Priority}`}>
                    {selectedTask.Priority}
                  </span>
                </div>
                <div className="task-detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${selectedTask.Status}`}>
                    {selectedTask.Status.replace('-', ' ')}
                  </span>
                </div>
                <div className="task-detail-row">
                  <span className="detail-label">Progress:</span>
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${selectedTask.percentage}%` }}
                    ></div>
                    <span className="progress-text">{selectedTask.percentage}%</span>
                  </div>
                </div>
              </div>
              
              {selectedTask.subtask && selectedTask.subtask.length > 0 && (
                <div className="task-modal-section">
                  <h3 className="task-modal-section-title">Subtasks ({selectedTask.subtask.length})</h3>
                  <div className="subtasks-list">
                    {selectedTask.subtask.map((subtask, index) => (
                      <div key={index} className="subtask-item">
                        <div className="subtask-content">
                          <span className="subtask-name">{subtask.TaskName}</span>
                          <div className="subtask-badges">
                            <span className={`status-badge ${subtask.Status}`}>
                              {subtask.Status.replace('-', ' ')}
                            </span>
                            <span className={`priority-badge ${subtask.Priority}`}>
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTaskCreated={(newTask) => {
            handleTaskCreated(newTask);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard; 