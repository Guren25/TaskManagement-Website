const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userController = {
    getAllUsers: async (req, res) => {
        try {
            const users = await User.find().select("-password");
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
            const { firstname, lastname, middlename, email, password, role } = req.body;
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User already exists with this email" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = new User({
                firstname,
                lastname,
                middlename,
                email,
                password: hashedPassword,
                role
            });

            await user.save();
            const userResponse = user.toObject();
            delete userResponse.password;

            res.status(201).json(userResponse);
        } catch (error) {
            res.status(500).json({ message: "Error creating user", error: error.message });
        }
    },

    updateUser: async (req, res) => {
        try {
            const { firstname, lastname, middlename, email, role } = req.body;
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
                    role
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
            
            // Find user by email
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            // Compare password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user._id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Remove password from user object
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
            const { firstname, lastname, middlename, email, password, role } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User with this email already exists" });
            }
            
            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Create new user
            const newUser = new User({
                firstname,
                lastname,
                middlename: middlename || "",
                email,
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
};

module.exports = userController;

