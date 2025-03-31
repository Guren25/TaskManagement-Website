const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  logID: {
    type: String,
    unique: true
  },
  taskID: {
    type: String,
    required: function() {
      // Only require taskID if it's not a system-level operation
      return this.changeType !== 'SystemCheck';
    }
  },
  changedBy: {
    type: String,
    required: true
  },
  changeType: {
    type: String,
    enum: ['Created', 'Updated', 'Deleted', 'DueDate', 'SystemCheck'],
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