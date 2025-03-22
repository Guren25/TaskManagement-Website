const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  logID: {
    type: String,
    unique: true
  },
  taskID: {
    type: String,
    required: true
  },
  changedBy: {
    type: String,
    required: true
  },
  changeType: {
    type: String,
    enum: ['Created', 'Updated', 'Deleted', 'DueDate'],
    required: true
  },
  oldValue: {
    type: Object
  },
  newValue: {
    type: Object
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema); 