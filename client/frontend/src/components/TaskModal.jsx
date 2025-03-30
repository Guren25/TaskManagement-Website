import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TaskModal.css';

const TaskModal = ({ isOpen, onClose, onTaskCreated, onTaskUpdated, existingTask }) => {
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
    Client: '',
    ClientName: ''
  });
  const [engineers, setEngineers] = useState([]);
  const [clients, setClients] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSubtaskSection, setShowSubtaskSection] = useState(false);
  const [subtasks, setSubtasks] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEngineers();
      fetchClients();
      getCurrentUser();
      
      if (existingTask) {
        setIsEditMode(true);
        console.log('Loading existing task:', existingTask);
        
        // Format dates to YYYY-MM-DD for input fields
        const formattedStartDate = new Date(existingTask.StartDate).toISOString().split('T')[0];
        const formattedEndDate = new Date(existingTask.EndDate).toISOString().split('T')[0];
        
        // Create a properly formatted task object
        const formattedTask = {
          ...existingTask,
          StartDate: formattedStartDate,
          EndDate: formattedEndDate,
          // Ensure these fields exist and have default values
          AssignedTo: existingTask.AssignedTo || '',
          AssignedToName: existingTask.AssignedToName || existingTask.AssignedTo || '',
          Client: existingTask.Client || '',
          ClientName: existingTask.ClientName || existingTask.Client || '',
          Priority: existingTask.Priority || 'medium',
          Status: existingTask.Status || 'not-started'
        };
        
        console.log('Formatted task data:', formattedTask);
        setTaskData(formattedTask);
        
        if (existingTask.subtask && existingTask.subtask.length > 0) {
          // Ensure all subtask data is properly formatted
          const formattedSubtasks = existingTask.subtask.map(subtask => ({
            ...subtask,
            _id: subtask._id || `temp-${Math.random().toString(36).substring(2, 9)}`,
            TaskName: subtask.TaskName || '',
            Priority: subtask.Priority || 'medium',
            AssignedTo: subtask.AssignedTo || '',
            AssignedToName: subtask.AssignedToName || subtask.AssignedTo || '',
            Status: subtask.Status || 'not-started'
          }));
          console.log('Loading subtasks:', formattedSubtasks);
          setSubtasks(formattedSubtasks);
        } else {
          setSubtasks([]);
        }
      } else {
        setIsEditMode(false);
        resetForm();
      }
    }
  }, [isOpen, existingTask]);

  const resetForm = () => {
    setTaskData({
      TaskName: '',
      Description: '',
      Location: '',
      Priority: 'medium',
      Status: 'not-started',
      AssignedTo: '',
      AssignedToName: '',
      AssignedBy: currentUser?.email || '',
      AssignedByName: currentUser ? `${currentUser.firstname} ${currentUser.lastname}` : '',
      StartDate: '',
      EndDate: '',
      subtask: [],
      Client: '',
      ClientName: ''
    });
    setSubtasks([]);
    setErrors({});
  };

  useEffect(() => {
    console.log('Current taskData:', taskData);
    console.log('Current subtasks:', subtasks);
  }, [taskData, subtasks]);
  
  // Update subtask engineer names when engineers are loaded
  useEffect(() => {
    if (engineers.length > 0 && subtasks.length > 0) {
      const updatedSubtasks = subtasks.map(subtask => {
        if (subtask.AssignedTo) {
          // Find the engineer to get their name
          const engineer = engineers.find(eng => eng.email === subtask.AssignedTo);
          if (engineer) {
            return {
              ...subtask,
              AssignedToName: engineer.fullName
            };
          }
        }
        return subtask;
      });
      setSubtasks(updatedSubtasks);
    }
  }, [engineers, subtasks.length]);

  // Fill in client and engineer information when they're loaded
  useEffect(() => {
    if ((engineers.length > 0 || clients.length > 0) && taskData) {
      console.log('Updating task data with engineer/client info, current data:', taskData);
      let updatedTaskData = { ...taskData };
      let updated = false;

      // Match engineer data
      if (engineers.length > 0 && taskData.AssignedTo) {
        console.log('Looking for engineer match for:', taskData.AssignedTo);
        console.log('Available engineers:', engineers.map(e => ({email: e.email, name: e.fullName})));
        
        const engineer = engineers.find(eng => 
          eng.email === taskData.AssignedTo || 
          eng.fullName === taskData.AssignedTo ||
          eng.email === taskData.AssignedToName || 
          eng.fullName === taskData.AssignedToName
        );
        
        if (engineer) {
          console.log('Found engineer match:', engineer);
          updatedTaskData = {
            ...updatedTaskData,
            AssignedTo: engineer.email,
            AssignedToName: engineer.fullName
          };
          updated = true;
        }
      }

      // Match client data
      if (clients.length > 0 && taskData.Client) {
        console.log('Looking for client match for:', taskData.Client);
        console.log('Available clients:', clients.map(c => ({email: c.email, name: c.fullName})));
        
        const client = clients.find(c => 
          c.email === taskData.Client || 
          c.fullName === taskData.Client ||
          c.email === taskData.ClientName || 
          c.fullName === taskData.ClientName
        );
        
        if (client) {
          console.log('Found client match:', client);
          updatedTaskData = {
            ...updatedTaskData,
            Client: client.email,
            ClientName: client.fullName
          };
          updated = true;
        }
      }

      if (updated) {
        console.log('Updated task data:', updatedTaskData);
        setTaskData(updatedTaskData);
      }
    }
  }, [engineers, clients, taskData?.AssignedTo, taskData?.Client]);
  
  // Update subtask engineer assignments when engineers are loaded
  useEffect(() => {
    if (engineers.length > 0 && subtasks.length > 0) {
      console.log('Updating subtask engineer info, current subtasks:', subtasks);
      console.log('Available engineers:', engineers.map(e => ({email: e.email, name: e.fullName})));
      
      const updatedSubtasks = subtasks.map(subtask => {
        if (subtask.AssignedTo) {
          // Find the engineer to get their name
          const engineer = engineers.find(eng => 
            eng.email === subtask.AssignedTo || 
            eng.fullName === subtask.AssignedTo ||
            eng.email === subtask.AssignedToName || 
            eng.fullName === subtask.AssignedToName
          );
          
          if (engineer) {
            console.log(`Found engineer match for subtask: ${subtask.TaskName}`, engineer);
            return {
              ...subtask,
              AssignedTo: engineer.email,
              AssignedToName: engineer.fullName
            };
          }
        }
        return subtask;
      });
      
      console.log('Updated subtasks:', updatedSubtasks);
      setSubtasks(updatedSubtasks);
    }
  }, [engineers, subtasks.length]);

  const getCurrentUser = () => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setCurrentUser(userData);
      
      // Check if user is admin or manager
      const userRole = userData.role?.toLowerCase();
      setIsAdmin(userRole === 'admin' || userRole === 'administrator');
      
      const fullName = userData.middlename 
        ? `${userData.firstname} ${userData.middlename} ${userData.lastname}`
        : `${userData.firstname} ${userData.lastname}`;
      
      // Always set AssignedBy to current user - ensure it's set immediately
      setTaskData(prev => ({
        ...prev,
        AssignedBy: userData.email || '',
        AssignedByName: fullName || ''
      }));
    } else {
      console.error('No user data found in localStorage');
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
    
    // Use currentUser as fallback for AssignedBy if it's missing
    if (!taskData.AssignedBy && !currentUser?.email) {
      newErrors.AssignedBy = "Assigner is required";
    } else if (!taskData.AssignedBy && currentUser?.email) {
      // Auto-fix the AssignedBy field
      console.log('Auto-fixing missing AssignedBy with current user data');
      setTaskData(prev => ({
        ...prev,
        AssignedBy: currentUser.email,
        AssignedByName: `${currentUser.firstname} ${currentUser.lastname}`
      }));
    }
    
    if (!taskData.StartDate) newErrors.StartDate = "Start date is required";
    if (!taskData.EndDate) newErrors.EndDate = "End date is required";
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    console.log('Submit button clicked, beginning form submission...');

    try {
      // For non-admin users in edit mode, only update subtasks
      if (isEditMode && !isAdmin) {
        // Only update the subtasks while preserving the original task data
        const updatedTaskData = {
          ...existingTask,
          subtask: subtasks.map(subtask => {
            const formattedSubtask = {
              ...subtask,
              TaskName: subtask.TaskName || '',
              Priority: subtask.Priority || 'medium',
              AssignedTo: subtask.AssignedTo || '',
              Status: subtask.Status || 'not-started'
            };
            // Remove any temporary properties that shouldn't be sent to the server
            delete formattedSubtask.tempId;
            return formattedSubtask;
          }).filter(subtask => subtask.TaskName && subtask.AssignedTo),
          ChangedBy: currentUser?.email || taskData.AssignedBy
        };
        
        console.log('Submitting updated task with subtasks:', updatedTaskData);
        
        const response = await axios.put(`/api/tasks/${existingTask._id}`, updatedTaskData)
          .catch(error => {
            console.error('Detailed error:', {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              data: updatedTaskData
            });
            throw error;
          });
          
        if (response.data) {
          console.log('Task updated successfully:', response.data);
          onTaskUpdated(response.data);
          onClose();
          resetForm();
        }
        
        setIsSubmitting(false);
        return;
      }
      
      // Ensure user data is set properly before validation
      if (currentUser && !taskData.AssignedBy) {
        console.log('Setting AssignedBy field before validation');
        setTaskData(prev => ({
          ...prev,
          AssignedBy: currentUser.email,
          AssignedByName: `${currentUser.firstname} ${currentUser.lastname}`
        }));
      }
      
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        console.log('Validation errors:', validationErrors);
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }

      // Complete form data with current user info if missing
      const completeTaskData = {
        ...taskData,
        AssignedBy: taskData.AssignedBy || (currentUser ? currentUser.email : ''),
        AssignedByName: taskData.AssignedByName || (currentUser ? `${currentUser.firstname} ${currentUser.lastname}` : '')
      };

      const formattedStartDate = new Date(completeTaskData.StartDate).toISOString();
      const formattedEndDate = new Date(completeTaskData.EndDate).toISOString();
      const taskDataToSubmit = {
        TaskName: completeTaskData.TaskName,
        Description: completeTaskData.Description,
        Location: completeTaskData.Location,
        Priority: completeTaskData.Priority,
        Status: completeTaskData.Status || 'not-started',
        AssignedTo: completeTaskData.AssignedTo,
        AssignedBy: completeTaskData.AssignedBy,
        Client: completeTaskData.Client,
        StartDate: formattedStartDate,
        EndDate: formattedEndDate,
        subtask: subtasks.map(subtask => ({
          ...subtask,
          TaskName: subtask.TaskName,
          Priority: subtask.Priority || 'medium',
          AssignedTo: subtask.AssignedTo,
          Status: subtask.Status || 'not-started'
        })).filter(subtask => subtask.TaskName && subtask.AssignedTo) 
      };
      console.log('Submitting task data:', taskDataToSubmit);

      let response;
      if (isEditMode) {
        // Add ChangedBy field for activity log
        taskDataToSubmit.ChangedBy = currentUser?.email || taskData.AssignedBy;
        
        console.log('Sending PUT request to update task...');
        response = await axios.put(`/api/tasks/${taskData._id}`, taskDataToSubmit)
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
          console.log('Task updated successfully:', response.data);
          onTaskUpdated(response.data);
          onClose();
          resetForm();
        }
      } else {
        console.log('Sending POST request to create task...');
        try {
          response = await axios.post('/api/tasks', taskDataToSubmit);
          console.log('POST request successful, response:', response);
          
          if (response && response.data) {
            console.log('Task created successfully:', response.data);
            // Call onTaskCreated callback with the response data
            onTaskCreated(response.data);
            // Close the modal and reset the form
            onClose();
            resetForm();
          } else {
            console.error('No response data received after creating task');
            setErrors({ submit: 'Server returned empty response' });
          }
        } catch (error) {
          console.error('Error creating task:', error);
          console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            data: taskDataToSubmit
          });
          
          setErrors({ 
            submit: error.response?.data?.message || 'Failed to create task. Please try again.' 
          });
          throw error;
        }
      }
    } catch (error) {
      console.error('Error with task:', error);
      if (error.response) {
        console.error('Server error response:', error.response.data);
      }
      setErrors({ 
        submit: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} task. Please try again.` 
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

  // Log the values of engineers and clients when they are loaded
  useEffect(() => {
    if (engineers.length > 0) {
      console.log('Engineers loaded:', engineers);
    }
  }, [engineers]);

  useEffect(() => {
    if (clients.length > 0) {
      console.log('Clients loaded:', clients);
    }
  }, [clients]);

  useEffect(() => {
    console.log('Task modal opened, getting current user');
    getCurrentUser();
  }, []);

  // Make sure AssignedBy is always set
  useEffect(() => {
    if (!taskData.AssignedBy && currentUser) {
      console.log('Setting missing AssignedBy field from currentUser');
      setTaskData(prev => ({
        ...prev,
        AssignedBy: currentUser.email || '',
        AssignedByName: currentUser.firstname + ' ' + currentUser.lastname
      }));
    }
  }, [currentUser, taskData.AssignedBy]);

  if (!isOpen) return null;

  return (
    <div className="admin-task-modal-overlay">
      <div className="admin-task-modal">
        <div className="admin-task-modal-header">
          <h2 className="admin-task-modal-title">
            {isEditMode 
              ? (isAdmin ? 'Edit Task' : 'Manage Subtasks') 
              : 'Create New Task'
            }
          </h2>
          <button className="admin-task-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-task-modal-form">
          <div className="admin-task-modal-content">
            <div className={`main-task-column ${isEditMode && !isAdmin ? 'readonly' : ''}`}>
              <h3 className={`column-title ${isEditMode && !isAdmin ? 'readonly' : ''}`}>Main Task Details</h3>
              <div className="admin-task-form-group">
                <label className="admin-task-form-label">Task Name</label>
                <input
                  type="text"
                  className={`admin-task-form-input ${errors.TaskName ? 'error' : ''}`}
                  value={taskData.TaskName}
                  onChange={(e) => setTaskData({ ...taskData, TaskName: e.target.value })}
                  placeholder="Enter task name"
                  readOnly={isEditMode && !isAdmin}
                  disabled={isEditMode && !isAdmin}
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
                  readOnly={isEditMode && !isAdmin}
                  disabled={isEditMode && !isAdmin}
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
                  readOnly={isEditMode && !isAdmin}
                  disabled={isEditMode && !isAdmin}
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
                    disabled={isEditMode && !isAdmin}
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
                    value={taskData.AssignedTo || ""}
                    onChange={(e) => {
                      const engineer = engineers.find(eng => eng.email === e.target.value);
                      setTaskData({ 
                        ...taskData, 
                        AssignedTo: e.target.value,
                        AssignedToName: engineer ? engineer.fullName : '' 
                      });
                      console.log(`Updated main task assigned to:`, engineer?.fullName || 'none');
                    }}
                    disabled={isEditMode}
                  >
                    <option value="">
                      {taskData.AssignedToName ? `Currently: ${taskData.AssignedToName}` : 'Select an engineer'}
                    </option>
                    {engineers.length > 0 ? (
                      engineers.map(engineer => (
                        <option 
                          key={engineer._id} 
                          value={engineer.email}
                        >
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
                  <label className="admin-task-form-label">Assigned by</label>
                  <select
                    className="admin-task-form-select"
                    disabled={true}
                  >
                    <option>{currentUser ? `${currentUser.firstname} ${currentUser.lastname}` : 'Current User'}</option>
                  </select>
                </div>
                
                <div className="admin-task-form-group">
                  <label className="admin-task-form-label">Client</label>
                  <select
                    className={`admin-task-form-select ${errors.Client ? 'error' : ''}`}
                    value={taskData.Client || ""}
                    onChange={(e) => {
                      const client = clients.find(c => c.email === e.target.value);
                      setTaskData({ 
                        ...taskData, 
                        Client: e.target.value,
                        ClientName: client ? client.fullName : '' 
                      });
                      console.log(`Updated main task client to:`, client?.fullName || 'none');
                    }}
                    disabled={isEditMode && !isAdmin}
                  >
                    <option value="">
                      {taskData.ClientName ? `Currently: ${taskData.ClientName}` : 'Select a client'}
                    </option>
                    {clients.length > 0 ? (
                      clients.map(client => (
                        <option 
                          key={client._id} 
                          value={client.email}
                        >
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
                    readOnly={isEditMode && !isAdmin}
                    disabled={isEditMode && !isAdmin}
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
                    readOnly={isEditMode && !isAdmin}
                    disabled={isEditMode && !isAdmin}
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
                      value={subtask.TaskName || ''}
                      onChange={(e) => {
                        const newSubtasks = [...subtasks];
                        newSubtasks[index].TaskName = e.target.value;
                        setSubtasks(newSubtasks);
                      }}
                    />
                    <div className="subtask-form-row">
                      <select
                        className="admin-task-form-select"
                        value={subtask.Priority || 'medium'}
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
                        value={subtask.AssignedTo || ''}
                        onChange={(e) => {
                          const newSubtasks = [...subtasks];
                          const engineer = engineers.find(eng => eng.email === e.target.value);
                          
                          newSubtasks[index] = {
                            ...newSubtasks[index],
                            AssignedTo: e.target.value,
                            AssignedToName: engineer ? engineer.fullName : '',
                            Status: newSubtasks[index].Status || 'not-started'
                          };
                          
                          setSubtasks(newSubtasks);
                          console.log(`Updated subtask ${index} with engineer:`, engineer?.fullName || 'none'); 
                        }}
                      >
                        <option value="">
                          {subtask.AssignedToName ? `Currently: ${subtask.AssignedToName}` : 'Select Engineer'}
                        </option>
                        {engineers.map((engineer) => (
                          <option 
                            key={engineer.email} 
                            value={engineer.email}
                          >
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
            <button type="button" onClick={onClose} className="admin-task-btn admin-task-btn-cancel" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={`admin-task-btn admin-task-btn-submit ${isSubmitting ? 'submitting' : ''}`} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="task-spinner-icon"></span>
                  {isEditMode 
                    ? (isAdmin ? 'Updating...' : 'Saving Subtasks...') 
                    : 'Creating...'
                  }
                </>
              ) : (
                isEditMode 
                  ? (isAdmin ? 'Update Task' : 'Save Subtasks')
                  : 'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal; 