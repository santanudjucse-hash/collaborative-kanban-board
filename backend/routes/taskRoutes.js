const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// GET /api/board
router.get('/board', taskController.getBoard);

// POST /api/tasks
router.post('/tasks', taskController.createTask);

// PATCH /api/tasks/:id
router.patch('/tasks/:id', taskController.updateTask);

// DELETE /api/tasks/:id
router.delete('/tasks/:id', taskController.deleteTask);

module.exports = router;
