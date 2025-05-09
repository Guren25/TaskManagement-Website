const Task = require('../models/Task');
const { sendTaskAssignmentEmail, sendSubtaskAssignmentEmail, sendDueDateEmail, sendSubtaskDueDateEmail, sendTaskReassignmentEmail } = require('../utils/emailService');
const ActivityLog = require('../models/ActivityLog');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const calculateTaskPercentage = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return 0;
    
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(subtask => subtask.Status === 'completed').length;
    return Math.round((completedSubtasks / totalSubtasks) * 100);
};

const areCommentsEnabled = (task) => {
    const currentDate = new Date();
    const startDate = new Date(task.StartDate);
    return currentDate >= startDate;
};

const addCommentsEnabledFlag = (task) => {
    const taskObj = task.toObject ? task.toObject() : { ...task };
    taskObj.commentsEnabled = areCommentsEnabled(task);
    if (taskObj.subtask) {
        taskObj.subtask = taskObj.subtask.map(subtask => ({
            ...subtask,
            commentsEnabled: taskObj.commentsEnabled
        }));
    }
    return taskObj;
};

const checkDueDates = async () => {
  try {
    const tasks = await Task.find({ Status: { $ne: 'completed' } });
    console.log(`Checking ${tasks.length} uncompleted tasks for due dates...`);

    const now = new Date();
    console.log('Current time:', now);

    for (const task of tasks) {
      const endDate = new Date(task.EndDate);
      const daysUntilDue = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
      
      console.log(`Task "${task.TaskName}":`, {
        endDate,
        daysUntilDue,
        taskStatus: task.Status
      });

      if (daysUntilDue <= 0 || daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 1) {
        console.log(`Sending notification for task "${task.TaskName}" (${daysUntilDue} days)`);
        
        const notification = new ActivityLog({
          logID: uuidv4(),
          taskID: task._id,
          changedBy: 'system',
          changeType: 'Updated',
          newValue: {
            type: 'due_date_notification',
            message: daysUntilDue < 0 
              ? `Task "${task.TaskName}" is overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? 's' : ''}`
              : daysUntilDue === 0
                ? `Task "${task.TaskName}" is due today!`
                : `Task "${task.TaskName}" is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
            daysRemaining: daysUntilDue
          },
          timestamp: new Date()
        });
        await notification.save();

        try {
          // Send email to main task assignee
          await sendDueDateEmail(task.AssignedTo, {
            ...task.toObject(),
            daysRemaining: daysUntilDue
          });
          console.log(`Email notification sent for task "${task.TaskName}"`);
          
          // Send email to each subtask assignee
          if (task.subtask && task.subtask.length > 0) {
            const taskWithDaysRemaining = {
              ...task.toObject(),
              daysRemaining: daysUntilDue
            };
            
            // Track emails already sent to avoid duplicates
            const emailsSent = new Set([task.AssignedTo.toLowerCase()]);
            
            for (const subtask of task.subtask) {
              // Skip if email already sent to this assignee or if subtask is completed
              if (subtask.Status === 'completed' || 
                  !subtask.AssignedTo || 
                  emailsSent.has(subtask.AssignedTo.toLowerCase())) {
                continue;
              }
              
              await sendSubtaskDueDateEmail(subtask.AssignedTo, taskWithDaysRemaining, subtask);
              emailsSent.add(subtask.AssignedTo.toLowerCase());
              console.log(`Subtask email notification sent for "${subtask.TaskName}" to ${subtask.AssignedTo}`);
            }
          }
        } catch (emailError) {
          console.error(`Error sending email for task "${task.TaskName}":`, emailError);
        }
      }
    }
  } catch (error) {
    console.error('Error checking due dates:', error);
    throw error;
  }
};

const taskController = {
    getAllTasks: async (req, res) => {
        try {
            const tasks = await Task.find();
            const tasksWithPercentage = tasks.map(task => {
                const taskObj = addCommentsEnabledFlag(task);
                taskObj.percentage = calculateTaskPercentage(taskObj.subtask);
                return taskObj;
            });
            res.status(200).json(tasksWithPercentage);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks", error: error.message });
        }
    },

    getTaskByID: async (req, res) => {
        try {
            const task = await Task.findById(req.params.id);
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }
            const taskObj = addCommentsEnabledFlag(task);
            taskObj.percentage = calculateTaskPercentage(taskObj.subtask);
            res.status(200).json(taskObj);
        } catch (error) {
            res.status(500).json({ message: "Error fetching task", error: error.message });
        }
    },

    createTask: async (req, res) => {
        try {
            const { TaskName, Description, Location, Priority, Status, AssignedTo, AssignedBy, StartDate, EndDate, Client, subtask } = req.body;
            if (subtask && subtask.length > 0) {
                subtask.forEach(sub => {
                    if (!sub.Priority) {
                        sub.Priority = 'low';
                    }
                });
            }
            
            const task = new Task({ 
                TaskName, 
                Description, 
                Location, 
                Priority, 
                Status, 
                AssignedTo, 
                AssignedBy, 
                Client,
                StartDate, 
                EndDate, 
                subtask
            });
            const savedTask = await task.save();
            
            const activityLog = new ActivityLog({
                logID: uuidv4(),
                taskID: savedTask._id,
                changedBy: req.body.AssignedBy,
                changeType: 'Created',
                newValue: savedTask,
                timestamp: new Date()
            });
            await activityLog.save();
            
            try {
                await sendTaskAssignmentEmail(task.AssignedTo, task);
                
                if (task.subtask && task.subtask.length > 0) {
                    for (const subtask of task.subtask) {
                        await sendSubtaskAssignmentEmail(subtask.AssignedTo, task, subtask);
                    }
                }
            } catch (emailError) {
                console.error('Error sending email notification:', emailError);
            }

            // Emit socket event for task creation
            const io = req.app.get('io');
            if (io) {
                io.emit('taskCreated', savedTask);
                console.log('Socket event emitted: taskCreated');
            } else {
                console.log('No socket instance found on app');
            }

            res.status(201).json(savedTask);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    updateTask: async (req, res) => {
        try {
            const oldTask = await Task.findById(req.params.id);
            const updateData = req.body;
            
            // Array to store all activity logs
            const activityLogs = [];
            
            if (updateData.subtask) {
                updateData.percentage = calculateTaskPercentage(updateData.subtask);
                
                // Check for new or modified subtasks
                const oldSubtasks = oldTask.subtask || [];
                const newSubtasks = updateData.subtask;
                
                // Find new subtasks - update the logic to properly identify new subtasks
                const newSubtaskAssignments = newSubtasks.filter(newSubtask => {
                    // Check if this subtask exists in oldSubtasks
                    const existingSubtask = oldSubtasks.find(old => 
                        // Compare by TaskID if it exists, otherwise by TaskName and AssignedTo
                        (old.TaskID && old.TaskID === newSubtask.TaskID) || 
                        (old.TaskName === newSubtask.TaskName && old.AssignedTo === newSubtask.AssignedTo)
                    );
                    return !existingSubtask;
                });
                
                // Find modified subtasks where the assigned engineer changed
                const modifiedSubtasks = newSubtasks.filter(newSubtask => {
                    const oldSubtask = oldSubtasks.find(old => old.TaskID === newSubtask.TaskID);
                    return oldSubtask && oldSubtask.AssignedTo !== newSubtask.AssignedTo;
                });
                
                // Log and send emails for new subtask assignments
                for (const subtask of newSubtaskAssignments) {
                    try {
                        await sendSubtaskAssignmentEmail(subtask.AssignedTo, updateData, subtask);
                        activityLogs.push({
                            logID: uuidv4(),
                            taskID: oldTask._id,
                            changedBy: updateData.AssignedBy || updateData.ChangedBy,
                            changeType: 'Updated',
                            oldValue: {
                                type: 'subtask_added',
                                TaskName: oldTask.TaskName
                            },
                            newValue: {
                                type: 'subtask_added',
                                TaskName: oldTask.TaskName,
                                SubtaskName: subtask.TaskName,
                                message: `Added new subtask "${subtask.TaskName}" assigned to ${subtask.AssignedTo}`
                            },
                            timestamp: new Date()
                        });
                    } catch (emailError) {
                        console.error('Error sending new subtask assignment email:', emailError);
                    }
                }
                
                // Log and send emails for modified subtask assignments
                for (const subtask of modifiedSubtasks) {
                    try {
                        const oldSubtask = oldSubtasks.find(old => old.TaskID === subtask.TaskID);
                        await sendSubtaskAssignmentEmail(subtask.AssignedTo, updateData, subtask);
                        activityLogs.push({
                            logID: uuidv4(),
                            taskID: oldTask._id,
                            changedBy: updateData.AssignedBy || updateData.ChangedBy,
                            changeType: 'Updated',
                            oldValue: { 
                                type: 'subtask_reassigned',
                                AssignedTo: oldSubtask.AssignedTo,
                                TaskName: subtask.TaskName
                            },
                            newValue: {
                                type: 'subtask_reassigned',
                                TaskName: subtask.TaskName,
                                message: `Reassigned subtask "${subtask.TaskName}" from ${oldSubtask.AssignedTo} to ${subtask.AssignedTo}`
                            },
                            timestamp: new Date()
                        });
                    } catch (emailError) {
                        console.error('Error sending modified subtask assignment email:', emailError);
                    }
                }
            }
            
            // Log engineer reassignment
            if (updateData.AssignedTo && updateData.AssignedTo !== oldTask.AssignedTo) {
                try {
                    await sendTaskReassignmentEmail(updateData.AssignedTo, {
                        ...updateData,
                        TaskName: updateData.TaskName || oldTask.TaskName,
                        Description: updateData.Description || oldTask.Description,
                        Location: updateData.Location || oldTask.Location,
                        Priority: updateData.Priority || oldTask.Priority,
                        StartDate: updateData.StartDate || oldTask.StartDate,
                        EndDate: updateData.EndDate || oldTask.EndDate,
                        AssignedBy: updateData.AssignedBy || oldTask.AssignedBy,
                        AssignedByName: updateData.AssignedByName || oldTask.AssignedByName
                    });
                    activityLogs.push({
                        logID: uuidv4(),
                        taskID: oldTask._id,
                        changedBy: updateData.AssignedBy || updateData.ChangedBy,
                        changeType: 'Updated',
                        oldValue: { 
                            type: 'task_reassigned',
                            AssignedTo: oldTask.AssignedTo,
                            TaskName: oldTask.TaskName
                        },
                        newValue: {
                            type: 'task_reassigned',
                            TaskName: oldTask.TaskName,
                            message: `Reassigned task "${oldTask.TaskName}" from ${oldTask.AssignedTo} to ${updateData.AssignedTo}`
                        },
                        timestamp: new Date()
                    });
                } catch (emailError) {
                    console.error('Error sending reassignment email:', emailError);
                }
            }
            
            // Log client reassignment
            if (updateData.Client && updateData.Client !== oldTask.Client) {
                activityLogs.push({
                    logID: uuidv4(),
                    taskID: oldTask._id,
                    changedBy: updateData.AssignedBy || updateData.ChangedBy,
                    changeType: 'Updated',
                    oldValue: { 
                        type: 'client_changed',
                        Client: oldTask.Client,
                        TaskName: oldTask.TaskName
                    },
                    newValue: {
                        type: 'client_changed',
                        TaskName: oldTask.TaskName,
                        message: `Changed client for task "${oldTask.TaskName}" from ${oldTask.Client} to ${updateData.Client}`
                    },
                    timestamp: new Date()
                });
            }
            
            // Log priority changes
            if (updateData.Priority && updateData.Priority !== oldTask.Priority) {
                activityLogs.push({
                    logID: uuidv4(),
                    taskID: oldTask._id,
                    changedBy: updateData.AssignedBy || updateData.ChangedBy,
                    changeType: 'Updated',
                    oldValue: { Priority: oldTask.Priority },
                    newValue: {
                        message: `Changed priority from ${oldTask.Priority} to ${updateData.Priority}`
                    },
                    timestamp: new Date()
                });
            }
            
            // Log date changes
            if (updateData.StartDate && updateData.StartDate !== oldTask.StartDate) {
                const oldDate = new Date(oldTask.StartDate);
                const newDate = new Date(updateData.StartDate);
                
                // Only log if the dates are actually different
                if (oldDate.getTime() !== newDate.getTime()) {
                    activityLogs.push({
                        logID: uuidv4(),
                        taskID: oldTask._id,
                        changedBy: updateData.AssignedBy || updateData.ChangedBy,
                        changeType: 'Updated',
                        oldValue: { StartDate: oldTask.StartDate },
                        newValue: {
                            message: `Changed start date from ${oldDate.toLocaleDateString()} to ${newDate.toLocaleDateString()}`
                        },
                        timestamp: new Date()
                    });
                }
            }
            
            if (updateData.EndDate && updateData.EndDate !== oldTask.EndDate) {
                const oldDate = new Date(oldTask.EndDate);
                const newDate = new Date(updateData.EndDate);
                
                // Only log if the dates are actually different
                if (oldDate.getTime() !== newDate.getTime()) {
                    activityLogs.push({
                        logID: uuidv4(),
                        taskID: oldTask._id,
                        changedBy: updateData.AssignedBy || updateData.ChangedBy,
                        changeType: 'Updated',
                        oldValue: { EndDate: oldTask.EndDate },
                        newValue: {
                            message: `Changed due date from ${oldDate.toLocaleDateString()} to ${newDate.toLocaleDateString()}`
                        },
                        timestamp: new Date()
                    });
                }
            }
            
            if (updateData.Status === 'completed' && oldTask.Status !== 'completed') {
                activityLogs.push({
                    logID: uuidv4(),
                    taskID: oldTask._id,
                    changedBy: updateData.AssignedBy || updateData.ChangedBy,
                    changeType: 'Updated',
                    oldValue: { Status: oldTask.Status },
                    newValue: { 
                        Status: 'completed',
                        message: 'Task marked as completed'
                    },
                    timestamp: new Date()
                });
            }
            
            const updatedTask = await Task.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true }
            );
            
            if (!updatedTask) {
                return res.status(404).json({ message: "Task not found" });
            }
            
            // Save all activity logs
            await Promise.all(activityLogs.map(log => new ActivityLog(log).save()));
            
            // Add comments enabled flag and emit socket event
            const taskWithCommentsFlag = addCommentsEnabledFlag(updatedTask);
            
            // Emit socket event for task update
            const io = req.app.get('io');
            if (io) {
                io.emit('taskUpdated', taskWithCommentsFlag);
                console.log('Socket event emitted: taskUpdated');
            } else {
                console.log('No socket instance found on app');
            }
            
            res.status(200).json(taskWithCommentsFlag);
        } catch (error) {
            res.status(500).json({ message: "Error updating task", error: error.message });
        }
    },

    deleteTask: async (req, res) => {
        try {
            const task = await Task.findByIdAndDelete(req.params.id);
            if(!task){
                return res.status(404).json({ message: "Task not found" });
            }

            // Emit socket event for task deletion
            const io = req.app.get('io');
            if (io) {
                io.emit('taskDeleted', { _id: req.params.id });
                console.log('Socket event emitted: taskDeleted');
            } else {
                console.log('No socket instance found on app');
            }
            
            res.status(200).json({ message: "Task deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting task", error: error.message });
        }
    },

    getTaskByStatus: async (req, res) => {
        try {
            const { Status } = req.params;
            const tasks = await Task.find({ Status });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by status", error: error.message });
        }
    },

    getTaskByPriority: async (req, res) => {
        try {
            const { Priority } = req.params;
            const tasks = await Task.find({ Priority });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by priority", error: error.message });
        }
    },

    getTaskByLocation: async (req, res) => {
        try {
            const { Location } = req.params;
            const tasks = await Task.find({ Location });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by location", error: error.message });
        }
    },

    getTaskByAssignedTo: async (req, res) => {
        try {
            const { AssignedTo } = req.params;
            // Use $or to find tasks where either:
            // 1. The main task is assigned to the engineer
            // 2. Any subtask is assigned to the engineer
            const tasks = await Task.find({
                $or: [
                    { AssignedTo }, // Main task assigned to the engineer
                    { 'subtask.AssignedTo': AssignedTo } // Any subtask assigned to the engineer
                ]
            });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by assigned to", error: error.message });
        }
    },

    getTaskByCreatedAt: async (req, res) => {
        try {
            const { CreatedAt } = req.params;
            const tasks = await Task.find({ CreatedAt });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by created at", error: error.message });
        }
    },

    getTaskByUpdatedAt: async (req, res) => {
        try {
            const { UpdatedAt } = req.params;
            const tasks = await Task.find({ UpdatedAt });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by updated at", error: error.message });
        }
    },

    getTaskByEndDate: async (req, res) => {
        try {
            const { EndDate } = req.params;
            const tasks = await Task.find({ EndDate });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by end date", error: error.message });
        }
    },

    getTaskByStartDate: async (req, res) => {
        try {
            const { StartDate } = req.params;
            const tasks = await Task.find({ StartDate });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by start date", error: error.message });
        }
    },

    getTaskBySubtask: async (req, res) => {
        try {
            const { Subtask } = req.params;
            const tasks = await Task.find({ Subtask });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by subtask", error: error.message });
        }
    },

    getTaskByTaskName: async (req, res) => {
        try {
            const { TaskName } = req.params;
            const tasks = await Task.find({ TaskName });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by task name", error: error.message });
        }
    },

    getTaskByTaskID: async (req, res) => {
        try {
            const { TaskID } = req.params;
            const tasks = await Task.find({ TaskID });
            res.status(200).json(tasks);
        } catch (error) {
            res.status(500).json({ message: "Error fetching tasks by task id", error: error.message });
        }
    },

    addSubtask: async (req, res) => {
        try {
            const taskId = req.params.id;
            const { TaskName, AssignedTo, Status, Priority } = req.body;

            if (!TaskName || !AssignedTo || !Priority) {
                return res.status(400).json({ message: "TaskName, AssignedTo, and Priority are required fields" });
            }

            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            const subtaskData = {
                TaskName,
                AssignedTo,
                Status: Status || 'not-started',
                Priority
            };

            task.subtask.push(subtaskData);
            await task.save();

            try {
                const newSubtask = task.subtask[task.subtask.length - 1];
                await sendSubtaskAssignmentEmail(newSubtask.AssignedTo, task, newSubtask);
            } catch (emailError) {
                console.error('Error sending subtask email notification:', emailError);
            }

            // Emit socket event for task update (since a subtask was added)
            const io = req.app.get('io');
            if (io) {
                io.emit('taskUpdated', task);
                console.log('Socket event emitted: taskUpdated (subtask added)');
            } else {
                console.log('No socket instance found on app');
            }

            res.status(200).json(task);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    updateSubtaskStatus: async (req, res) => {
        try {
            const { taskId, subtaskId } = req.params;
            const { Status, ChangedBy } = req.body;
            
            const oldTask = await Task.findById(taskId);
            if (!oldTask) {
                return res.status(404).json({ message: "Task not found" });
            }
            
            // Find old subtask by TaskID
            const oldSubtask = oldTask.subtask.find(s => s.TaskID === subtaskId);
            if (!oldSubtask) {
                return res.status(404).json({ message: "Subtask not found" });
            }
            
            // Check if the user has permission to update this subtask's status
            // The requester (ChangedBy) should match the subtask's AssignedTo
            // This is to verify that only the assigned person can update the status
            if (ChangedBy && ChangedBy !== oldSubtask.AssignedTo) {
                // Get user info to check if admin 
                const user = await mongoose.model('User').findOne({ email: ChangedBy });
                // Allow update only if the user is an admin
                if (!user || user.role !== 'admin') {
                    return res.status(403).json({ 
                        message: "Permission denied: Only the assigned user or an admin can update this subtask's status" 
                    });
                }
            }
            
            const task = await Task.findById(taskId);
            // Find subtask to update by TaskID
            const subtask = task.subtask.find(s => s.TaskID === subtaskId);
            if (!subtask) {
                return res.status(404).json({ message: "Subtask not found" });
            }
            
            // Store original AssignedToName and ClientName values if they exist
            const originalValues = {
                AssignedToName: task.AssignedToName,
                ClientName: task.ClientName,
                AssignedByName: task.AssignedByName
            };
            
            subtask.Status = Status;
            task.percentage = calculateTaskPercentage(task.subtask);
            
            if (task.subtask.some(sub => ['in-progress', 'completed'].includes(sub.Status))) {
                task.Status = 'in-progress';
            }
            if (task.subtask.every(sub => sub.Status === 'completed')) {
                task.Status = 'completed';
            }
            
            await task.save();
            
            // Fetch the task again with populated values to ensure we don't lose any data
            const updatedTask = await Task.findById(taskId);
            
            // Restore the name mappings if they existed
            if (originalValues.AssignedToName) updatedTask.AssignedToName = originalValues.AssignedToName;
            if (originalValues.ClientName) updatedTask.ClientName = originalValues.ClientName;
            if (originalValues.AssignedByName) updatedTask.AssignedByName = originalValues.AssignedByName;
            
            const activityLog = new ActivityLog({
                logID: uuidv4(),
                taskID: taskId,
                changedBy: ChangedBy,
                changeType: 'Updated',
                oldValue: { 
                    TaskName: updatedTask.TaskName,
                    Status: oldSubtask.Status
                },
                newValue: { 
                    TaskName: updatedTask.TaskName,
                    Status: subtask.Status,
                    message: `Subtask "${subtask.TaskName}" status changed from "${oldSubtask.Status}" to "${subtask.Status}"`
                },
                timestamp: new Date()
            });
            await activityLog.save();
            
            // Emit socket event for task update (since a subtask status was changed)
            const io = req.app.get('io');
            if (io) {
                io.emit('taskUpdated', updatedTask);
                console.log('Socket event emitted: taskUpdated (subtask status changed)');
            } else {
                console.log('No socket instance found on app');
            }
            
            res.status(200).json(updatedTask);
        } catch (error) {
            res.status(500).json({ message: "Error updating subtask status", error: error.message });
        }
    },

    updateTaskStatus: async (req, res) => {
        try {
            const { Status } = req.body;
            const taskId = req.params.id;
            
            // Get the old task state
            const oldTask = await Task.findById(taskId);
            if (!oldTask) {
                return res.status(404).json({ message: "Task not found" });
            }

            const task = await Task.findById(taskId);
            const oldStatus = task.Status;
            task.Status = Status;
            
            if (Status === 'completed') {
                task.subtask.forEach(subtask => {
                    subtask.Status = 'completed';
                });
                task.percentage = 100;
            } else if (Status === 'not-started') {
                task.subtask.forEach(subtask => {
                    subtask.Status = 'not-started';
                });
                task.percentage = 0;
            } else {
                task.percentage = calculateTaskPercentage(task.subtask);
            }

            await task.save();
            const activityLog = new ActivityLog({
                logID: uuidv4(),
                taskID: taskId,
                changedBy: req.body.ChangedBy || 'System',
                changeType: 'Updated',
                oldValue: { Status: oldStatus },
                newValue: { 
                    TaskName: task.TaskName,
                    Status: Status 
                },
                timestamp: new Date()
            });
            await activityLog.save();

            // Emit socket event for task status update
            const io = req.app.get('io');
            if (io) {
                io.emit('taskUpdated', task);
                console.log('Socket event emitted: taskUpdated (status changed)');
            } else {
                console.log('No socket instance found on app');
            }

            res.status(200).json(task);
        } catch (error) {
            res.status(500).json({ message: "Error updating task status", error: error.message });
        }
    },

    getSubtasksByPriority: async (req, res) => {
        try {
            const { taskId, Priority } = req.params;
            
            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }
            
            const filteredSubtasks = task.subtask.filter(subtask => 
                subtask.Priority.toLowerCase() === Priority.toLowerCase()
            );
            
            res.status(200).json(filteredSubtasks);
        } catch (error) {
            res.status(500).json({ message: "Error filtering subtasks", error: error.message });
        }
    },

    addSubtaskComment: async (req, res) => {
        try {
            const { taskId, subtaskId } = req.params;
            const { author, text } = req.body;

            if (!author || !text) {
                return res.status(400).json({ message: "Author and text are required fields" });
            }

            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            // Check if the task has started
            const currentDate = new Date();
            const startDate = new Date(task.StartDate);
            
            if (currentDate < startDate) {
                return res.status(403).json({ 
                    message: `Comments are disabled until the task starts on ${startDate.toLocaleDateString()}`,
                    startDate: task.StartDate
                });
            }

            // Find subtask by TaskID instead of _id
            const subtask = task.subtask.find(s => s.TaskID === subtaskId);
            
            if (!subtask) {
                return res.status(404).json({ message: "Subtask not found" });
            }

            // Initialize comments array if it doesn't exist
            if (!subtask.comments) {
                subtask.comments = [];
            }

            // Add the new comment
            subtask.comments.push({
                author,
                text,
                timestamp: new Date()
            });

            // Store original AssignedToName and ClientName values if they exist
            const originalValues = {
                AssignedToName: task.AssignedToName,
                ClientName: task.ClientName,
                AssignedByName: task.AssignedByName
            };

            await task.save();

            // Fetch the task again with populated values to ensure we don't lose any data
            const updatedTask = await Task.findById(taskId);
            
            // Restore the name mappings if they existed
            if (originalValues.AssignedToName) updatedTask.AssignedToName = originalValues.AssignedToName;
            if (originalValues.ClientName) updatedTask.ClientName = originalValues.ClientName;
            if (originalValues.AssignedByName) updatedTask.AssignedByName = originalValues.AssignedByName;

            // Create activity log for the comment
            const activityLog = new ActivityLog({
                logID: uuidv4(),
                taskID: taskId,
                changedBy: author,
                changeType: 'Updated',
                newValue: { 
                    TaskName: updatedTask.TaskName,
                    message: `New comment on subtask "${subtask.TaskName}": "${text}"`
                },
                timestamp: new Date()
            });
            await activityLog.save();

            // Emit socket event for task update (since a comment was added)
            const io = req.app.get('io');
            if (io) {
                io.emit('taskUpdated', updatedTask);
                console.log('Socket event emitted: taskUpdated (comment added)');
            } else {
                console.log('No socket instance found on app');
            }

            res.status(200).json(updatedTask);
        } catch (error) {
            res.status(500).json({ message: "Error adding subtask comment", error: error.message });
        }
    },

    checkTasksDueDate: async (req, res) => {
        try {
            await checkDueDates();
            res.status(200).json({ message: 'Due date check completed' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = {
    ...taskController,
    checkDueDates
};

