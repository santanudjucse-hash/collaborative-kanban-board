const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const { Task } = require('../models/Task');
const eventService = require('../services/eventService');

let mongoServer;

beforeAll(async () => {
  const localUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/kanban_board_test';
  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  eventService.destroy();
  if (mongoose.connection.readyState !== 0) {
    await Task.deleteMany({});
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Task.deleteMany({});
});

describe('1. Board API (GET /api/board)', () => {
  it('should return board with four columns in correct order', async () => {
    // Seed one task in Backlog and one in Done
    await Task.create({
      title: 'Backlog Item 1',
      status: 'Backlog',
      priority: 'high',
      assignee: 'Alice',
      position: 0,
    });
    await Task.create({
      title: 'Done Item 1',
      status: 'Done',
      priority: 'low',
      assignee: 'Bob',
      position: 0,
    });

    const res = await request(app).get('/api/board');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('Backlog');
    expect(res.body).toHaveProperty('Todo');
    expect(res.body).toHaveProperty('In Progress');
    expect(res.body).toHaveProperty('Done');

    expect(res.body.Backlog).toHaveLength(1);
    expect(res.body.Backlog[0].title).toBe('Backlog Item 1');
    expect(res.body.Backlog[0].id).toBeDefined();
    expect(res.body.Done).toHaveLength(1);
    expect(res.body.Todo).toHaveLength(0);
    expect(res.body['In Progress']).toHaveLength(0);
  });

  it('should sort tasks ascending by position within each column', async () => {
    await Task.create({ title: 'Task pos 2', status: 'Todo', priority: 'medium', assignee: 'Charlie', position: 2 });
    await Task.create({ title: 'Task pos 0', status: 'Todo', priority: 'medium', assignee: 'Charlie', position: 0 });
    await Task.create({ title: 'Task pos 1', status: 'Todo', priority: 'medium', assignee: 'Charlie', position: 1 });

    const res = await request(app).get('/api/board');
    expect(res.status).toBe(200);
    expect(res.body.Todo).toHaveLength(3);
    expect(res.body.Todo[0].position).toBe(0);
    expect(res.body.Todo[0].title).toBe('Task pos 0');
    expect(res.body.Todo[1].position).toBe(1);
    expect(res.body.Todo[1].title).toBe('Task pos 1');
    expect(res.body.Todo[2].position).toBe(2);
    expect(res.body.Todo[2].title).toBe('Task pos 2');
  });
});

describe('2. Task Creation API (POST /api/tasks)', () => {
  it('should create a new task with valid data and auto-assign position and uuid', async () => {
    const payload = {
      title: 'Implement Dark Mode',
      description: 'Support high contrast palette',
      priority: 'high',
      assignee: 'Santanu',
      status: 'In Progress',
    };

    const res = await request(app).post('/api/tasks').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.title).toBe(payload.title);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.priority).toBe('high');
    expect(res.body.assignee).toBe('Santanu');
    expect(res.body.status).toBe('In Progress');
    expect(res.body.position).toBe(0);
    expect(res.body.id).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();

    // Verify in database
    const inDb = await Task.findOne({ id: res.body.id });
    expect(inDb).not.toBeNull();
    expect(inDb.title).toBe(payload.title);
  });

  it('should reject task creation with missing title or assignee', async () => {
    const resNoTitle = await request(app).post('/api/tasks').send({
      assignee: 'Santanu',
      status: 'Todo',
    });
    expect(resNoTitle.status).toBe(400);
    expect(resNoTitle.body.error).toMatch(/Title is required/i);

    const resNoAssignee = await request(app).post('/api/tasks').send({
      title: 'Some Task',
      status: 'Todo',
    });
    expect(resNoAssignee.status).toBe(400);
    expect(resNoAssignee.body.error).toMatch(/Assignee is required/i);
  });

  it('should append task to bottom of column if position is omitted', async () => {
    await Task.create({ title: 'Task 1', status: 'Backlog', priority: 'low', assignee: 'Dev', position: 0 });
    await Task.create({ title: 'Task 2', status: 'Backlog', priority: 'low', assignee: 'Dev', position: 1 });

    const res = await request(app).post('/api/tasks').send({
      title: 'Task 3',
      status: 'Backlog',
      assignee: 'Dev',
    });

    expect(res.status).toBe(201);
    expect(res.body.position).toBe(2);
  });
});

