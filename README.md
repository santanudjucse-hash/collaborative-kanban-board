# 📋 Collaborative Kanban Board

A high-performance, real-time collaborative Kanban board web application with optimistic UI updates, automated rollback on failure, Server-Sent Events (SSE) synchronization, and persistent URL query parameter state.

---

## 1. Project Overview

The **Collaborative Kanban Board** is a modern project management tool inspired by Linear, Notion, and Trello. It allows multiple team members to concurrently manage, prioritize, and reorder tasks across four distinct workflow stages: **Backlog**, **Todo**, **In Progress**, and **Done**.

Changes made by any user—such as creating tasks, moving tasks between columns, reordering cards, editing details, or deleting tasks—stream instantly to all connected clients in real time using native browser `EventSource` and Server-Sent Events (SSE) without requiring any manual page refresh.

---

## 2. Key Features

- **Four Standardized Workflow Columns**: `Backlog`, `Todo`, `In Progress`, and `Done` in strict, uncompromised order.
- **Fluid Drag and Drop**: Powered by `@dnd-kit`, allowing seamless intra-column reordering and inter-column transitions with smooth collision detection and floating drag overlay.
- **Optimistic UI Updates with Automated Rollback**: Immediate UI response with deep immutable snapshots. If a network drop or server error occurs, the UI seamlessly reverts to the prior state and surfaces an informative error toast.
- **Real-Time Collaboration via Server-Sent Events (SSE)**: HTTP-based streaming with auto-reconnect, keepalive pings (every 15s), and immediate broadcasts (`TASK_CREATED`, `TASK_UPDATED`, `TASK_DELETED`).
- **Conflict Resolution & Pending Operation Guard**: Prevents incoming broadcast events from overwriting active local edits or in-flight drag operations.
- **Combined Search & Multi-Filters**: Filter simultaneously by title search (case-insensitive), priority (`all`, `low`, `medium`, `high`), and assignee. Filters strictly satisfy logical AND without mutating base datasets.
- **Synchronized URL State**: Preserves filter parameters (`?search=...&priority=...&assignee=...`) in browser URL query string; seamlessly restores filters on page reload and supports browser forward/back buttons.
- **Comprehensive Task Modal / Drawer**: View, edit, or create tasks with inline validation, priority selectors, and deletion confirmation safeguards.
- **Built-in Resilience Simulation Hook**: UI toggle and header (`x-simulate-failure: true`) to simulate 500 API errors and observe optimistic rollbacks live.
- **Linear/Notion-Inspired SaaS Design System**: Tailwind CSS dark-mode theme, custom scrollbars, subtle glowing indicators, and clean typography.
- **Safe Database Auto-Seeding**: Comes pre-populated with 12 realistic tasks across all columns on initial setup without duplicating data on server restarts.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler & Tooling**: Vite 6
- **Styling**: Tailwind CSS with custom animations and design tokens
- **Icons**: Lucide React
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- **HTTP Client**: Axios with request/response interceptors
- **Real-Time**: Native Browser `EventSource` (Server-Sent Events)
- **Unit & Integration Testing**: Vitest, React Testing Library, `@testing-library/jest-dom`, JSDOM

### Backend
- **Runtime**: Node.js (v18+)
- **Web Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-Time Engine**: Server-Sent Events (`text/event-stream`) with connection pooling and heartbeat keepalive
- **Identifier Generation**: UUIDv4 (`uuid`)
- **Testing**: Vitest, Supertest, MongoMemoryServer fallback

### Deployment
- **Frontend**: Vercel (`vercel.json` SPA configuration)
- **Backend**: Render / Railway (with persistent SSE and keepalive)
- **Database**: MongoDB Atlas

---

## 4. Project Architecture

```mermaid
flowchart TD
    subgraph Browser Clients
        ClientA["User A (Browser 1)"]
        ClientB["User B (Browser 2)"]
    end

    subgraph Frontend Architecture
        DndKit["@dnd-kit Engine"]
        OptimisticHook["useTasks (Optimistic State + Rollback)"]
        SSEHook["useSSE (EventSource Listener)"]
        URLHook["useUrlFilters (URLSearchParams)"]
        ToastManager["Toast Container (Error / Success)"]
    end

    subgraph Backend Architecture
        ExpressApp["Express.js Server (:5000)"]
        TaskController["Task Controller (/api/tasks)"]
        EventController["Event Controller (/api/events)"]
        EventService["SSE Connection Pool & Broadcaster"]
        SimMiddleware["Simulated Failure Middleware"]
    end

    subgraph Database
        MongoDB[(MongoDB / Atlas)]
    end

    ClientA -->|1. Drag / Edit Action| OptimisticHook
    OptimisticHook -->|2. Immediate UI Update| DndKit
    OptimisticHook -->|3. REST API Mutation| SimMiddleware
    SimMiddleware --> TaskController
    TaskController -->|4. Persist Changes| MongoDB
    TaskController -->|5. Broadcast Event| EventService
    EventService -->|6. Real-Time Stream (SSE)| ClientA
    EventService -->|6. Real-Time Stream (SSE)| ClientB
    ClientB --> SSEHook
    SSEHook -->|7. Reconcile External Change| OptimisticHook
```

