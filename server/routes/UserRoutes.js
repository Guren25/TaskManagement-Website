const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');

// Authentication routes
router.post('/login', userController.loginUser);
router.post('/register', userController.createUser);

// User management routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
