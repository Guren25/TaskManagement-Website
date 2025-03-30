const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const Task = require('../models/Task');

router.get('/task/:taskId', async (req, res) => {
    try {
        const logs = await ActivityLog.find({ taskID: req.params.taskId })
            .sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/recent', async (req, res) => {
    try {
        const logs = await ActivityLog.find()
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// New route to get logs for an engineer (including subtask assignments)
router.get('/engineer/:email', async (req, res) => {
    try {
        const engineerEmail = req.params.email;
        
        // First, find all tasks where this engineer is assigned (main task or subtask)
        const tasks = await Task.find({
            $or: [
                { AssignedTo: engineerEmail },
                { 'subtask.AssignedTo': engineerEmail }
            ]
        });
        
        // Extract task IDs
        const taskIds = tasks.map(task => task._id);
        
        // Find logs for these tasks
        const logs = await ActivityLog.find({
            taskID: { $in: taskIds }
        })
        .sort({ timestamp: -1 })
        .limit(100);
        
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 