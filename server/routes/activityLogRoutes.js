const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');

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

module.exports = router; 