---

## 5. Folder Structure

```text
.
├── backend/
│   ├── config/
│   │   └── db.js                 # Mongoose connection with auto-memory fallback
│   ├── controllers/
│   │   ├── taskController.js     # CRUD operations, position shifts, validations
│   │   └── eventController.js    # SSE client subscription endpoint
│   ├── middleware/
│   │   └── errorHandler.js       # Centralized error handler & failure simulator
│   ├── models/
│   │   └── Task.js               # Mongoose Schema with compound index { status, position }
│   ├── routes/
│   │   ├── taskRoutes.js         # /api/board, /api/tasks routes
│   │   └── eventRoutes.js        # /api/events route
│   ├── services/
│   │   └── eventService.js       # SSE client registry, heartbeats, broadcasting
│   ├── tests/
│   │   └── api.test.js           # 13 Supertest API integration tests
│   ├── seed.js                   # 12 initial sample tasks seeder
│   ├── server.js                 # Express server bootstrap & health check
│   ├── package.json
│   ├── vitest.config.js
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Filters.tsx       # Priority & Assignee dropdown filters
│   │   │   ├── KanbanBoard.tsx   # DndContext container & drag overlay
│   │   │   ├── KanbanColumn.tsx  # Droppable column with task counter & quick add
│   │   │   ├── Loading.tsx       # Shimmer skeleton loader
│   │   │   ├── Navbar.tsx        # Header, brand, search, live status, error simulation
│   │   │   ├── SearchBar.tsx     # Debounced live search with clear button
│   │   │   ├── TaskCard.tsx      # Draggable card, priority badge, avatar, timestamp
│   │   │   ├── TaskModal.tsx     # Create / Edit modal dialog with validation
│   │   │   └── Toast.tsx         # Notification alerts (rollback, error, success)
│   │   ├── hooks/
│   │   │   ├── useSSE.ts         # Native EventSource connection with backoff
│   │   │   ├── useTasks.ts       # Optimistic UI mutations, rollback snapshots & SSE reconciler
│   │   │   └── useUrlFilters.ts  # Browser history & URLSearchParams synchronization
│   │   ├── services/
│   │   │   └── api.ts            # Axios client with simulation header interceptor
│   │   ├── test/
│   │   │   ├── setup.ts          # Vitest test setup and EventSource polyfills
│   │   │   ├── components.test.tsx # UI component tests
│   │   │   ├── optimisticRollback.test.tsx # Rollback & URL state tests
│   │   │   └── taskUtils.test.ts # Filtering, initials, and formatting tests
│   │   ├── types/
│   │   │   └── Task.ts           # TypeScript interfaces and enum types
│   │   ├── utils/
│   │   │   └── taskUtils.ts      # Multi-criteria filtering & display helpers
│   │   ├── App.tsx               # Root component orchestrator
│   │   ├── index.css             # Tailwind base and scrollbar styling
│   │   ├── main.tsx              # React DOM entrypoint
│   │   └── vite-env.d.ts
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json               # SPA routing rewrite rule
│   ├── vite.config.ts
│   └── .env.example
│
├── README.md
├── package.json                  # Root orchestration package.json
└── .gitignore
```

---

## 6. Prerequisites

- **Node.js**: Version 18.0.0 or higher (`node -v`)
- **npm**: Version 9.0.0 or higher (`npm -v`)
- **MongoDB**: Local MongoDB instance (port 27017) OR a free MongoDB Atlas connection string URI. *(Note: An automatic in-memory fallback is also included for environments without local MongoDB!)*

---

## 7. Installation Instructions

Clone the repository and install dependencies for the root, backend, and frontend:

```bash
# 1. Clone repository
git clone <repository-url>
cd collaborative-kanban-board

# 2. Install root dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Install frontend dependencies
cd frontend && npm install && cd ..
```

---

## 8. Environment Variable Setup

