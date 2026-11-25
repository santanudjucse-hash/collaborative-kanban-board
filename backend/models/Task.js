const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const VALID_PRIORITIES = ['low', 'medium', 'high'];
const VALID_STATUSES = ['Backlog', 'Todo', 'In Progress', 'Done'];

const taskSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => uuidv4(),
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: VALID_PRIORITIES,
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    assignee: {
      type: String,
      required: [true, 'Assignee is required'],
      trim: true,
      maxlength: [100, 'Assignee name cannot exceed 100 characters'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: VALID_STATUSES,
        message: 'Status must be Backlog, Todo, In Progress, or Done',
      },
      default: 'Backlog',
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret.id || ret._id.toString();
        ret.updatedAt = ret.updatedAt ? ret.updatedAt.toISOString() : new Date().toISOString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret) {
        ret.id = ret.id || ret._id.toString();
        ret.updatedAt = ret.updatedAt ? ret.updatedAt.toISOString() : new Date().toISOString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for efficient querying and ordering by status and position
taskSchema.index({ status: 1, position: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = { Task, VALID_PRIORITIES, VALID_STATUSES };
