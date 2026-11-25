import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BoardColumns, Status, Task } from '../types/Task';
import { ORDERED_COLUMNS } from '../utils/taskUtils';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';

interface KanbanBoardProps {
  columns: BoardColumns;
  filteredTasksByColumn: Record<Status, Task[]>;
  onTaskClick: (task: Task) => void;
  onAddTask: (status: Status) => void;
  onMoveTask: (taskId: string, targetStatus: Status, targetIndex: number) => void;
  pendingTaskIds: Set<string>;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  filteredTasksByColumn,
  onTaskClick,
  onAddTask,
  onMoveTask,
  pendingTaskIds,
}) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors: PointerSensor with 5px distance constraint allows clicking cards without triggering drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskData = active.data.current?.task as Task;
    if (taskData) {
      setActiveTask(taskData);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // 1. Identify which column and index the item was dropped onto
    let targetStatus: Status | null = null;
    let targetIndex = 0;

    // Case A: Dropped directly over a column container
    if (ORDERED_COLUMNS.includes(overId as Status)) {
      targetStatus = overId as Status;
      targetIndex = columns[targetStatus].length; // Drop at bottom of column
    } else {
      // Case B: Dropped over another task card
      for (const col of ORDERED_COLUMNS) {
        const foundIdx = columns[col].findIndex((t) => t.id === overId);
        if (foundIdx !== -1) {
          targetStatus = col;
          targetIndex = foundIdx;
          break;
        }
      }
    }

    if (!targetStatus) return;

    // Trigger optimistic move
    onMoveTask(activeTaskId, targetStatus, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <main className="max-w-7xl mx-auto px-4 py-6 w-full">
        {/* Four Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {ORDERED_COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={filteredTasksByColumn[status] || []}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              pendingTaskIds={pendingTaskIds}
            />
          ))}
        </div>
      </main>

      {/* Floating Drag Overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask ? (
          <div className="rotate-2 scale-105 pointer-events-none opacity-95">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
