const Task = require('../models/Task');
const { sendTaskAssignmentEmail, sendSubtaskAssignmentEmail } = require('../utils/emailService');

const calculateTaskPercentage = (subtasks) => {
    if (!subtasks || subtasks.length === 0) return 0;
    
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(subtask => subtask.Status === 'completed').length;
    return Math.round((completedSubtasks / totalSubtasks) * 100);
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

            // Percentage will be calculated automatically by the pre-save middleware
            await task.save();

            // Send email notification to assigned user
            try {
                await sendTaskAssignmentEmail(task.AssignedTo, task);
                
                // Send emails for subtasks if any
                if (task.subtask && task.subtask.length > 0) {
                    for (const subtask of task.subtask) {
                        await sendSubtaskAssignmentEmail(subtask.AssignedTo, task, subtask);
                    }
                }
            } catch (emailError) {
                console.error('Error sending email notification:', emailError);
                // Continue with task creation even if email fails
            }

            res.status(201).json(task);
        } catch (error) {
            res.status(500).json({ message: "Error creating task", error: error.message });
        }
    },

    updateTask: async (req, res) => {
        try {
            const { TaskID, TaskName, Description, Location, Priority, Status, AssignedTo, AssignedBy, StartDate, EndDate, subtask } = req.body;
            const updateData = { 
                TaskID, 
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
            };
            if (subtask) {
                updateData.percentage = calculateTaskPercentage(subtask);
            }
            const task = await Task.findByIdAndUpdate(
                req.params.id, 
                updateData, 
                { new: true }
            );
            if(!task){
                return res.status(404).json({ message: "Task not found" });
            }
            res.status(200).json(task);
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
            const { taskId } = req.params;
            const subtaskData = req.body;

            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ message: 'Task not found' });
            }

            task.subtask.push(subtaskData);
            await task.save();

            // Send email notification for the new subtask
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
            const { Status } = req.body;

            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            const subtask = task.subtask.id(subtaskId);
            if (!subtask) {
                return res.status(404).json({ message: "Subtask not found" });
            }

            subtask.Status = Status;
            // Recalculate percentage after updating subtask status
            task.percentage = calculateTaskPercentage(task.subtask);
            await task.save();

            res.status(200).json(task);
        } catch (error) {
            res.status(500).json({ message: "Error updating subtask status", error: error.message });
        }
    },

    updateTaskStatus: async (req, res) => {
        try {
            const taskId = req.params.id;
            const { Status } = req.body;

            const task = await Task.findById(taskId);
            if (!task) {
                return res.status(404).json({ message: "Task not found" });
            }

            task.Status = Status;
            
            // If marking task as completed, mark all subtasks as completed
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
                // For in-progress, calculate based on subtasks
                task.percentage = calculateTaskPercentage(task.subtask);
            }

            await task.save();
            res.status(200).json(task);
        } catch (error) {
            res.status(500).json({ message: "Error updating task status", error: error.message });
        }
    }
};

module.exports = taskController;

