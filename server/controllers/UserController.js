const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const emailService = require("../utils/emailService");
const emailValidator = require("email-validator");
const dns = require("dns");
const { promisify } = require('util');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const validateEmail = async (email) => {
    try {
        // Basic format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                isValid: false,
                message: "Invalid email format"
            };
        }

        // Domain validation
        const domain = email.split('@')[1];
        try {
            const resolveMx = promisify(dns.resolveMx);
            const mxRecords = await resolveMx(domain);
            
            if (!mxRecords || mxRecords.length === 0) {
                return {
                    isValid: false,
                    message: "Email domain does not have valid mail servers"
                };
            }
        } catch (error) {
            return {
                isValid: false,
                message: "Invalid email domain"
            };
        }

        return {
            isValid: true,
            message: "Email is valid"
        };
    } catch (error) {
        console.error("Email validation failed:", error);
        return {
            isValid: false,
            message: error.message
        };
    }
};

const userController = {
    getAllUsers: async (req, res) => {
        try {
            const { role } = req.query;
            let query = {};
            
            if (role) {
                query.role = role;
            }
            
            const users = await User.find(query).select('-password');
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ message: "Error fetching users", error: error.message });
        }
    },

    getUserById: async (req, res) => {
        try {
            const user = await User.findById(req.params.id).select("-password");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json(user);
        } catch (error) {
            res.status(500).json({ message: "Error fetching user", error: error.message });
        }
    },

    createUser: async (req, res) => {
        try {
            const { firstname, lastname, middlename, email, password, role, phone, isTemporaryPassword } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User already exists with this email" });
            }

            // Validate email
            const emailValidation = await validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({ message: emailValidation.message });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = new User({
                firstname,
                lastname,
                middlename: middlename || "",
                email,
                password: hashedPassword,
                role,
                phone,
                isTemporaryPassword: isTemporaryPassword || false,
                status: "unverified"
            });

            // Save user
            const savedUser = await user.save();
            
            // Send welcome email with credentials
            try {
                await emailService.sendWelcomeEmail(savedUser, password);
                console.log(`Welcome email sent to ${email}`);
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);
                await User.findByIdAndDelete(savedUser._id);
                return res.status(500).json({ 
                    message: "Failed to send welcome email",
                    error: emailError.message 
                });
            }
            
            const userResponse = savedUser.toObject();
            delete userResponse.password;

            res.status(201).json({
                ...userResponse,
                message: "User created successfully. Credentials have been sent to their email."
            });
        } catch (error) {
            console.error('User creation error:', error);
            res.status(500).json({ 
                message: "Error creating user", 
                error: error.message 
            });
        }
    },

    updateUser: async (req, res) => {
        try {
            const { firstname, lastname, middlename, email, role, status } = req.body;
            const userId = req.params.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (email && email !== user.email) {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: "Email already in use" });
                }
            }

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    firstname,
                    lastname,
                    middlename,
                    email,
                    role,
                    status
                },
                { new: true }
            ).select("-password");

            res.status(200).json(updatedUser);
        } catch (error) {
            res.status(500).json({ message: "Error updating user", error: error.message });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const user = await User.findByIdAndDelete(req.params.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.status(200).json({ message: "User deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting user", error: error.message });
        }
    },

    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            
            if (!user) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            // Add check for deactivated status
            if (user.status === "deactivated") {
                return res.status(401).json({ 
                    message: "Your account has been deactivated. Please contact an administrator.",
                    deactivated: true
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            // Only check verification status if it's not a temporary password
            if (!user.isTemporaryPassword && user.status === "unverified") {
                return res.status(401).json({ 
                    message: "Please verify your email before logging in",
                    unverified: true
                });
            }

            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            const userResponse = user.toObject();
            delete userResponse.password;

            // If user is admin, trigger due date check asynchronously
            if (user.role === 'admin') {
                // Import TaskController using require only when needed
                const TaskController = require('./TaskController');
                // Run due date check in the background
                TaskController.checkDueDates().catch(error => {
                    console.error('Error checking due dates after login:', error);
                });
                console.log('Due dates check triggered by admin login');
            }

            res.status(200).json({
                token,
                user: userResponse,
                requirePasswordChange: user.isTemporaryPassword
            });
        } catch (error) {
            res.status(500).json({ message: "Error logging in", error: error.message });
        }
    },

    changePassword: async (req, res) => {
        try {
            const userId = req.params.id;
            console.log('Attempting to change password for user:', userId);
            const { newPassword } = req.body;

            const user = await User.findById(userId);
            if (!user) {
                console.log('User not found:', userId);
                return res.status(404).json({ message: "User not found" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            user.password = hashedPassword;
            user.isTemporaryPassword = false;
            if (user.status === "unverified") {
                user.status = "verified";
            }
            await user.save();

            res.status(200).json({ message: "Password changed successfully" });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({ message: "Error changing password", error: error.message });
        }
    },

    registerUser: async (req, res) => {
        try {
            const { firstname, lastname, middlename, email, phone, password, role } = req.body;
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User with this email already exists" });
            }
            
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const newUser = new User({
                firstname,
                lastname,
                middlename: middlename || "",
                email,
                phone,
                password: hashedPassword,
                role
            });
            
            await newUser.save();
            
            res.status(201).json({ message: "User registered successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error registering user", error: error.message });
        }
    },

    verifyToken: async (req, res) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ valid: false });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return res.status(401).json({ valid: false });
            }

            res.json({ valid: true, user });
        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({ valid: false });
        }
    },

    verifyEmail: async (req, res) => {
        try {
            const { token } = req.params;
            console.log('Received verification token:', token);
            
            if (!token) {
                return res.status(400).json({ message: "Verification token is required" });
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            const user = await User.findById(decoded.id);
            console.log('Found user:', user ? 'yes' : 'no');
            
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.status === "verified") {
                return res.status(400).json({ message: "Email already verified" });
            }
            user.status = "verified";
            await user.save();
            console.log('User verified successfully');

            res.status(200).json({ 
                message: "Email verified successfully",
                redirectUrl: `${process.env.FRONTEND_URL}/login`
            });
        } catch (error) {
            console.error('Email verification error:', error);
            if (error.name === 'JsonWebTokenError') {
                return res.status(400).json({ message: "Invalid verification token" });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(400).json({ message: "Verification link has expired" });
            }
            res.status(500).json({ 
                message: "Error verifying email",
                error: error.message 
            });
        }
    },
    forgotPassword: async (req, res) => {
        try {
            // Add debug logging
            console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
            
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Generate a unique reset token
            const resetToken = uuidv4();
            const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

            // Save the reset token to the user
            user.resetToken = resetToken;
            user.resetTokenExpiry = resetTokenExpiry;
            await user.save();

            // Send reset email
            const resetLink = `${process.env.FRONTEND_URL}/change-password?token=${resetToken}&userId=${user._id}`;
            console.log('Generated reset link:', resetLink); // Debug log
            
            await emailService.sendPasswordResetEmail(user.email, resetLink);

            res.status(200).json({ message: "Password reset instructions sent to your email" });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ message: "Error processing forgot password request", error: error.message });
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { token } = req.params;
            const { newPassword } = req.body;
            
            console.log('Reset password attempt with token:', token);
            
            const user = await User.findOne({
                resetToken: token,
                resetTokenExpiry: { $gt: Date.now() }
            });

            if (!user) {
                console.log('No user found with valid reset token');
                return res.status(400).json({ message: "Invalid or expired reset token" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            user.password = hashedPassword;
            user.resetToken = undefined;
            user.resetTokenExpiry = undefined;
            await user.save();

            res.status(200).json({ message: "Password reset successful" });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({ message: "Error resetting password", error: error.message });
        }
    },
    updateUserStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            console.log(`Updating user status: User ID=${id}, New Status=${status}`);
            
            // Validate the status value
            if (!status) {
                console.error('Status value is missing in request body');
                return res.status(400).json({ message: "Status value is required" });
            }
            
            if (!["verified", "deactivated"].includes(status)) {
                console.error(`Invalid status value: ${status}`);
                return res.status(400).json({ message: "Invalid status value" });
            }
            
            // Find the user
            const user = await User.findById(id);
            if (!user) {
                console.error(`User not found with ID: ${id}`);
                return res.status(404).json({ message: "User not found" });
            }
            
            console.log(`Found user: ${user.email}, Current status=${user.status}, New status=${status}`);
            
            // Prevent deactivating the last active admin user
            if (status === "deactivated" && user.role === "admin") {
                const activeAdmins = await User.countDocuments({ role: "admin", status: "verified" });
                console.log(`Active admins count: ${activeAdmins}`);
                
                if (activeAdmins <= 1) {
                    console.error('Cannot deactivate the last active admin');
                    return res.status(400).json({ message: "Cannot deactivate the last active admin" });
                }
            }
            
            // Update the user status without triggering full validation
            await User.findByIdAndUpdate(
                id,
                { status: status },
                { runValidators: false }
            );
            
            console.log(`User status updated successfully: ${user.email}, New status=${status}`);
            
            // Get the updated user to return in response
            const updatedUser = await User.findById(id).select('-password');
            
            res.status(200).json({ 
                message: `User ${status === "deactivated" ? "deactivated" : "activated"} successfully`,
                user: updatedUser
            });
        } catch (error) {
            console.error('Update user status error:', error);
            res.status(500).json({ message: "Error updating user status", error: error.message });
        }
    },
    validateEmail,
    sendVerificationEmail: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.status === "verified") {
                return res.status(400).json({ message: "User is already verified" });
            }

            await emailService.sendVerificationEmail(user);
            
            res.status(200).json({ message: "Verification email sent successfully" });
        } catch (error) {
            console.error('Error sending verification email:', error);
            res.status(500).json({ 
                message: "Error sending verification email",
                error: error.message 
            });
        }
    },
};

module.exports = userController;

