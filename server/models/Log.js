const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  LogID: {
    type: String,
    unique: true,
    required: true
  },
  TaskID: {
    type: String,
    required: true
  },
  ChangedBy: {
    type: String,
    required: true
  },
  ChangeType: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'completed', 'subtask_added', 'subtask_completed']
  },
  OldValue: {
    type: Object,
    default: null
  },
  NewValue: {
    type: Object,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Log', logSchema); 