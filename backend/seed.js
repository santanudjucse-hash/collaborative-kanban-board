const { Task } = require('./models/Task');
const { connectDB, disconnectDB } = require('./config/db');

// Realistic sample tasks distributed across all four columns (Backlog, Todo, In Progress, Done)
const SAMPLE_TASKS = [
  // Backlog
  {
    title: 'OAuth2 Social Login Integration',
    description: 'Implement Google and GitHub single sign-on providers using modern PKCE flow.',
    priority: 'high',
    assignee: 'Santanu',
    status: 'Backlog',
    position: 0,
  },
  {
    title: 'Audit Logging & Compliance Exports',
    description: 'Track all task mutation events in an append-only audit log with CSV/JSON export capability.',
    priority: 'medium',
    assignee: 'Alex Chen',
    status: 'Backlog',
    position: 1,
  },
  {
    title: 'Custom Column Status Manager',
    description: 'Allow team leads to configure custom workflow stages beyond the default 4 columns.',
    priority: 'low',
    assignee: 'Sarah Miller',
    status: 'Backlog',
    position: 2,
  },

  // Todo
  {
    title: 'Real-Time Conflict Resolution Banner',
    description: 'Surface non-intrusive toasts when concurrent editors modify the same card simultaneously.',
    priority: 'high',
    assignee: 'Santanu',
    status: 'Todo',
    position: 0,
  },
  {
    title: 'Keyboard Shortcuts for Board Navigation',
    description: 'Support J/K navigation, C for new task, and ? for shortcut cheatsheet.',
    priority: 'low',
    assignee: 'David Patel',
    status: 'Todo',
    position: 1,
  },
  {
    title: 'Batch Task Archival Utility',
    description: 'Enable multi-select actions to archive completed cards older than 30 days.',
    priority: 'medium',
    assignee: 'Alex Chen',
    status: 'Todo',
    position: 2,
  },

  // In Progress
  {
    title: 'SSE Connection Resiliency & Reconnect Loop',
    description: 'Add exponential backoff with jitter for native browser EventSource dropouts.',
    priority: 'high',
    assignee: 'Santanu',
    status: 'In Progress',
    position: 0,
  },
  {
    title: 'Drag & Drop Smooth Haptic Animations',
    description: 'Fine-tune @dnd-kit sensor tolerances and CSS transform curves for buttery smooth card drops.',
    priority: 'medium',
    assignee: 'Sarah Miller',
    status: 'In Progress',
    position: 1,
  },
  {
    title: 'URL Query Param Filter Synchronization',
    description: 'Ensure search, priority, and assignee filters serialize seamlessly into browser history.',
    priority: 'high',
    assignee: 'David Patel',
    status: 'In Progress',
    position: 2,
  },

  // Done
  {
    title: 'MongoDB Schema Indexes Optimization',
    description: 'Created compound index on { status: 1, position: 1 } for zero-latency column queries.',
    priority: 'high',
    assignee: 'Santanu',
    status: 'Done',
    position: 0,
  },
  {
    title: 'Optimistic UI Engine with Rollback Cache',
    description: 'Designed local state snapshotting that reverts gracefully upon simulated network drops.',
    priority: 'high',
    assignee: 'Santanu',
    status: 'Done',
    position: 1,
  },
  {
    title: 'Dark Mode SaaS Design System',
    description: 'Constructed cohesive Tailwind styling with Linear/Notion inspired aesthetics and badges.',
    priority: 'medium',
    assignee: 'Sarah Miller',
    status: 'Done',
    position: 2,
  },
];

/**
 * Safely seeds the database with initial tasks if none exist.
 * Avoids duplicate tasks on repeated server restarts.
 */
const seedInitialData = async () => {
  try {
    const existingCount = await Task.countDocuments();
    if (existingCount > 0) {
      console.log(`[Seed] Database already contains ${existingCount} tasks. Skipping initial seeding.`);
      return;
    }

    console.log('[Seed] Seeding 12 sample tasks across all columns...');
    for (const taskData of SAMPLE_TASKS) {
      await Task.create(taskData);
    }
    console.log('[Seed] Successfully seeded initial Kanban board tasks.');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err.message);
  }
};

// Standalone execution script
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      // Force re-seed when run explicitly via `npm run seed`
      console.log('[Seed] Wiping existing tasks for clean manual re-seed...');
      await Task.deleteMany({});
      for (const taskData of SAMPLE_TASKS) {
        await Task.create(taskData);
      }
      console.log('[Seed] Fresh database seed completed successfully!');
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seed] Manual seed failed:', err);
      process.exit(1);
    }
  })();
}

module.exports = { seedInitialData, SAMPLE_TASKS };
