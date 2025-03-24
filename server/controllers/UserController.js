const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const emailService = require("../utils/emailService");
const emailValidator = require("email-validator");
const dns = require("dns");

const validateEmail = (email) => {
    try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                isValid: false,
                message: "Invalid email format"
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
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User already exists with this email" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const emailValidation = await validateEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({ message: emailValidation.message });
            }

            const user = new User({
                firstname,
                lastname,
                middlename,
                email,
                password: hashedPassword,
                role,
                phone,
                isTemporaryPassword: isTemporaryPassword || false,
                status: "active"
            });

            await user.save();
            
            if (isTemporaryPassword) {
                try {
                    await emailService.sendWelcomeEmail(user, password);
                    console.log(`Welcome email sent to ${email} with temporary password`);
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                }
            }
            
            const userResponse = user.toObject();
            delete userResponse.password;

            res.status(201).json(userResponse);
        } catch (error) {
            res.status(500).json({ message: "Error creating user", error: error.message });
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

    validateEmail,
};

module.exports = userController;

