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

// Common email styles and components
const emailStyles = `
    body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        line-height: 1.6; 
        color: #333; 
        margin: 0; 
        padding: 0; 
        background-color: #f9f9f9; 
    }
    .email-container { 
        max-width: 600px; 
        margin: 0 auto; 
        background-color: #ffffff; 
        border-radius: 8px; 
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
    }
    .email-header { 
        background-color: #2E7D32; 
        color: white; 
        padding: 20px; 
        text-align: center; 
    }
    .email-logo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
    }
    .email-body { 
        padding: 30px 25px; 
    }
    .email-footer { 
        background-color: #f5f5f5; 
        padding: 15px; 
        text-align: center; 
        font-size: 12px; 
        color: #666; 
        border-top: 1px solid #eeeeee;
    }
    h1, h2 { 
        color: #2E7D32; 
        margin-top: 0; 
    }
    .btn {
        display: inline-block;
        padding: 10px 20px;
        background-color: #2E7D32;
        color: white !important;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 500;
        margin: 15px 0;
    }
    .btn:hover {
        background-color: #266a29;
        color: white !important;
    }
    .detail-row {
        margin-bottom: 10px;
        border-bottom: 1px solid #f0f0f0;
        padding-bottom: 10px;
    }
    .detail-row:last-child {
        border-bottom: none;
    }
    .label {
        font-weight: 600;
        color: #555;
    }
    .warning-text {
        color: #e65100;
        font-weight: 500;
    }
    .success-text {
        color: #2E7D32;
        font-weight: 500;
    }
    .note {
        background-color: #f8f9fa;
        padding: 10px 15px;
        border-left: 4px solid #2E7D32;
        margin: 15px 0;
    }
`;

const createEmailHeader = (title) => `
    <div class="email-header">
        <div class="email-logo">Task Management System</div>
        <div>${title}</div>
    </div>
`;

const createEmailFooter = () => `
    <div class="email-footer">
        &copy; ${new Date().getFullYear()} Task Management System. All rights reserved.<br>
        This is an automated message, please do not reply to this email.
    </div>
`;

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
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Task Assignment</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader('New Task Assignment')}
                        <div class="email-body">
                            <h2>You have been assigned a new task</h2>
                            <p>Hello,</p>
                            <p>A new task has been assigned to you. Please review the details below:</p>
                            
                            <div class="detail-row">
                                <span class="label">Task Name:</span> ${taskDetails.TaskName}
                            </div>
                            <div class="detail-row">
                                <span class="label">Description:</span> ${taskDetails.Description}
                            </div>
                            <div class="detail-row">
                                <span class="label">Location:</span> ${taskDetails.Location}
                            </div>
                            <div class="detail-row">
                                <span class="label">Priority:</span> 
                                <span style="text-transform: capitalize;">${taskDetails.Priority}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Start Date:</span> ${new Date(taskDetails.StartDate).toLocaleDateString()}
                            </div>
                            <div class="detail-row">
                                <span class="label">End Date:</span> ${new Date(taskDetails.EndDate).toLocaleDateString()}
                            </div>
                            <div class="detail-row">
                                <span class="label">Assigned By:</span> ${taskDetails.AssignedByName || taskDetails.AssignedBy}
                            </div>
                            
                            <div class="note">
                                Please log in to the system to view more details and start working on your task.
                            </div>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
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
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>New Subtask Assignment</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader('New Subtask Assignment')}
                        <div class="email-body">
                            <h2>You have been assigned a new subtask</h2>
                            <p>Hello,</p>
                            <p>A new subtask has been assigned to you. Please review the details below:</p>
                            
                            <div class="detail-row">
                                <span class="label">Main Task:</span> ${mainTask.TaskName}
                            </div>
                            <div class="detail-row">
                                <span class="label">Subtask Name:</span> ${subtask.TaskName}
                            </div>
                            <div class="detail-row">
                                <span class="label">Location:</span> ${mainTask.Location}
                            </div>
                            <div class="detail-row">
                                <span class="label">Priority:</span> 
                                <span style="text-transform: capitalize;">${subtask.Priority}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Main Task Due Date:</span> ${new Date(mainTask.EndDate).toLocaleDateString()}
                            </div>
                            
                            <div class="note">
                                Please log in to the system to view more details and start working on your subtask.
                            </div>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
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
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Task ${isOverdue ? 'Overdue' : 'Due Soon'}</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader(`Task ${isOverdue ? 'Overdue' : 'Due Soon'}`)}
                        <div class="email-body">
                            <h2>Task ${isOverdue ? 'Overdue' : 'Due Date'} Reminder</h2>
                            <p>Hello,</p>
                            <p style="font-size: 16px; margin-bottom: 20px; ${isOverdue ? 'color: #d32f2f; font-weight: bold;' : 'color: #e65100; font-weight: bold;'}">
                                ${
                                    isOverdue 
                                        ? `<span>⚠️ This task is overdue by ${Math.abs(taskDetails.daysRemaining)} day${Math.abs(taskDetails.daysRemaining) > 1 ? 's' : ''}!</span>` 
                                        : `<span>⏰ This task is due in ${taskDetails.daysRemaining} day${taskDetails.daysRemaining > 1 ? 's' : ''}!</span>`
                                }
                            </p>
                            
                            <div class="detail-row">
                                <span class="label">Task Name:</span> ${taskDetails.TaskName}
                            </div>
                            <div class="detail-row">
                                <span class="label">Description:</span> ${taskDetails.Description}
                            </div>
                            <div class="detail-row">
                                <span class="label">Location:</span> ${taskDetails.Location}
                            </div>
                            <div class="detail-row">
                                <span class="label">Priority:</span> 
                                <span style="text-transform: capitalize;">${taskDetails.Priority}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Due Date:</span> ${new Date(taskDetails.EndDate).toLocaleDateString()}
                            </div>
                            
                            <div class="note" style="${isOverdue ? 'background-color: #ffebee; border-left: 4px solid #d32f2f;' : ''}">
                                ${
                                    isOverdue 
                                        ? 'Please complete this task as soon as possible as it is past the due date.' 
                                        : 'Please ensure to complete the task before the due date.'
                                }
                            </div>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
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

