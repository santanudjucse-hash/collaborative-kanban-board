import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { SearchBar } from '../components/SearchBar';
import { Filters } from '../components/Filters';
import { Task } from '../types/Task';

const SAMPLE_TASK: Task = {
  id: 't-101',
  title: 'Setup Production CI/CD Pipeline',
  description: 'Configure GitHub Actions for automated lint, test, and docker build.',
  priority: 'high',
  assignee: 'Santanu',
  status: 'Backlog',
  position: 0,
  updatedAt: new Date().toISOString(),
};

describe('Kanban UI Components', () => {
  it('renders TaskCard with title, priority badge, and assignee', () => {
    const handleClick = vi.fn();
    render(<TaskCard task={SAMPLE_TASK} onClick={handleClick} />);

    expect(screen.getByText('Setup Production CI/CD Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/Configure GitHub Actions/)).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Santanu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Setup Production CI/CD Pipeline'));
    expect(handleClick).toHaveBeenCalledWith(SAMPLE_TASK);
  });

  it('renders KanbanColumn header with title and task count', () => {
    const handleTaskClick = vi.fn();
    const handleAddTask = vi.fn();

    render(
      <KanbanColumn
        status="Backlog"
        tasks={[SAMPLE_TASK]}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTask}
        pendingTaskIds={new Set()}
      />
    );

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Count badge
    expect(screen.getByText('Setup Production CI/CD Pipeline')).toBeInTheDocument();

    // Click quick add button in column header
    const addBtn = screen.getByLabelText('Add task to Backlog');
    fireEvent.click(addBtn);
    expect(handleAddTask).toHaveBeenCalledWith('Backlog');
  });

  it('renders empty state in KanbanColumn when tasks array is empty', () => {
    render(
      <KanbanColumn
        status="Done"
        tasks={[]}
        onTaskClick={vi.fn()}
        onAddTask={vi.fn()}
        pendingTaskIds={new Set()}
      />
    );

    expect(screen.getByText('No tasks in this column')).toBeInTheDocument();
  });

  it('renders TaskModal and validates required inputs before submitting', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <TaskModal
        isOpen={true}
        onClose={handleClose}
        defaultStatus="Todo"
        onSave={handleSave}
      />
    );

    expect(screen.getByText('Create New Task')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(/Integrate OAuth2/i);
    const assigneeInput = screen.getByPlaceholderText(/Santanu or Alex/i);
    const submitBtn = screen.getByRole('button', { name: /Create Task/i });

    // Submit with empty inputs
    await userEvent.click(submitBtn);
    expect(handleSave).not.toHaveBeenCalled();

    // Fill in valid data
    await userEvent.type(titleInput, 'New Feature Task');
    await userEvent.type(assigneeInput, 'Santanu');
    await userEvent.click(submitBtn);

    expect(handleSave).toHaveBeenCalledWith({
      title: 'New Feature Task',
      description: '',
      priority: 'medium',
      assignee: 'Santanu',
      status: 'Todo',
    });
  });

  it('renders SearchBar and handles query typing and clearing', async () => {
    const handleChange = vi.fn();
    render(<SearchBar value="Test Search" onChange={handleChange} />);

    expect(screen.getByDisplayValue('Test Search')).toBeInTheDocument();

    const clearBtn = screen.getByLabelText('Clear search');
    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('renders Filters and triggers priority and assignee change', () => {
    const handlePriority = vi.fn();
    const handleAssignee = vi.fn();
    const handleReset = vi.fn();

    render(
      <Filters
        filters={{ search: 'Auth', priority: 'high', assignee: 'Santanu' }}
        availableAssignees={['Alex Chen', 'Santanu', 'Sarah Miller']}
        onPriorityChange={handlePriority}
        onAssigneeChange={handleAssignee}
        onReset={handleReset}
      />
    );

    // Change priority
    const prioritySelect = screen.getByLabelText('Filter by priority');
    fireEvent.change(prioritySelect, { target: { value: 'low' } });
    expect(handlePriority).toHaveBeenCalledWith('low');

    // Change assignee
    const assigneeSelect = screen.getByLabelText('Filter by assignee');
    fireEvent.change(assigneeSelect, { target: { value: 'Sarah Miller' } });
    expect(handleAssignee).toHaveBeenCalledWith('Sarah Miller');

    // Click reset button
    const resetBtn = screen.getByTitle('Reset all search and filter conditions');
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalled();
  });
});
