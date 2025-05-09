const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const auth = require('../middleware/auth');

router.post('/login', userController.login);
router.post('/register', userController.createUser);
router.get('/verify-token', auth, userController.verifyToken);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);
router.post('/:id/change-password', auth, userController.changePassword);
router.patch('/:id/status', userController.updateUserStatus);

module.exports = router;
