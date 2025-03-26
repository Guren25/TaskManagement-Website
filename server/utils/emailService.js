const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: true
    }
});

const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('Email service is ready');
    } catch (error) {
        console.error('Email service configuration error:', error.message);
    }
};

verifyConnection();

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
                <p><strong>Assigned By:</strong> ${taskDetails.AssignedByName || taskDetails.AssignedBy}</p>
                <br>
                <p>Please log in to the system to view more details and start working on your task.</p>
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
                <p><strong>Priority:</strong> ${subtask.Priority}</p>
                <p><strong>Main Task Due Date:</strong> ${new Date(mainTask.EndDate).toLocaleDateString()}</p>
                <br>
                <p>Please log in to the system to view more details and start working on your subtask.</p>
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

const sendDueDateEmail = async (recipientEmail, taskDetails) => {
    try {
        const isOverdue = taskDetails.daysRemaining < 0;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: `Task ${isOverdue ? 'Overdue' : 'Due Date'} Reminder: ${taskDetails.TaskName}`,
            html: `
                <h2>Task ${isOverdue ? 'Overdue' : 'Due Date'} Reminder</h2>
                <p style="color: ${isOverdue ? '#ff0000' : taskDetails.daysRemaining <= 3 ? '#ff3b30' : '#ff9500'}">
                    <strong>${
                        isOverdue 
                            ? `This task is overdue by ${Math.abs(taskDetails.daysRemaining)} day${Math.abs(taskDetails.daysRemaining) > 1 ? 's' : ''}!` 
                            : `This task is due in ${taskDetails.daysRemaining} day${taskDetails.daysRemaining > 1 ? 's' : ''}!`
                    }</strong>
                </p>
                <p><strong>Task Name:</strong> ${taskDetails.TaskName}</p>
                <p><strong>Description:</strong> ${taskDetails.Description}</p>
                <p><strong>Location:</strong> ${taskDetails.Location}</p>
                <p><strong>Priority:</strong> ${taskDetails.Priority}</p>
                <p><strong>Due Date:</strong> ${new Date(taskDetails.EndDate).toLocaleDateString()}</p>
                <br>
                <p>${
                    isOverdue 
                        ? 'Please complete this task as soon as possible as it is past the due date.' 
                        : 'Please ensure to complete the task before the due date.'
                }</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Due date reminder email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending due date reminder:', error);
        throw error;
    }

};
const sendWelcomeEmail = async (user, tempPassword) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email.replace(/['"]+/g, ''),
            subject: 'System Credentials',
            html: `
                <h2>Welcome to the team</h2>
                <p>Dear ${user.firstname} ${user.lastname},</p>
                <p>Welcome to the team! We're excited to have you on board.</p>
                <p>Your temporary password is: ${tempPassword}</p>
                <p>Please log in to the system to view more details and start working on your tasks.</p>
            `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw error;
    }
};

const sendVerificationEmail = async (user) => {
    try {
        const verificationToken = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const verificationUrl = `${process.env.BACKEND_URL}/api/users/verify-email/${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Verify Your Email',
            html: `
                <h2>Email Verification</h2>
                <p>Dear ${user.firstname} ${user.lastname},</p>
                <p>Please click the link below to verify your email address:</p>
                <p><a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
                <p>Or copy and paste this link in your browser:</p>
                <p>${verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you did not create an account, please ignore this email.</p>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
};

module.exports = {
    sendTaskAssignmentEmail,
    sendSubtaskAssignmentEmail,
    sendDueDateEmail,
    sendWelcomeEmail,
    sendVerificationEmail,
    verifyConnection
}; 