const sendSubtaskDueDateEmail = async (recipientEmail, mainTask, subtask) => {
    try {
        const isOverdue = mainTask.daysRemaining < 0;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: `Main Task ${isOverdue ? 'Overdue' : 'Due Date'} Reminder: ${mainTask.TaskName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Main Task ${isOverdue ? 'Overdue' : 'Due Soon'}</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader(`Main Task ${isOverdue ? 'Overdue' : 'Due Soon'}`)}
                        <div class="email-body">
                            <h2>Main Task ${isOverdue ? 'Overdue' : 'Due Date'} Reminder</h2>
                            <p>Hello,</p>
                            <p style="font-size: 16px; margin-bottom: 20px; ${isOverdue ? 'color: #d32f2f; font-weight: bold;' : 'color: #e65100; font-weight: bold;'}">
                                ${
                                    isOverdue 
                                        ? `<span>⚠️ The main task is overdue by ${Math.abs(mainTask.daysRemaining)} day${Math.abs(mainTask.daysRemaining) > 1 ? 's' : ''}!</span>` 
                                        : `<span>⏰ The main task is due in ${mainTask.daysRemaining} day${mainTask.daysRemaining > 1 ? 's' : ''}!</span>`
                                }
                            </p>
                            
                            <div class="detail-row">
                                <span class="label">Main Task:</span> ${mainTask.TaskName}
                            </div>
                            <div class="detail-row">
                                <span class="label">Your Subtask:</span> ${subtask.TaskName}
                            </div>
                            <div class="detail-row">
                                <span class="label">Description:</span> ${mainTask.Description}
                            </div>
                            <div class="detail-row">
                                <span class="label">Location:</span> ${mainTask.Location}
                            </div>
                            <div class="detail-row">
                                <span class="label">Main Task Priority:</span> 
                                <span style="text-transform: capitalize;">${mainTask.Priority}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Subtask Priority:</span> 
                                <span style="text-transform: capitalize;">${subtask.Priority}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Due Date:</span> ${new Date(mainTask.EndDate).toLocaleDateString()}
                            </div>
                            
                            <div class="note" style="${isOverdue ? 'background-color: #ffebee; border-left: 4px solid #d32f2f;' : ''}">
                                ${
                                    isOverdue 
                                        ? 'Please complete your subtask as soon as possible as the main task is past the due date.' 
                                        : 'Please ensure to complete your subtask before the main task due date.'
                                }
                            </div>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Subtask due date reminder email sent:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending subtask due date reminder:', error);
        throw error;
    }
};

const sendWelcomeEmail = async (user, tempPassword) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email.replace(/['"]+/g, ''),
            subject: 'Welcome to Task Management System',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to Task Management System</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader('Welcome')}
                        <div class="email-body">
                            <h2>Welcome to the team!</h2>
                            <p>Dear ${user.firstname} ${user.lastname},</p>
                            <p>We're excited to have you on board the Task Management System. Your account has been created and you can now start using the system.</p>
                            
                            <div style="background-color: #e8f5e9; border-radius: 6px; padding: 15px; margin: 20px 0; border: 1px solid #c8e6c9;">
                                <p style="margin: 0; font-weight: 500;">Your temporary password is:</p>
                                <p style="font-family: monospace; font-size: 18px; background: #fff; padding: 10px; border-radius: 4px; border: 1px dashed #2E7D32; text-align: center; margin: 10px 0 5px;">
                                    ${tempPassword}
                                </p>
                                <p style="margin: 5px 0 0; font-size: 13px; color: #666;">
                                    For security reasons, please change this password after your first login.
                                </p>
                            </div>
                            
                            <p>With your account, you can:</p>
                            <ul>
                                <li>View and manage assigned tasks</li>
                                <li>Track progress of your work</li>
                                <li>Collaborate with team members</li>
                                <li>Receive notifications about deadlines</li>
                            </ul>
                            
                            <p>If you have any questions, please contact your administrator.</p>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
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
            subject: 'Verify Your Email Address',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Email Verification</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader('Email Verification')}
                        <div class="email-body">
                            <h2>Verify Your Email Address</h2>
                            <p>Dear ${user.firstname} ${user.lastname},</p>
                            <p>Thank you for registering with the Task Management System. To complete your registration, please verify your email address by clicking the button below:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${verificationUrl}" class="btn">Verify Email Address</a>
                            </div>
                            
                            <p>Or copy and paste this link in your browser:</p>
                            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">
                                ${verificationUrl}
                            </p>
                            
                            <div class="note">
                                This link will expire in 24 hours. If you did not create an account, please ignore this email.
                            </div>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
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

const sendPasswordResetEmail = async (email, resetLink) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Password Reset</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader('Password Reset')}
                        <div class="email-body">
                            <h2>Password Reset Request</h2>
                            <p>Hello,</p>
                            <p>We received a request to reset your password for your Task Management System account. Click the button below to create a new password:</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" class="btn">Reset Password</a>
                            </div>
                            
                            <p>Or copy and paste this link in your browser:</p>
                            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 14px;">
                                ${resetLink}
                            </p>
                            
                            <div class="note">
                                This link will expire in 1 hour. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
                            </div>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
};

const sendSubtaskRemovalEmail = async (recipientEmail, engineerName, subtaskName, taskName) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: `Subtask Assignment Removal: ${subtaskName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Subtask Removal Notification</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader('Subtask Removal')}
                        <div class="email-body">
                            <h2>Subtask Assignment Removal</h2>
                            <p>Dear ${engineerName},</p>
                            <p>This is to inform you that you have been removed from the following subtask because your account is no longer active:</p>
                            
                            <div style="background-color: #f5f5f5; border-radius: 6px; padding: 15px; margin: 20px 0;">
                                <div class="detail-row">
                                    <span class="label">Main Task:</span> ${taskName}
                                </div>
                                <div class="detail-row">
                                    <span class="label">Subtask:</span> ${subtaskName}
                                </div>
                            </div>
                            
                            <div class="note">
                                If you believe this is an error, please contact your administrator to reactivate your account.
                            </div>
                            
                            <p>Thank you for your understanding.</p>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Subtask removal email sent successfully:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending subtask removal email:', error);
        throw error;
    }
};

