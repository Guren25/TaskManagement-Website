const mongoose = require("mongoose");

const formatTaskName = (taskName) => {
    return taskName.toUpperCase().replace(/\s+/g, '-');
};

const formatLocation = (location) => {
    return location.toUpperCase().replace(/\s+/g, '-');
};

const taskSchema = new mongoose.Schema({
    TaskID: {
        type: String,
        unique: true
    },
    TaskName: {
        type: String,
        required: true,
    },
    Description: {
        type: String,
        required: true,
    },
    Location: {
        type: String,
        required: true,
    },
    Priority: {
        type: String,
        required: true,
        enum: ['low', 'medium', 'high'],
    },
    Status: {
        type: String,
        required: true,
        enum: ['not-started', 'in-progress', 'completed'],
        default: 'not-started'
    },
    AssignedTo: {
        type: String,
        required: true,
    },
    AssignedBy: {
        type: String,
        required: true,
    },
    Client: {
        type: String,
        required: true,
    },
    CreatedAt: {
        type: Date,
        default: Date.now,
    },
    UpdatedAt: {
        type: Date,
        default: Date.now,
    },
    StartDate: {
        type: Date,
        required: true,
    },
    EndDate: {
        type: Date,
        required: true,
    },
    percentage: {
        type: Number,
        default: 0
    },
    subtask: [{
        TaskID: {
            type: String
        },
        TaskName: {
            type: String,
            required: true,
        },
        Priority: {
            type: String,
            required: true,
            enum: ['low', 'medium', 'high'],
        },
        Status: {
            type: String,
            required: true,
            enum: ['not-started', 'in-progress', 'completed'],
            default: 'not-started'
        },
        AssignedTo: {
            type: String,
            required: true,
        }
    }]
});
taskSchema.pre('save', async function(next) {
    try {
        if (this.isNew) {
            const formattedLocation = formatLocation(this.Location);
            const locationPattern = new RegExp(`^${formattedLocation}-\\d+$`);
            const highestTask = await this.constructor.findOne(
                { TaskID: locationPattern },
                { TaskID: 1 }
            ).sort({ TaskID: -1 });

            let nextNumber = 1;
            if (highestTask && highestTask.TaskID) {
                const currentNumber = parseInt(highestTask.TaskID.split('-').pop());
                nextNumber = currentNumber + 1;
            }

            this.TaskID = `${formattedLocation}-${nextNumber}`;
            if (this.subtask && this.subtask.length > 0) {
                const formattedTaskName = formatTaskName(this.TaskName);
                this.subtask.forEach((subtask, index) => {
                    subtask.TaskID = `${formattedTaskName}-${index + 1}`;
                });
            }
        } else if (this.subtask) {
            const formattedTaskName = formatTaskName(this.TaskName);
            const existingSubtaskIds = this.subtask
                .filter(s => s.TaskID)
                .map(s => s.TaskID);
            
            let nextSubtaskNumber = 1;
            if (existingSubtaskIds.length > 0) {
                const highestSubtaskNumber = Math.max(
                    ...existingSubtaskIds.map(id => 
                        parseInt(id.split('-').pop())
                    )
                );
                nextSubtaskNumber = highestSubtaskNumber + 1;
            }

            this.subtask.forEach(subtask => {
                if (!subtask.TaskID) {
                    subtask.TaskID = `${formattedTaskName}-${nextSubtaskNumber++}`;
                }
            });
        }
        next();
    } catch (error) {
        next(error);
    }
});

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;


