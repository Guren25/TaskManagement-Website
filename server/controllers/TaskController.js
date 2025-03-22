const Task = require('../models/Task');
const { sendTaskAssignmentEmail, sendSubtaskAssignmentEmail, sendDueDateEmail } = require('../utils/emailService');
const ActivityLog = require('../models/ActivityLog');
const { v4: uuidv4 } = require('uuid');

const calculateTaskPercentage = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return 0;
    
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(subtask => subtask.Status === 'completed').length;
    return Math.round((completedSubtasks / totalSubtasks) * 100);
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
      if (daysUntilDue === 7 || daysUntilDue === 3 || daysUntilDue === 1) {
        console.log(`Sending notification for task "${task.TaskName}" (${daysUntilDue} days remaining)`);
        
        const notification = new ActivityLog({
          logID: uuidv4(),
          taskID: task._id,
          changedBy: 'system',
          changeType: 'Updated',
          newValue: {
            type: 'due_date_notification',
            message: `Task "${task.TaskName}" is due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
            daysRemaining: daysUntilDue
          },
          timestamp: new Date()
        });
        await notification.save();

        try {
          await sendDueDateEmail(task.AssignedTo, {
            ...task.toObject(),
            daysRemaining: daysUntilDue
          });
          console.log(`Email notification sent for task "${task.TaskName}"`);
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
                const taskObj = task.toObject();
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
            const taskObj = task.toObject();
            taskObj.percentage = calculateTaskPercentage(taskObj.subtask);
            res.status(200).json(taskObj);
        } catch (error) {
            res.status(500).json({ message: "Error fetching task", error: error.message });
        }
    },

    createTask: async (req, res) => {
        try {
            const { TaskName, Description, Location, Priority, Status, AssignedTo, AssignedBy, StartDate, EndDate, subtask } = req.body;
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

            res.status(201).json(savedTask);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    updateTask: async (req, res) => {
        try {
            const oldTask = await Task.findById(req.params.id);
            const updateData = req.body;
            
            if (updateData.subtask) {
                updateData.percentage = calculateTaskPercentage(updateData.subtask);
            }
            
            if (updateData.Status === 'completed' && oldTask.Status !== 'completed') {
                const activityLog = new ActivityLog({
                    logID: uuidv4(),
                    taskID: oldTask._id,
                    changedBy: updateData.AssignedBy || updateData.ChangedBy,
                    changeType: 'Updated',
                    oldValue: { Status: oldTask.Status },
                    newValue: { Status: 'completed' },
                    timestamp: new Date()
                });
                await activityLog.save();
            }
            
            const updatedTask = await Task.findByIdAndUpdate(
                req.params.id,
                updateData,
                { new: true }
            );
            
            if (!updatedTask) {
                return res.status(404).json({ message: "Task not found" });
            }
            const activityLog = new ActivityLog({
                logID: uuidv4(),
                taskID: updatedTask._id,
                changedBy: updateData.AssignedBy || updateData.ChangedBy,
                changeType: 'Updated',
                oldValue: oldTask,
                newValue: updatedTask,
                timestamp: new Date()
            });
            await activityLog.save();
            
            res.status(200).json(updatedTask);
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
            const tasks = await Task.find({ AssignedTo });
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
            const oldSubtask = oldTask.subtask.id(subtaskId);
            
            const task = await Task.findById(taskId);
            const subtask = task.subtask.id(subtaskId);
            subtask.Status = Status;
            task.percentage = calculateTaskPercentage(task.subtask);
            
            if (task.subtask.some(sub => ['in-progress', 'completed'].includes(sub.Status))) {
                task.Status = 'in-progress';
            }
            if (task.subtask.every(sub => sub.Status === 'completed')) {
                task.Status = 'completed';
            }
            
            await task.save();
            
            const activityLog = new ActivityLog({
                logID: uuidv4(),
                taskID: taskId,
                changedBy: ChangedBy,
                changeType: 'Updated',
                oldValue: { subtask: oldSubtask },
                newValue: { subtask: subtask },
                timestamp: new Date()
            });
            await activityLog.save();
            
            res.status(200).json(task);
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