const sendTaskReassignmentEmail = async (recipientEmail, taskDetails) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipientEmail,
            subject: `Task Reassignment: ${taskDetails.TaskName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Task Reassignment</title>
                    <style>${emailStyles}</style>
                </head>
                <body>
                    <div class="email-container">
                        ${createEmailHeader('Task Reassignment')}
                        <div class="email-body">
                            <h2>You have been assigned to a task</h2>
                            <p>Hello,</p>
                            <p>You have been assigned to the following task. Please review the details below:</p>
                            
                            <div class="detail-row">
                                <span class="label">Task Name:</span> ${taskDetails.TaskName}
                            </div>
                            <div class="detail-row">
                                <span class="label">Description:</span> ${taskDetails.Description}
                            </div>
                            <div class="detail-row">
                                <span class="label">Location:</span> ${taskDetails.Location}
                            </div>
                            <div class="detail-row">
                                <span class="label">Priority:</span> 
                                <span style="text-transform: capitalize;">${taskDetails.Priority}</span>
                            </div>
                            <div class="detail-row">
                                <span class="label">Start Date:</span> ${new Date(taskDetails.StartDate).toLocaleDateString()}
                            </div>
                            <div class="detail-row">
                                <span class="label">End Date:</span> ${new Date(taskDetails.EndDate).toLocaleDateString()}
                            </div>
                            <div class="detail-row">
                                <span class="label">Assigned By:</span> ${taskDetails.AssignedByName || taskDetails.AssignedBy}
                            </div>
                            
                            <div class="note">
                                Please log in to the system to view more details and start working on your task.
                            </div>
                        </div>
                        ${createEmailFooter()}
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reassignment email sent successfully:', info.response);
        return true;
    } catch (error) {
        console.error('Error sending reassignment email:', error);
        throw error;
    }
};

module.exports = {
    sendTaskAssignmentEmail,
    sendSubtaskAssignmentEmail,
    sendDueDateEmail,
    sendSubtaskDueDateEmail,
    sendWelcomeEmail,
    sendVerificationEmail,
    verifyConnection,
    sendPasswordResetEmail,
    sendSubtaskRemovalEmail,
    sendTaskReassignmentEmail
}; 