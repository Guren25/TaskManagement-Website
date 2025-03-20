const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task == null) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  const task = new Task({
    TaskName: req.body.TaskName,
    Status: req.body.Status,
    Priority: req.body.Priority,
    AssignedTo: req.body.AssignedTo,
    AssignedBy: req.body.AssignedBy
  });

  try {
    const savedTask = await task.save();
    
    // Create activity log
    const log = new Log({
      LogID: uuidv4(),
      TaskID: savedTask._id,
      ChangedBy: savedTask.AssignedBy,
      ChangeType: 'created',
      NewValue: {
        TaskName: savedTask.TaskName,
        Status: savedTask.Status,
        Priority: savedTask.Priority,
        AssignedTo: savedTask.AssignedTo
      }
    });
    await log.save();

    res.status(201).json(savedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task == null) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (req.body.TaskName != null) {
      task.TaskName = req.body.TaskName;
    }
    if (req.body.Status != null) {
      task.Status = req.body.Status;
    }
    if (req.body.Priority != null) {
      task.Priority = req.body.Priority;
    }
    if (req.body.AssignedTo != null) {
      task.AssignedTo = req.body.AssignedTo;
    }
    if (req.body.AssignedBy != null) {
      task.AssignedBy = req.body.AssignedBy;
    }

    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Complete a task
router.put('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task == null) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.Status = 'Completed';
    const updatedTask = await task.save();
    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add a subtask
router.post('/:id/subtasks', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task == null) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const subtask = new Task({
      TaskName: req.body.TaskName,
      Status: 'Not Started',
      Priority: req.body.Priority,
      AssignedTo: req.body.AssignedTo,
      ParentTask: req.params.id
    });

    const savedSubtask = await subtask.save();
    task.Subtasks.push(savedSubtask._id);
    await task.save();

    res.status(201).json(savedSubtask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Complete a subtask
router.put('/:id/subtasks/:subtaskId', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (task == null) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const subtask = task.Subtasks.id(req.params.subtaskId);
    if (subtask == null) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    subtask.Status = 'Completed';
    await task.save();

    res.json(subtask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 