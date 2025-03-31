import React, { useState, useEffect, useCallback } from 'react';
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
import TaskModal from '../TaskModal';
import './Dashboard.css';
import { format } from 'date-fns';
import SideNav from '../SideNav';
import { subscribeToTaskUpdates, unsubscribeFromTaskUpdates } from '../../services/socket';
import SubtaskComments from '../SubtaskComments';
import LogEntry from '../LogEntry';

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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
};

const TaskCard = ({ task, onTaskClick }) => {
  console.log('Rendering task:', task);
  const getDueDateStatus = (endDate) => {
    const now = new Date();
    const due = new Date(endDate);
    const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue <= 1) {
      return { class: 'due-critical', text: 'Due tomorrow!' };
    } else if (daysUntilDue <= 3) {
      return { class: 'due-warning', text: `Due in ${daysUntilDue} days` };
    } else if (daysUntilDue <= 7) {
      return { class: 'due-notice', text: `Due in ${daysUntilDue} days` };
    }
    return null;
  };

  const dueStatus = getDueDateStatus(task.EndDate);

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
                <span className="date-label">Created:</span> {task.CreatedAt ? formatDate(task.CreatedAt) : 'N/A'}
              </span>
              <span className="task-date">
                <span className="date-label">Start:</span> {formatDate(task.StartDate)}
              </span>
              <span className="task-date">
                <span className="date-label">End:</span> {formatDate(task.EndDate)}
              </span>
              <span className="task-assignee">Assigned to: {task.AssignedToName || task.AssignedTo}</span>
              <span className="task-client">Client: {task.Client}</span>
              {task.subtask && task.subtask.length > 0 && (
                <span>Subtasks: {task.subtask.length}</span>
              )}
            </div>
          </div>
          <div className="task-badges">
            <span className={`status-badge ${task.Status}`}>
              {task.Status.replace('-', ' ')}
            </span>
            {dueStatus && (
              <div className={`due-date-badge ${dueStatus.class}`}>
                {dueStatus.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const calculateMetrics = (tasks) => {
  console.log('Calculating metrics for tasks:', tasks);
  console.log('Task statuses:', tasks.map(task => ({
    name: task.TaskName,
    status: task.Status,
    endDate: task.EndDate
  })));

  return {
    totalProjects: tasks.length,
    pending: tasks.filter(task => task.Status === 'not-started').length,
    overdue: tasks.filter(task => {
      const endDate = new Date(task.EndDate);
      const today = new Date();
      return endDate < today && task.Status !== 'completed';
    }).length,
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
  const [isCheckingDueDates, setIsCheckingDueDates] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [activityLog, setActivityLog] = useState([]);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isUserManager, setIsUserManager] = useState(false);
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    pending: 0,
    overdue: 0,
    completed: 0
  });
  const [timeRange, setTimeRange] = useState(7);
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [uniqueAssignees, setUniqueAssignees] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [chartData, setChartData] = useState(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState({});

  useEffect(() => {
    fetchTasks().then(() => fetchActivityLog());
    
    // Subscribe to real-time task updates
    const handleTaskUpdate = async (type, data) => {
      console.log(`Real-time ${type} task:`, data);
      
      try {
        // Get the latest user data to map emails to names for real-time updates
        const usersResponse = await axios.get('/api/users');
        const userMap = {};
        usersResponse.data.forEach(user => {
          userMap[user.email] = `${user.firstname} ${user.lastname}`;
        });
        
        // Create a function to map task data
        const mapTaskData = (task) => ({
          ...task,
          AssignedTo: userMap[task.AssignedTo] || task.AssignedTo,
          AssignedBy: userMap[task.AssignedBy] || task.AssignedBy,
          Client: userMap[task.Client] || task.Client,
          subtask: task.subtask?.map(sub => ({
            ...sub,
            AssignedTo: userMap[sub.AssignedTo] || sub.AssignedTo,
            AssignedBy: userMap[sub.AssignedBy] || sub.AssignedBy
          }))
        });
        
        if (type === 'created') {
          const taskWithNames = mapTaskData(data);
          setTasks(prevTasks => {
            const updatedTasks = [...prevTasks, taskWithNames];
            setFilteredTasks(updatedTasks);
            setMetrics(calculateMetrics(updatedTasks));
            setChartData(prepareChartData(timeRange));
            return updatedTasks;
          });
        } 
        else if (type === 'updated') {
          const taskWithNames = mapTaskData(data);
          setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task => 
              task._id === data._id ? taskWithNames : task
            );
            setFilteredTasks(updatedTasks);
            setMetrics(calculateMetrics(updatedTasks));
            setChartData(prepareChartData(timeRange));
            return updatedTasks;
          });
        }
        else if (type === 'deleted') {
          setTasks(prevTasks => {
            const updatedTasks = prevTasks.filter(task => task._id !== data._id);
            setFilteredTasks(updatedTasks);
            setMetrics(calculateMetrics(updatedTasks));
            setChartData(prepareChartData(timeRange));
            return updatedTasks;
          });
        }
        
        // Refresh activity logs to get the latest entries with proper name mapping
        fetchActivityLog();
      } catch (error) {
        console.error('Error processing real-time task update:', error);
      }
    };
    
    subscribeToTaskUpdates(handleTaskUpdate);
    
    // Cleanup on component unmount
    return () => {
      unsubscribeFromTaskUpdates();
    };
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setCurrentUser(userData);
      
      // Check user role to determine permissions
      const userRole = userData.role?.toLowerCase();
      setIsUserAdmin(userRole === 'admin' || userRole === 'administrator');
      setIsUserManager(false);

      // If user is admin, trigger due date check
      if (userRole === 'admin' || userRole === 'administrator') {
        setIsCheckingDueDates(true);
        axios.post('/api/tasks/check-due-dates')
          .then(() => {
            console.log('Due date check completed');
            setIsCheckingDueDates(false);
          })
          .catch(error => {
            console.error('Error checking due dates:', error);
            setIsCheckingDueDates(false);
          });
      }
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

  useEffect(() => {
    if (tasks.length > 0) {
      const sorted = [...tasks].sort((a, b) => {
        const dateA = new Date(a.CreatedAt);
        const dateB = new Date(b.CreatedAt);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
      setFilteredTasks(sorted);
    }
  }, [tasks, sortOrder]);

  useEffect(() => {
    const handleResize = () => {
      document.body.style.display = 'none';
      document.body.offsetHeight; 
      document.body.style.display = '';
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      setChartData(prepareChartData(timeRange));
    }
  }, [tasks, timeRange]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const [tasksResponse, usersResponse] = await Promise.all([
        axios.get('/api/tasks'),
        axios.get('/api/users')
      ]);

      const userMap = {};
      usersResponse.data.forEach(user => {
        userMap[user.email] = `${user.firstname} ${user.lastname}`;
      });
      const mappedTasks = tasksResponse.data.map(task => ({
        ...task,
        AssignedTo: userMap[task.AssignedTo] || task.AssignedTo,
        AssignedBy: userMap[task.AssignedBy] || task.AssignedBy,
        Client: userMap[task.Client] || task.Client,
        subtask: task.subtask?.map(sub => ({
          ...sub,
          AssignedTo: userMap[sub.AssignedTo] || sub.AssignedTo,
          AssignedBy: userMap[sub.AssignedBy] || sub.AssignedBy
        }))
      }));

      console.log('Fetched tasks:', mappedTasks);
      setTasks(mappedTasks);
      setFilteredTasks(mappedTasks);
      const calculatedMetrics = calculateMetrics(mappedTasks);
      setMetrics(calculatedMetrics);

      const assignees = [...new Set(mappedTasks.map(task => task.AssignedTo))].filter(Boolean);
      setUniqueAssignees(assignees);

    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    try {
      // Fetch activity logs and users to map emails to names
      const [logsResponse, usersResponse] = await Promise.all([
        axios.get('/api/activity-logs/recent'),
        axios.get('/api/users')
      ]);
      
      // Create user email to name mapping
      const userMap = {};
      usersResponse.data.forEach(user => {
        userMap[user.email] = `${user.firstname} ${user.lastname}`;
      });
      
      // Map emails to names in the activity logs
      const mappedLogs = logsResponse.data.map(log => {
        // Replace changedBy email with full name if it exists in userMap
        if (log.changedBy && userMap[log.changedBy]) {
          log.changedBy = userMap[log.changedBy];
        }
        
        // If there are client emails in the log, map them to names
        if (log.newValue?.Client && userMap[log.newValue.Client]) {
          log.newValue.Client = userMap[log.newValue.Client];
        }
        
        if (log.oldValue?.Client && userMap[log.oldValue.Client]) {
          log.oldValue.Client = userMap[log.oldValue.Client];
        }
        
        return log;
      });
      
      setActivityLog(mappedLogs);
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

  const formatLabel = (date, range) => {
    const d = new Date(date);
    if (range === 1) {
      return format(d, 'h:mm a');
    } else if (range < 14) {
      return format(d, 'MM/dd');
    } else {
      return format(d, 'MM/dd');
    }
  };

  const prepareChartData = (range = 30) => {
    const lastNDays = [...Array(range)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    // For 24 hour view, we need hours not days
    const timeData = range === 1 
      ? [...Array(24)].map((_, i) => {
          const d = new Date();
          d.setHours(d.getHours() - 23 + i);
          return d.toISOString();
        })
      : lastNDays;

    const completedTasksByDate = {};
    const createdTasksByDate = {};
    const subtasksByDate = {};
    
    tasks.forEach(task => {
      const getTimeKey = (timestamp) => {
        if (!timestamp) return null;
        
        const d = new Date(timestamp);
        if (range === 1) {
          // For 24 hour view, use hourly buckets
          const hourDate = new Date(d);
          hourDate.setMinutes(0, 0, 0);
          return hourDate.toISOString();
        } else {
          // For multi-day view, use daily buckets
          return d.toISOString().split('T')[0];
        }
      };
      
      const creationDate = getTimeKey(task.CreatedAt);
      if (creationDate) {
        createdTasksByDate[creationDate] = (createdTasksByDate[creationDate] || 0) + 1;
      }
      
      if (task.Status === 'completed') {
        const completionDate = getTimeKey(task.UpdatedAt);
        if (completionDate) {
          completedTasksByDate[completionDate] = (completedTasksByDate[completionDate] || 0) + 1;
        }
      }
      
      if (task.subtask && task.subtask.length > 0) {
        if (creationDate) {
          subtasksByDate[creationDate] = (subtasksByDate[creationDate] || 0) + task.subtask.length;
        }
        
        task.subtask.forEach(subtask => {
          if (subtask.Status === 'completed') {
            const completionDate = getTimeKey(task.UpdatedAt);
            if (completionDate) {
              completedTasksByDate[completionDate] = (completedTasksByDate[completionDate] || 0) + 1;
            }
          }
        });
      }
    });

    // Pre-populate all time buckets to ensure continuous display
    const populatedTimeData = {};
    timeData.forEach(timePoint => {
      let key;
      if (range === 1) {
        const hourDate = new Date(timePoint);
        hourDate.setMinutes(0, 0, 0);
        key = hourDate.toISOString();
      } else {
        key = timePoint;
      }
      
      populatedTimeData[key] = {
        completed: completedTasksByDate[key] || 0,
        created: createdTasksByDate[key] || 0,
        subtasks: subtasksByDate[key] || 0
      };
    });

    return {
      labels: timeData.map(date => {
        const d = new Date(date);
        return formatLabel(d, range);
      }),
      datasets: [
        {
          label: 'Completed Tasks',
          data: timeData.map(date => {
            let key;
            if (range === 1) {
              const hourDate = new Date(date);
              hourDate.setMinutes(0, 0, 0);
              key = hourDate.toISOString();
            } else {
              key = date;
            }
            return populatedTimeData[key]?.completed || 0;
          }),
          borderColor: '#2e7d32', // Deep forest green
          backgroundColor: 'rgba(46, 125, 50, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#2e7d32',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
          cubicInterpolationMode: 'monotone'
        },
        {
          label: 'New Tasks',
          data: timeData.map(date => {
            let key;
            if (range === 1) {
              const hourDate = new Date(date);
              hourDate.setMinutes(0, 0, 0);
              key = hourDate.toISOString();
            } else {
              key = date;
            }
            return populatedTimeData[key]?.created || 0;
          }),
          borderColor: '#7b1fa2', // Purple (complementary to green)
          backgroundColor: 'rgba(123, 31, 162, 0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#7b1fa2',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
          cubicInterpolationMode: 'monotone'
        },
        {
          label: 'Subtasks',
          data: timeData.map(date => {
            let key;
            if (range === 1) {
              const hourDate = new Date(date);
              hourDate.setMinutes(0, 0, 0);
              key = hourDate.toISOString();
            } else {
              key = date;
            }
            return populatedTimeData[key]?.subtasks || 0;
          }),
          borderColor: '#0288d1', // Blue (triadic with green and purple)
          backgroundColor: 'rgba(2, 136, 209, 0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#0288d1',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
          cubicInterpolationMode: 'monotone'
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 100,
    onResize: function(chart, size) {
      chart.resize();
    },
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

  const handleTaskCreated = async (newTask) => {
    console.log('handleTaskCreated called with:', newTask);
    
    if (!newTask || !newTask._id) {
      console.error('Invalid task data received:', newTask);
      return;
    }

    try {
      // Fetch latest user data to map emails to names
      const usersResponse = await axios.get('/api/users');
      const userMap = {};
      usersResponse.data.forEach(user => {
        userMap[user.email] = `${user.firstname} ${user.lastname}`;
      });

      // Map emails to full names
      const taskWithNames = {
        ...newTask,
        // Map email to name if it's an email, otherwise keep the existing value
        AssignedTo: userMap[newTask.AssignedTo] || newTask.AssignedToName || newTask.AssignedTo || '',
        AssignedBy: userMap[newTask.AssignedBy] || newTask.AssignedByName || newTask.AssignedBy || 
                   (currentUser ? `${currentUser.firstname} ${currentUser.lastname}` : ''),
        Client: userMap[newTask.Client] || newTask.ClientName || newTask.Client || '',
        subtask: (newTask.subtask || []).map(sub => ({
          ...sub,
          AssignedTo: userMap[sub.AssignedTo] || sub.AssignedToName || sub.AssignedTo || ''
        }))
      };

      console.log('Adding new task to state:', taskWithNames);

      setTasks(prevTasks => {
        // Check if task already exists to avoid duplicates
        if (prevTasks.some(task => task._id === taskWithNames._id)) {
          console.log('Task already exists in state, skipping addition');
          return prevTasks;
        }
        
        const updatedTasks = [...prevTasks, taskWithNames];
        setFilteredTasks(updatedTasks);
        setMetrics(calculateMetrics(updatedTasks));
        // Update chart data immediately
        setChartData(prepareChartData(timeRange));
        return updatedTasks;
      });
      
      // Fetch the activity logs from server instead of creating client-side logs
      fetchActivityLog();
    } catch (error) {
      console.error('Error processing new task:', error);
    }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task._id === updatedTask._id ? updatedTask : task
      );
      setFilteredTasks(updatedTasks);
      setMetrics(calculateMetrics(updatedTasks));
      // Update chart data immediately
      setChartData(prepareChartData(timeRange));
      return updatedTasks;
    });
    
    // Fetch updated activity logs
    fetchActivityLog();
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
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

  const handleSortChange = (value) => {
    setSortOrder(value);
    const sorted = [...filteredTasks].sort((a, b) => {
      const dateA = new Date(a.CreatedAt);
      const dateB = new Date(b.CreatedAt);
      return value === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setFilteredTasks(sorted);
  };

  // Show edit button only if user is admin or manager
  const canEditTask = isUserAdmin || isUserManager;

  const toggleSubtaskExpansion = (subtaskId) => {
    setExpandedSubtasks(prev => ({
      ...prev,
      [subtaskId]: !prev[subtaskId]
    }));
  };

  const handleCommentAdded = useCallback(async (taskId, subtaskId) => {
    try {
      // Fetch the specific task with updated comments
      const response = await axios.get(`/api/tasks/${taskId}`);
      if (response.data) {
        // Get latest user data to map emails to names
        const usersResponse = await axios.get('/api/users');
        const userMap = {};
        usersResponse.data.forEach(user => {
          userMap[user.email] = `${user.firstname} ${user.lastname}`;
        });
        
        // Map names properly for the updated task
        const updatedTask = {
          ...response.data,
          AssignedTo: userMap[response.data.AssignedTo] || response.data.AssignedTo,
          AssignedBy: userMap[response.data.AssignedBy] || response.data.AssignedBy,
          Client: userMap[response.data.Client] || response.data.Client,
          subtask: response.data.subtask?.map(sub => ({
            ...sub,
            AssignedTo: userMap[sub.AssignedTo] || sub.AssignedTo,
            AssignedBy: userMap[sub.AssignedBy] || sub.AssignedBy
          }))
        };
        
        // Update the task in the tasks list
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === taskId ? updatedTask : task
          )
        );
        
        // Also update filtered tasks to maintain consistency
        setFilteredTasks(prevFilteredTasks => 
          prevFilteredTasks.map(task => 
            task._id === taskId ? updatedTask : task
          )
        );
        
        // Update the selected task if it's currently open
        if (selectedTask && selectedTask._id === taskId) {
          setSelectedTask(updatedTask);
        }
      }
    } catch (error) {
      console.error('Error refreshing task after comment:', error);
    }
  }, [selectedTask]);

  return (
    <div className="admin-layout">
      <SideNav />
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
              <MetricCard value={metrics.totalProjects} label="Total Projects" />
              <MetricCard value={metrics.pending} label="Pending" />
              <MetricCard value={metrics.overdue} label="Overdue" />
              <MetricCard value={metrics.completed} label="Completed" />
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
                    <option value={1}>Last 24 hours</option>
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
              </div>
              <div className="chart-container">
                <Line data={chartData || prepareChartData(timeRange)} options={chartOptions} />
              </div>
            </div>

            <div className="task-section">
              <div className="section-header">
                <h2>All Tasks</h2>
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
                      <option key={assignee} value={assignee}>
                        {assignee}
                      </option>
                    ))}
                  </select>

                  <select
                    className="filter-select"
                    value={sortOrder}
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
                <button 
                  className="add-task-btn"
                  onClick={() => setIsModalOpen(true)}
                >
                  Add Task
                </button>
              </div>

              <div className="task-list">
                {isLoading ? (
                  <div>Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                  <div>No tasks found</div>
                ) : (
                  filteredTasks.map(task => (
                    <TaskCard 
                      key={task._id} 
                      task={task} 
                      onTaskClick={setSelectedTask} 
                    />
                  ))
                )}
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
                <div className="task-modal-actions">
                  {canEditTask && (
                    <button 
                      className="task-edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(null);
                        handleEditTask(selectedTask);
                      }}
                    >
                      {isUserAdmin ? 'Edit' : 'Manage Subtasks'}
                    </button>
                  )}
                  <button className="task-modal-close" onClick={() => setSelectedTask(null)}>×</button>
                </div>
              </div>
              <div className="task-modal-content">
                <div className="task-modal-section">
                  <h3 className="task-modal-section-title">Task Details</h3>
                  <div className="task-detail-row">
                    <span className="detail-label">Task ID:</span>
                    <span className="detail-value">{selectedTask.TaskID}</span>
                  </div>
                  <div className="task-detail-row">
                    <span className="detail-label">Created Date:</span>
                    <span className="detail-value">{selectedTask.CreatedAt ? formatDate(selectedTask.CreatedAt) : 'N/A'}</span>
                  </div>
                  <div className="task-detail-row">
                    <span className="detail-label">Start Date:</span>
                    <span className="detail-value">{formatDate(selectedTask.StartDate)}</span>
                  </div>
                  <div className="task-detail-row">
                    <span className="detail-label">End Date:</span>
                    <span className="detail-value">{formatDate(selectedTask.EndDate)}</span>
                  </div>
                  <div className="task-detail-row">
                    <span className="detail-label">Assigned To:</span>
                    <span className="detail-value">{selectedTask.AssignedToName || selectedTask.AssignedTo}</span>
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
                    <span className="percentage-badge">
                      {selectedTask.percentage || 0}%
                    </span>
                  </div>
                </div>
                
                {selectedTask.subtask && selectedTask.subtask.length > 0 && (
                  <div className="task-modal-section">
                    <h3 className="task-modal-section-title">Subtasks ({selectedTask.subtask.length})</h3>
                    <div className="subtasks-list">
                      {selectedTask.subtask.map((subtask, index) => (
                        <div key={index} className={`subtask-item ${expandedSubtasks[subtask.TaskID] ? 'subtask-item-expanded' : ''}`}>
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
                            <span className="detail-value">{subtask.AssignedToName || subtask.AssignedTo}</span>
                            <button 
                              className="toggle-comments-btn"
                              onClick={() => toggleSubtaskExpansion(subtask.TaskID)}
                            >
                              {expandedSubtasks[subtask.TaskID] ? 'Hide Comments' : 'Show Comments'}
                              {!expandedSubtasks[subtask.TaskID] && (
                                <span className="comment-count">
                                  {subtask.comments && subtask.comments.length > 0 ? subtask.comments.length : '0'}
                                </span>
                              )}
                            </button>
                          </div>
                          
                          {expandedSubtasks[subtask.TaskID] && (
                            <SubtaskComments 
                              taskId={selectedTask._id} 
                              subtask={subtask} 
                              currentUser={currentUser}
                              onCommentAdded={() => handleCommentAdded(selectedTask._id, subtask.TaskID)}
                            />
                          )}
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
            onClose={handleCloseModal}
            onTaskCreated={(newTask) => {
              console.log('Task created callback received in AdminDashboard:', newTask);
              handleTaskCreated(newTask);
              // Modal is already closed in TaskModal component
            }}
            onTaskUpdated={(updatedTask) => {
              console.log('Task updated callback received in AdminDashboard:', updatedTask);
              handleTaskUpdated(updatedTask);
              // Modal is already closed in TaskModal component
            }}
            existingTask={taskToEdit}
          />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 