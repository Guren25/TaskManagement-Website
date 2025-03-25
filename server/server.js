require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const taskRoutes = require('./routes/TaskRoutes');
const userRoutes = require('./routes/UserRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const app = express();
const cron = require('node-cron');
const TaskController = require('./controllers/TaskController');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

connectDB();

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activity-logs', activityLogRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

cron.schedule('0 9 * * *', async () => {
  console.log('Running daily due date check...');
  try {
    await TaskController.checkDueDates();
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

//ONLY USE FOR TESTING IN DEVELOPMENT MODE
/*if (isDevelopment) {
  console.log('Development mode: Setting up test due date checks');
  // Check every hour in development
  cron.schedule('* * * * *', async () => {
    console.log('Running development due date check...');
    try {
      await TaskController.checkDueDates();
    } catch (error) {
      console.error('Error in development cron job:', error);
    }
  });
}*/

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