describe('3. Task Update API (PATCH /api/tasks/:id)', () => {
  it('should update task title, description, priority, and assignee', async () => {
    const task = await Task.create({
      title: 'Original Title',
      description: 'Original Desc',
      priority: 'low',
      assignee: 'Dev 1',
      status: 'Todo',
      position: 0,
    });

    const res = await request(app).patch(`/api/tasks/${task.id}`).send({
      title: 'Updated Title',
      priority: 'high',
      assignee: 'Lead Dev',
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Title');
    expect(res.body.priority).toBe('high');
    expect(res.body.assignee).toBe('Lead Dev');
    expect(res.body.description).toBe('Original Desc');
  });

  it('should return 404 for nonexistent task ID', async () => {
    const res = await request(app).patch('/api/tasks/non-existent-id').send({
      title: 'New Title',
    });
    expect(res.status).toBe(404);
  });

  it('should handle moving task between columns and recalculate positions', async () => {
    const task1 = await Task.create({ title: 'T1', status: 'Todo', priority: 'low', assignee: 'A', position: 0 });
    const task2 = await Task.create({ title: 'T2', status: 'Todo', priority: 'low', assignee: 'A', position: 1 });
    const taskDone = await Task.create({ title: 'Done 1', status: 'Done', priority: 'low', assignee: 'A', position: 0 });

    // Move task1 from Todo (pos 0) to Done at pos 0
    const res = await request(app).patch(`/api/tasks/${task1.id}`).send({
      status: 'Done',
      position: 0,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Done');
    expect(res.body.position).toBe(0);

    // Old column: task2 should now have shifted to position 0
    const updatedTask2 = await Task.findOne({ id: task2.id });
    expect(updatedTask2.position).toBe(0);

    // New column: taskDone should have shifted to position 1
    const updatedDone = await Task.findOne({ id: taskDone.id });
    expect(updatedDone.position).toBe(1);
  });

  it('should handle reordering tasks within the same column', async () => {
    const t0 = await Task.create({ title: 'Task 0', status: 'Todo', priority: 'low', assignee: 'A', position: 0 });
    const t1 = await Task.create({ title: 'Task 1', status: 'Todo', priority: 'low', assignee: 'A', position: 1 });
    const t2 = await Task.create({ title: 'Task 2', status: 'Todo', priority: 'low', assignee: 'A', position: 2 });

    // Move t2 (pos 2) to pos 0
    const res = await request(app).patch(`/api/tasks/${t2.id}`).send({
      position: 0,
    });

    expect(res.status).toBe(200);
    expect(res.body.position).toBe(0);

    const checkT0 = await Task.findOne({ id: t0.id });
    const checkT1 = await Task.findOne({ id: t1.id });
    expect(checkT0.position).toBe(1);
    expect(checkT1.position).toBe(2);
  });
});

describe('4. Task Deletion API (DELETE /api/tasks/:id)', () => {
  it('should delete task and close position gap', async () => {
    const t0 = await Task.create({ title: 'Task 0', status: 'Backlog', priority: 'low', assignee: 'A', position: 0 });
    const t1 = await Task.create({ title: 'Task 1', status: 'Backlog', priority: 'low', assignee: 'A', position: 1 });
    const t2 = await Task.create({ title: 'Task 2', status: 'Backlog', priority: 'low', assignee: 'A', position: 2 });

    const res = await request(app).delete(`/api/tasks/${t1.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe(t1.id);

    // Verify t1 is gone
    const checkT1 = await Task.findOne({ id: t1.id });
    expect(checkT1).toBeNull();

    // Verify t2 shifted from pos 2 to pos 1
    const checkT2 = await Task.findOne({ id: t2.id });
    expect(checkT2.position).toBe(1);
  });

  it('should return 404 when deleting nonexistent task', async () => {
    const res = await request(app).delete('/api/tasks/fake-id');
    expect(res.status).toBe(404);
  });
});

describe('5. Error Simulation & Rollback Trigger (x-simulate-failure)', () => {
  it('should respond with 500 when x-simulate-failure header is sent', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('x-simulate-failure', 'true')
      .send({
        title: 'Failing Task',
        assignee: 'Tester',
        status: 'Todo',
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Simulated API failure/i);
  });
});

describe('6. Real-time Events (GET /api/events)', () => {
  it('should establish SSE connection and set correct stream headers', (done) => {
    request(app)
      .get('/api/events')
      .expect('Content-Type', /text\/event-stream/)
      .expect('Cache-Control', /no-cache/)
      .expect('Connection', /keep-alive/)
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        done();
      });
  });
});