### Backend Environment Variables
Create a `.env` file inside the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/kanban_board
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SIMULATE_FAILURE=false
```

### Frontend Environment Variables
Create a `.env` file inside the `frontend/` directory:

```env
# Leave blank during local development to use Vite's built-in proxy (/api -> :5000)
# Or provide absolute backend URL for production deployment:
VITE_API_URL=http://localhost:5000
```

---

## 9. How to Start the Application

### Option A: Run Both Concurrently (Recommended)
From the project root directory, run:

```bash
npm run dev
```
- Frontend will be available at: **http://localhost:5173**
- Backend will be available at: **http://localhost:5000**
- Health check: **http://localhost:5000/health**

### Option B: Run Services Individually

**Start Backend**:
```bash
cd backend
npm run dev
```

**Start Frontend**:
```bash
cd frontend
npm run dev
```

### Database Seeding
To manually reset and populate the database with the 12 sample tasks:
```bash
npm run seed
# or: cd backend && node seed.js
```

---

## 10. API Documentation

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/health` | Server uptime and health probe | `200` |
| `GET` | `/api/board` | Fetch all tasks grouped by status and sorted by position | `200` |
| `POST` | `/api/tasks` | Create new task, auto-assign position, broadcast `TASK_CREATED` | `201`, `400`, `500` |
| `PATCH` | `/api/tasks/:id` | Update fields/status/position, shift column gaps, broadcast `TASK_UPDATED` | `200`, `400`, `404`, `500` |
| `DELETE` | `/api/tasks/:id` | Delete task, close position gaps, broadcast `TASK_DELETED` | `200`, `404`, `500` |
| `GET` | `/api/events` | Server-Sent Events real-time event stream (`text/event-stream`) | `200` |

### Sample Task Payload:
```json
{
  "title": "OAuth2 Social Login Integration",
  "description": "Implement Google and GitHub single sign-on providers.",
  "priority": "high",
  "assignee": "Santanu",
  "status": "Backlog"
}
```

---

## 11. Database Configuration

The application uses **Mongoose** with MongoDB:
- **Task Schema**:
  - `id`: Unique UUIDv4 string index.
  - `title`: String (required, max 200 chars).
  - `description`: String (max 2000 chars).
  - `priority`: Enum (`'low' | 'medium' | 'high'`).
  - `assignee`: String (required).
  - `status`: Enum (`'Backlog' | 'Todo' | 'In Progress' | 'Done'`).
  - `position`: Number (0-indexed column order).
  - `updatedAt`: ISO 8601 Timestamp (auto-updated).
- **Compound Index**: `{ status: 1, position: 1 }` enables instantaneous ordering and filtering per column.
- **Transformation**: MongoDB's internal `_id` and `__v` are automatically transformed into the standard `id` field in all JSON responses.

---

## 12. Real-Time Collaboration (SSE) Implementation

1. **Native Browser Connection**: The frontend uses standard `new EventSource('/api/events')`.
2. **Server Headers**:
   - `Content-Type: text/event-stream`
   - `Cache-Control: no-cache, no-transform`
   - `Connection: keep-alive`
   - `X-Accel-Buffering: no` (disables reverse proxy buffering on Nginx/Render)
3. **Keepalive Pings**: The backend transmits heartbeat comments (`: ping <timestamp>`) every 15 seconds to prevent idle socket termination.
4. **Resilient Reconnection**: The frontend implements exponential backoff reconnection (1s -> 2s -> 4s -> max 10s) on network disconnects.
5. **Connection Pill**: Top navigation displays a real-time status indicator:
   - 🟢 **Live SSE**: Fully connected and streaming.
   - 🟡 **Connecting**: Re-establishing socket.
   - 🔴 **Offline (Retry)**: Disconnected with one-click retry.

---

## 13. Optimistic Updates and Rollback Explanation

To provide a zero-latency Linear-like user experience, the application implements **Optimistic UI Updates**:

1. **Snapshot Creation**: Before any mutation (create, edit, move, delete), a deep immutable clone of the board state is captured in memory.
2. **Immediate UI Update**: The React state updates immediately:
   - New tasks appear immediately with a temporary ID (`temp-*`) and a subtle `Syncing` badge.
   - Moved cards snap to their new column and position instantly.
   - Deleted cards vanish from view at once.
3. **Pending Operation Tracking**: The task ID is registered in `pendingOperationsRef` to prevent conflicts.
4. **Server Persistence**: The corresponding REST API request (`POST`, `PATCH`, `DELETE`) is executed in the background.
5. **Reconciliation**:
   - Upon success: The server response reconciles the temporary state with persisted server identifiers.
   - Upon failure: The board is **automatically restored to the exact snapshot state**, and an error toast notification surfaces the failure reason with optional retry actions.

---

## 14. Conflict Handling Strategy

When multiple users collaborate on the board at the same time:
- **Pending Operation Guard**: When an incoming `TASK_UPDATED` or `TASK_DELETED` SSE event arrives, the client checks if that specific task has an ongoing local optimistic operation.
- **Race Condition Prevention**: If a task is currently being dragged or edited locally, incoming server updates for that task are ignored until the local mutation settles.
- **Task-Level Granularity**: SSE events update only the specific affected task and column rather than causing a disruptive full-board reload.

