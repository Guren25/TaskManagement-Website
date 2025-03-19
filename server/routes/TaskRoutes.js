const express = require('express');
const router = express.Router();
const taskController = require('../controllers/TaskController');


router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskByID);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);


router.get('/filter/status/:Status', taskController.getTaskByStatus);
router.get('/filter/priority/:Priority', taskController.getTaskByPriority);
router.get('/filter/location/:Location', taskController.getTaskByLocation);
router.get('/filter/assigned/:AssignedTo', taskController.getTaskByAssignedTo);
router.get('/filter/taskid/:TaskID', taskController.getTaskByTaskID);
router.get('/filter/name/:TaskName', taskController.getTaskByTaskName);


router.get('/filter/created/:CreatedAt', taskController.getTaskByCreatedAt);
router.get('/filter/updated/:UpdatedAt', taskController.getTaskByUpdatedAt);
router.get('/filter/start/:StartDate', taskController.getTaskByStartDate);
router.get('/filter/end/:EndDate', taskController.getTaskByEndDate);


router.get('/filter/subtask/:Subtask', taskController.getTaskBySubtask);


router.post('/:id/subtask', taskController.addSubtask);
router.patch('/:taskId/subtask/:subtaskId/status', taskController.updateSubtaskStatus);

// Status update routes
router.patch('/:id/status', taskController.updateTaskStatus);

router.get('/:taskId/subtask/filter/priority/:Priority', taskController.getSubtasksByPriority);

module.exports = router;
