import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TaskModal.css';

const TaskModal = ({ isOpen, onClose, onTaskCreated }) => {
  // Get the currently logged in user from localStorage or context
  const [currentUser, setCurrentUser] = useState(null);
  const [taskData, setTaskData] = useState({
    TaskName: '',
    Description: '',
    Location: '',
    Priority: 'medium',
    Status: 'not-started',
    AssignedTo: '',
    AssignedBy: '', // This will be automatically set
    StartDate: '',
    EndDate: '',
    subtask: []
  });
  const [engineers, setEngineers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch engineers and get current user on component mount
  useEffect(() => {
    if (isOpen) {
      fetchEngineers();
      getCurrentUser();
    }
  }, [isOpen]);

  const getCurrentUser = () => {
    // Get the user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData && userData.email) {
      setCurrentUser(userData);
      // Pre-populate the AssignedBy field with the current user's email
      setTaskData(prev => ({
        ...prev,
        AssignedBy: userData.email
      }));
    }
  };

  const fetchEngineers = async () => {
    try {
      const response = await axios.get('/api/users?role=engineer');
      setEngineers(response.data);
    } catch (error) {
      console.error('Error fetching engineers:', error);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!taskData.TaskName) newErrors.TaskName = "Task name is required";
    if (!taskData.Description) newErrors.Description = "Description is required";
    if (!taskData.Location) newErrors.Location = "Location is required";
    if (!taskData.AssignedTo) newErrors.AssignedTo = "Assignee is required";
    if (!taskData.AssignedBy) newErrors.AssignedBy = "Assigner is required";
    if (!taskData.StartDate) newErrors.StartDate = "Start date is required";
    if (!taskData.EndDate) newErrors.EndDate = "End date is required";
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validate();
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const response = await axios.post('/api/tasks', taskData);
        onTaskCreated(response.data);
        onClose();
        // Reset form
        setTaskData({
          TaskName: '',
          Description: '',
          Location: '',
          Priority: 'medium',
          Status: 'not-started',
          AssignedTo: '',
          AssignedBy: '',
          StartDate: '',
          EndDate: '',
          subtask: []
        });
      } catch (error) {
        console.error('Error creating task:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">Create New Task</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Task Name</label>
              <input
                type="text"
                className={`form-input ${errors.TaskName ? 'error' : ''}`}
                value={taskData.TaskName}
                onChange={(e) => setTaskData({ ...taskData, TaskName: e.target.value })}
                placeholder="Enter task name"
              />
              {errors.TaskName && <span className="error-message">{errors.TaskName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                className={`form-input ${errors.Location ? 'error' : ''}`}
                value={taskData.Location}
                onChange={(e) => setTaskData({ ...taskData, Location: e.target.value })}
                placeholder="Enter location"
              />
              {errors.Location && <span className="error-message">{errors.Location}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className={`form-textarea ${errors.Description ? 'error' : ''}`}
              value={taskData.Description}
              onChange={(e) => setTaskData({ ...taskData, Description: e.target.value })}
              placeholder="Describe the task"
            />
            {errors.Description && <span className="error-message">{errors.Description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={taskData.Priority}
                onChange={(e) => setTaskData({ ...taskData, Priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select
                className={`form-select ${errors.AssignedTo ? 'error' : ''}`}
                value={taskData.AssignedTo}
                onChange={(e) => setTaskData({ ...taskData, AssignedTo: e.target.value })}
              >
                <option value="">Select an engineer</option>
                {engineers.map(engineer => (
                  <option key={engineer._id} value={engineer.email}>
                    {engineer.firstname} {engineer.lastname} ({engineer.email})
                  </option>
                ))}
              </select>
              {errors.AssignedTo && <span className="error-message">{errors.AssignedTo}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className={`form-input ${errors.StartDate ? 'error' : ''}`}
                value={taskData.StartDate}
                onChange={(e) => setTaskData({ ...taskData, StartDate: e.target.value })}
                placeholder="dd/mm/yyyy"
              />
              {errors.StartDate && <span className="error-message">{errors.StartDate}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                className={`form-input ${errors.EndDate ? 'error' : ''}`}
                value={taskData.EndDate}
                onChange={(e) => setTaskData({ ...taskData, EndDate: e.target.value })}
                placeholder="dd/mm/yyyy"
              />
              {errors.EndDate && <span className="error-message">{errors.EndDate}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned By</label>
            <input
              type="text"
              className={`form-input ${errors.AssignedBy ? 'error' : ''}`}
              value={taskData.AssignedBy}
              onChange={(e) => setTaskData({ ...taskData, AssignedBy: e.target.value })}
              placeholder="Enter assigner's email"
              readOnly
            />
            {errors.AssignedBy && <span className="error-message">{errors.AssignedBy}</span>}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal; 