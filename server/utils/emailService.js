const nodemailer = require('nodemailer');

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this to other email services
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Function to send task assignment email
const sendTaskAssignmentEmail = async (recipientEmail, taskDetails) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: `New Task Assignment: ${taskDetails.TaskName}`,
            html: `
                <h2>You have been assigned a new task</h2>
                <p><strong>Task Name:</strong> ${taskDetails.TaskName}</p>
                <p><strong>Description:</strong> ${taskDetails.Description}</p>
                <p><strong>Location:</strong> ${taskDetails.Location}</p>
                <p><strong>Priority:</strong> ${taskDetails.Priority}</p>
                <p><strong>Start Date:</strong> ${new Date(taskDetails.StartDate).toLocaleDateString()}</p>
                <p><strong>End Date:</strong> ${new Date(taskDetails.EndDate).toLocaleDateString()}</p>
                <p><strong>Assigned By:</strong> ${taskDetails.AssignedBy}</p>
                <br>
                <p>Please log in to the task management system to view more details and start working on your task.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

// Function to send subtask assignment email
const sendSubtaskAssignmentEmail = async (recipientEmail, mainTask, subtask) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: `New Subtask Assignment: ${subtask.TaskName}`,
            html: `
                <h2>You have been assigned a new subtask</h2>
                <p><strong>Main Task:</strong> ${mainTask.TaskName}</p>
                <p><strong>Subtask Name:</strong> ${subtask.TaskName}</p>
                <p><strong>Location:</strong> ${mainTask.Location}</p>
                <p><strong>Main Task Due Date:</strong> ${new Date(mainTask.EndDate).toLocaleDateString()}</p>
                <br>
                <p>Please log in to the task management system to view more details and start working on your subtask.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Subtask assignment email sent successfully:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending subtask assignment email:', error);
        throw error;
    }
};

module.exports = {
    sendTaskAssignmentEmail,
    sendSubtaskAssignmentEmail
}; 