---

## 15. Testing Instructions

The application features a complete test suite comprising **36 automated tests** (13 backend integration tests + 23 frontend unit/integration tests).

### Run All Tests:
```bash
npm run test:backend
npm run test:frontend
```

### Backend Test Coverage (`backend/tests/api.test.js`):
- ✅ `GET /api/board`: Grouping into 4 columns and ascending position sorting.
- ✅ `POST /api/tasks`: Input validation, UUID generation, position incrementing.
- ✅ `PATCH /api/tasks/:id`: Field updates, inter-column moving, intra-column reordering, position shifting.
- ✅ `DELETE /api/tasks/:id`: Card deletion and column gap closure.
- ✅ Input validation for missing title and assignee.
- ✅ 404 responses for nonexistent task IDs.
- ✅ Error simulation verification with `x-simulate-failure`.
- ✅ SSE connection headers and streaming stream response.

### Frontend Test Coverage (`frontend/src/test/`):
- ✅ Four columns render in exact sequence (`Backlog`, `Todo`, `In Progress`, `Done`).
- ✅ Task card rendering with priority badges, assignee initials, and relative times.
- ✅ Task modal form validation, field editing, and task creation.
- ✅ Combined multi-filter logic (Search + Priority + Assignee).
- ✅ URL query parameter restoration on initial load and navigation sync.
- ✅ Optimistic task creation rollback on API failure.
- ✅ Optimistic task edit rollback on API failure.
- ✅ Optimistic task deletion rollback on API failure.
- ✅ Optimistic drag-and-drop inter-column move rollback on API failure.

---

## 16. Deployment Instructions

### Frontend (Vercel)
1. Push project to your GitHub repository.
2. In Vercel, import the repository and set the **Root Directory** to `frontend`.
3. Set the Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://kanban-backend.onrender.com`).
4. Build command: `npm run build` | Output directory: `dist`.
5. The included `frontend/vercel.json` ensures client-side routing works on all routes.

### Backend (Render)
1. Create a new **Web Service** on Render and point it to your repository.
2. Set the **Root Directory** to `backend`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection string.
   - `CLIENT_URL`: Your deployed Vercel frontend URL.

### Database (MongoDB Atlas)
1. Create a free cluster on MongoDB Atlas.
2. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) or whitelist your Render server IP.
3. Under **Database Access**, create a user and copy the connection URI:
   `mongodb+srv://<user>:<password>@cluster0.mongodb.net/kanban_board?retryWrites=true&w=majority`
4. Provide this URI as `MONGODB_URI` in Render's environment settings.

---

## 17. Completed Features Checklist

- [x] React + TypeScript frontend with Vite.
- [x] Node.js + Express backend with REST API.
- [x] MongoDB database integration with Mongoose.
- [x] Four columns in exact order: Backlog, Todo, In Progress, Done.
- [x] Board fetching from `/api/board` grouped by status.
- [x] Create tasks with validation.
- [x] Edit tasks with title, description, priority, assignee, status.
- [x] Delete tasks with confirmation.
- [x] Drag tasks between columns.
- [x] Reorder tasks within columns.
- [x] Persist task status and position in database.
- [x] Search tasks by title (case-insensitive).
- [x] Filter by priority (low, medium, high).
- [x] Filter by assignee (dynamically populated).
- [x] Combined search and filtering (logical AND).
- [x] Task detail modal/drawer with validation.
- [x] Optimistic UI updates for all mutations.
- [x] API failure rollback to previous state.
- [x] User-friendly error notifications (Toasts).
- [x] Real-time SSE connection (`/api/events`).
- [x] `TASK_CREATED` event streaming.
- [x] `TASK_UPDATED` event streaming.
- [x] `TASK_DELETED` event streaming.
- [x] Multi-user real-time synchronization.
- [x] Conflict handling and pending operation guard.
- [x] URL query parameter synchronization (`?search=...&priority=...&assignee=...`).
- [x] Filter restoration after page refresh.
- [x] Responsive layout (Desktop, Tablet, Mobile).
- [x] Loading skeleton and empty states.
- [x] 13 Backend Supertest integration tests passing.
- [x] 23 Frontend Vitest / RTL tests passing.
- [x] Complete README documentation.
- [x] Environment variable documentation (`.env.example`).
- [x] Production build verified (`dist/`).
- [x] Clean Git repository with proper `.gitignore`.
- [x] Deployment-ready configuration (Vercel & Render).

---

## 18. Incomplete Features

- **None**: All functional and non-functional requirements specified in the machine coding brief have been fully implemented, tested, and verified.
