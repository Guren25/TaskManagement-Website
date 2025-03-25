const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const emailService = require("../utils/emailService");
const emailValidator = require("email-validator");
const dns = require("dns");
const { promisify } = require('util');

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
                status: "unverified"  // Explicitly set status
            });

            // Save user first
            const savedUser = await user.save();
            
            // Then attempt to send verification email
            try {
                await emailService.sendVerificationEmail(savedUser);
                console.log(`Verification email sent to ${email}`);
            } catch (emailError) {
                console.error('Failed to send verification email:', emailError);
                // Delete the user if we couldn't send the verification email
                await User.findByIdAndDelete(savedUser._id);
                return res.status(500).json({ 
                    message: "Failed to send verification email",
                    error: emailError.message 
                });
            }
            
            const userResponse = savedUser.toObject();
            delete userResponse.password;

            res.status(201).json({
                ...userResponse,
                message: "Please check your email to verify your account"
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

            // Check if user is verified
            if (user.status === "unverified") {
                return res.status(401).json({ 
                    message: "Please verify your email before logging in",
                    unverified: true
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            const userResponse = user.toObject();
            delete userResponse.password;

            res.status(200).json({
                token,
                user: userResponse
            });
        } catch (error) {
            res.status(500).json({ message: "Error logging in", error: error.message });
        }
    },

    changePassword: async (req, res) => {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.params.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: "Current password is incorrect" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            user.password = hashedPassword;
            await user.save();

            res.status(200).json({ message: "Password updated successfully" });
        } catch (error) {
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

            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decoded token:', decoded);
            
            // Find and update the user
            const user = await User.findById(decoded.id);
            console.log('Found user:', user ? 'yes' : 'no');
            
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.status === "verified") {
                return res.status(400).json({ message: "Email already verified" });
            }

            // Update user status to verified
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

    validateEmail,
};

module.exports = userController;

