const { Task, VALID_PRIORITIES, VALID_STATUSES } = require('../models/Task');
const eventService = require('../services/eventService');
const { v4: uuidv4 } = require('uuid');

const ORDERED_COLUMNS = ['Backlog', 'Todo', 'In Progress', 'Done'];

/**
 * GET /api/board
 * Fetches all tasks, grouped by status in exact column order, sorted by position.
 */
const getBoard = async (req, res, next) => {
  try {
    const tasks = await Task.find({}).sort({ position: 1, createdAt: 1 });

    // Group tasks into the four columns
    const board = {
      Backlog: [],
      Todo: [],
      'In Progress': [],
      Done: [],
    };

    tasks.forEach((task) => {
      const taskObj = task.toJSON();
      if (board[task.status]) {
        board[task.status].push(taskObj);
      } else {
        board['Backlog'].push(taskObj);
      }
    });

    res.json(board);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tasks
 * Creates a new task, assigns position, saves to MongoDB, broadcasts TASK_CREATED.
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, assignee, status, position } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!assignee || !assignee.trim()) {
      return res.status(400).json({ error: 'Assignee is required' });
    }

    const taskStatus = status && VALID_STATUSES.includes(status) ? status : 'Backlog';
    const taskPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'medium';

    // Calculate position: if not provided or invalid, place at the bottom of the target column
    let taskPosition = typeof position === 'number' && position >= 0 ? position : null;
    if (taskPosition === null) {
      const lastTask = await Task.findOne({ status: taskStatus }).sort({ position: -1 });
      taskPosition = lastTask ? lastTask.position + 1 : 0;
    } else {
      // Shift existing tasks at >= taskPosition up by 1
      await Task.updateMany(
        { status: taskStatus, position: { $gte: taskPosition } },
        { $inc: { position: 1 } }
      );
    }

    const newTask = new Task({
      id: req.body.id || uuidv4(),
      title: title.trim(),
      description: description ? description.trim() : '',
      priority: taskPriority,
      assignee: assignee.trim(),
      status: taskStatus,
      position: taskPosition,
    });

    const savedTask = await newTask.save();
    const taskJson = savedTask.toJSON();

    // Broadcast TASK_CREATED event to connected clients
    eventService.broadcast('TASK_CREATED', taskJson);

    res.status(201).json(taskJson);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id
 * Updates task fields, status, or position. Re-indexes positions and broadcasts TASK_UPDATED.
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, priority, assignee, status: newStatus, position: newPosition } = req.body;

    // Search by custom id or Mongo _id
    const task = await Task.findOne({ $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] });

    if (!task) {
      return res.status(404).json({ error: `Task with id '${id}' not found` });
    }

    const oldStatus = task.status;
    const oldPosition = task.position;

    // Validate fields if provided
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: 'Title cannot be empty' });
      task.title = title.trim();
    }
    if (description !== undefined) {
      task.description = description.trim();
    }
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
      }
      task.priority = priority;
    }
    if (assignee !== undefined) {
      if (!assignee.trim()) return res.status(400).json({ error: 'Assignee cannot be empty' });
      task.assignee = assignee.trim();
    }

    // Handle movement between columns or reordering within column
    const isStatusChanging = newStatus !== undefined && newStatus !== oldStatus;
    const isPositionChanging = newPosition !== undefined && typeof newPosition === 'number' && newPosition !== oldPosition;

    if (isStatusChanging) {
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      // Close gap in old column
      await Task.updateMany(
        { status: oldStatus, position: { $gt: oldPosition } },
        { $inc: { position: -1 } }
      );

      // Determine target position in new column
      let targetPos = newPosition;
      if (typeof targetPos !== 'number' || targetPos < 0) {
        const lastInNew = await Task.findOne({ status: newStatus }).sort({ position: -1 });
        targetPos = lastInNew ? lastInNew.position + 1 : 0;
      } else {
        // Shift tasks in new column at >= targetPos up by 1
        await Task.updateMany(
          { status: newStatus, position: { $gte: targetPos } },
          { $inc: { position: 1 } }
        );
      }

      task.status = newStatus;
      task.position = targetPos;
    } else if (isPositionChanging) {
      // Reordering within the same column
      const targetPos = Math.max(0, newPosition);

      if (targetPos > oldPosition) {
        // Shift items between (oldPosition, targetPos] down by 1
        await Task.updateMany(
          { status: oldStatus, position: { $gt: oldPosition, $lte: targetPos }, id: { $ne: task.id } },
          { $inc: { position: -1 } }
        );
      } else if (targetPos < oldPosition) {
        // Shift items between [targetPos, oldPosition) up by 1
        await Task.updateMany(
          { status: oldStatus, position: { $gte: targetPos, $lt: oldPosition }, id: { $ne: task.id } },
          { $inc: { position: 1 } }
        );
      }

      task.position = targetPos;
    }

    // Explicitly update updatedAt timestamp
    task.updatedAt = new Date();

    const updatedTask = await task.save();
    const taskJson = updatedTask.toJSON();

    // Broadcast TASK_UPDATED to all connected clients
    eventService.broadcast('TASK_UPDATED', taskJson);

    res.json(taskJson);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/tasks/:id
 * Deletes a task from MongoDB, adjusts remaining column positions, broadcasts TASK_DELETED.
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findOne({ $or: [{ id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }] });

    if (!task) {
      return res.status(404).json({ error: `Task with id '${id}' not found` });
    }

    const { status, position, id: taskId } = task;

    await Task.deleteOne({ _id: task._id });

    // Shift remaining tasks in this column down by 1 to fill the position gap
    await Task.updateMany(
      { status, position: { $gt: position } },
      { $inc: { position: -1 } }
    );

    // Broadcast TASK_DELETED event
    eventService.broadcast('TASK_DELETED', { id: taskId, status });

    res.json({
      success: true,
      message: 'Task deleted successfully',
      id: taskId,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBoard,
  createTask,
  updateTask,
  deleteTask,
};
