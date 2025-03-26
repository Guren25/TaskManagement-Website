import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TaskModal.css';

const TaskModal = ({ isOpen, onClose, onTaskCreated }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [taskData, setTaskData] = useState({
    TaskName: '',
    Description: '',
    Location: '',
    Priority: 'medium',
    Status: 'not-started',
    AssignedTo: '',
    AssignedBy: '', 
    StartDate: '',
    EndDate: '',
    subtask: [],
    Client: ''
  });
  const [engineers, setEngineers] = useState([]);
  const [clients, setClients] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSubtaskSection, setShowSubtaskSection] = useState(false);
  const [subtasks, setSubtasks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchEngineers();
      fetchClients();
      getCurrentUser();
    }
  }, [isOpen]);

  useEffect(() => {
    console.log('Current taskData:', taskData);
    console.log('Current subtasks:', subtasks);
  }, [taskData, subtasks]);

  const getCurrentUser = () => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setCurrentUser(userData);
      const fullName = userData.middlename 
        ? `${userData.firstname} ${userData.middlename} ${userData.lastname}`
        : `${userData.firstname} ${userData.lastname}`;
        
      setTaskData(prev => ({
        ...prev,
        AssignedTo: userData.email,
        AssignedToName: fullName,
        AssignedBy: userData.email,
        AssignedByName: fullName
      }));
    }
  };

  const fetchEngineers = async () => {
    try {
      const response = await axios.get('/api/users?role=engineer');
      const formattedEngineers = response.data.map(engineer => ({
        ...engineer,
        fullName: `${engineer.firstname} ${engineer.lastname}`
      }));
      setEngineers(formattedEngineers);
    } catch (error) {
      console.error('Error fetching engineers:', error);
    }
  };
  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/users?role=client');
      const formattedClients = response.data.map(client => ({
        ...client,
        fullName: `${client.firstname} ${client.lastname}`
      }));
      setClients(formattedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!taskData.TaskName) newErrors.TaskName = "Task name is required";
    if (!taskData.Description) newErrors.Description = "Description is required";
    if (!taskData.Location) newErrors.Location = "Location is required";
    if (!taskData.AssignedTo) newErrors.AssignedTo = "Assignee is required";
    if (!taskData.Client) newErrors.Client = "Client is required";
    if (!taskData.AssignedBy) newErrors.AssignedBy = "Assigner is required";
    if (!taskData.StartDate) newErrors.StartDate = "Start date is required";
    if (!taskData.EndDate) newErrors.EndDate = "End date is required";
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }

      const formattedStartDate = new Date(taskData.StartDate).toISOString();
      const formattedEndDate = new Date(taskData.EndDate).toISOString();
      const taskDataToSubmit = {
        TaskName: taskData.TaskName,
        Description: taskData.Description,
        Location: taskData.Location,
        Priority: taskData.Priority,
        Status: 'not-started',
        AssignedTo: taskData.AssignedTo,
        AssignedBy: taskData.AssignedBy,
        Client: taskData.Client,
        StartDate: formattedStartDate,
        EndDate: formattedEndDate,
        subtask: subtasks.map(subtask => ({
          TaskName: subtask.TaskName,
          Priority: subtask.Priority || 'medium',
          AssignedTo: subtask.AssignedTo,
          Status: 'not-started'
        })).filter(subtask => subtask.TaskName && subtask.AssignedTo) 
      };
      console.log('Submitting task data:', taskDataToSubmit);

      const response = await axios.post('/api/tasks', taskDataToSubmit)
        .catch(error => {
          console.error('Detailed error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            data: taskDataToSubmit
          });
          throw error;
        });
      
      if (response.data) {
        onTaskCreated(response.data);
        onClose();
      
        setTaskData({
          TaskName: '',
          Description: '',
          Location: '',
          Priority: 'medium',
          Status: 'not-started',
          AssignedTo: '',
          AssignedBy: currentUser?.email || '',
          StartDate: '',
          EndDate: '',
          subtask: [],
          Client: ''
        });
        setSubtasks([]);
        setErrors({});
      }
    } catch (error) {
      console.error('Error creating task:', error);
      if (error.response) {
        console.error('Server error response:', error.response.data);
      }
      setErrors({ 
        submit: error.response?.data?.message || 'Failed to create task. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubtask = () => {
    setSubtasks([
      ...subtasks,
      {
        TaskName: '',
        Priority: 'medium',
        AssignedTo: '',
        Status: 'not-started'
      }
    ]);
  };

  const handleRemoveSubtask = (index) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="admin-task-modal-overlay">
      <div className="admin-task-modal">
        <div className="admin-task-modal-header">
          <h2 className="admin-task-modal-title">Create New Task</h2>
          <button className="admin-task-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-task-modal-form">
          <div className="admin-task-modal-content">
            <div className="main-task-column">
              <h3 className="column-title">Main Task Details</h3>
              <div className="admin-task-form-group">
                <label className="admin-task-form-label">Task Name</label>
                <input
                  type="text"
                  className={`admin-task-form-input ${errors.TaskName ? 'error' : ''}`}
                  value={taskData.TaskName}
                  onChange={(e) => setTaskData({ ...taskData, TaskName: e.target.value })}
                  placeholder="Enter task name"
                />
                {errors.TaskName && <span className="admin-task-error-message">{errors.TaskName}</span>}
              </div>

              <div className="admin-task-form-group">
                <label className="admin-task-form-label">Location</label>
                <input
                  type="text"
                  className={`admin-task-form-input ${errors.Location ? 'error' : ''}`}
                  value={taskData.Location}
                  onChange={(e) => setTaskData({ ...taskData, Location: e.target.value })}
                  placeholder="Enter location"
                />
                {errors.Location && <span className="admin-task-error-message">{errors.Location}</span>}
              </div>

              <div className="admin-task-form-group">
                <label className="admin-task-form-label">Description</label>
                <textarea
                  className={`admin-task-form-textarea ${errors.Description ? 'error' : ''}`}
                  value={taskData.Description}
                  onChange={(e) => setTaskData({ ...taskData, Description: e.target.value })}
                  placeholder="Describe the task"
                />
                {errors.Description && <span className="admin-task-error-message">{errors.Description}</span>}
              </div>

              <div className="admin-task-form-row">
                <div className="admin-task-form-group">
                  <label className="admin-task-form-label">Priority</label>
                  <select
                    className={`admin-task-form-select ${errors.Priority ? 'error' : ''}`}
                    value={taskData.Priority}
                    onChange={(e) => setTaskData({ ...taskData, Priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="admin-task-form-group">
                  <label className="admin-task-form-label">Assigned To</label>
                  <select
                    className={`admin-task-form-select ${errors.AssignedTo ? 'error' : ''}`}
                    value={taskData.AssignedTo}
                    onChange={(e) => setTaskData({ ...taskData, AssignedTo: e.target.value })}
                  >
                    <option value="">Select an engineer</option>
                    {engineers.length > 0 ? (
                      engineers.map(engineer => (
                        <option key={engineer._id} value={engineer.email}>
                          {engineer.fullName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No engineers available</option>
                    )}
                  </select>
                  {errors.AssignedTo && <span className="admin-task-error-message">{errors.AssignedTo}</span>}
                  {engineers.length === 0 && <span className="admin-task-error-message">No engineers found</span>}
                </div>
              </div>
              <div className="admin-task-form-row">
                <div className="admin-task-form-group">
                  <label className="admin-task-form-label">Client</label>
                  <select
                    className={`admin-task-form-select ${errors.Client ? 'error' : ''}`}
                    value={taskData.Client}
                    onChange={(e) => setTaskData({ ...taskData, Client: e.target.value })}
                  >
                    <option value="">Select a client</option>
                    {clients.length > 0 ? (
                      clients.map(client => (
                        <option key={client._id} value={client.email}>
                          {client.fullName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No clients available</option>
                    )}
                  </select>
                  {errors.Client && <span className="admin-task-error-message">{errors.Client}</span>}
                  {clients.length === 0 && <span className="admin-task-error-message">No clients found</span>}
                </div>
                
                <div className="admin-task-form-group">
                  <label className="admin-task-form-label">Assigned by</label>
                  <input
                    type="text"
                    className={`admin-task-form-input ${errors.AssignedBy ? 'error' : ''}`}
                    value={taskData.AssignedBy}
                    onChange={(e) => setTaskData({ ...taskData, AssignedBy: e.target.value })}
                    readOnly 
                  />
                </div>
              </div>

              <div className="admin-task-form-row">
                <div className="admin-task-form-group">
                  <label className="admin-task-form-label">Start Date</label>
                  <input
                    type="date"
                    className={`admin-task-form-input ${errors.StartDate ? 'error' : ''}`}
                    value={taskData.StartDate}
                    onChange={(e) => setTaskData({ ...taskData, StartDate: e.target.value })}
                    placeholder="dd/mm/yyyy"
                  />
                  {errors.StartDate && <span className="admin-task-error-message">{errors.StartDate}</span>}
                </div>  
                <div className="admin-task-form-group">
                  <label className="admin-task-form-label">End Date</label>
                  <input
                    type="date"
                    className={`admin-task-form-input ${errors.EndDate ? 'error' : ''}`}
                    value={taskData.EndDate}
                    onChange={(e) => setTaskData({ ...taskData, EndDate: e.target.value })}
                    placeholder="dd/mm/yyyy"
                  />
                  {errors.EndDate && <span className="admin-task-error-message">{errors.EndDate}</span>}
                </div>
              </div>
            </div>
            <div className="subtasks-column">
              <h3 className="column-title">Subtasks</h3>
              <div className="subtasks-container">
                {subtasks.map((subtask, index) => (
                  <div key={index} className="subtask-form-item">
                    <div className="subtask-header">
                      <span>Subtask #{index + 1}</span>
                      <button 
                        type="button" 
                        className="remove-subtask-btn"
                        onClick={() => handleRemoveSubtask(index)}
                      >
                        &times;
                      </button>
                    </div>
                    <input
                      type="text"
                      className="admin-task-form-input"
                      placeholder="Subtask name"
                      value={subtask.TaskName}
                      onChange={(e) => {
                        const newSubtasks = [...subtasks];
                        newSubtasks[index].TaskName = e.target.value;
                        setSubtasks(newSubtasks);
                      }}
                    />
                    <div className="subtask-form-row">
                      <select
                        className="admin-task-form-select"
                        value={subtask.Priority}
                        onChange={(e) => {
                          const newSubtasks = [...subtasks];
                          newSubtasks[index].Priority = e.target.value;
                          setSubtasks(newSubtasks);
                        }}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <select
                        className="admin-task-form-select"
                        value={subtask.AssignedTo}
                        onChange={(e) => {
                          const newSubtasks = [...subtasks];
                          newSubtasks[index].AssignedTo = e.target.value;
                          setSubtasks(newSubtasks);
                        }}
                      >
                        <option value="">Select Engineer</option>
                        {engineers.map((engineer) => (
                          <option key={engineer.email} value={engineer.email}>
                            {engineer.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
                <button 
                  type="button"
                  className="add-subtask-btn"
                  onClick={handleAddSubtask}
                >
                  + Add Subtask
                </button>
              </div>
            </div>
          </div>

          <div className="admin-task-modal-footer">
            <button type="button" onClick={onClose} className="admin-task-btn admin-task-btn-cancel">
              Cancel
            </button>
            <button type="submit" className="admin-task-btn admin-task-btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal; 