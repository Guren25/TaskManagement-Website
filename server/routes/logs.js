const express = require('express');
const router = express.Router();
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

// Get all logs
router.get('/', async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new log
router.post('/', async (req, res) => {
  const log = new Log({
    LogID: uuidv4(),
    TaskID: req.body.TaskID,
    ChangedBy: req.body.ChangedBy,
    ChangeType: req.body.ChangeType,
    OldValue: req.body.OldValue,
    NewValue: req.body.NewValue
  });

  try {
    const newLog = await log.save();
    res.status(201).json(newLog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 