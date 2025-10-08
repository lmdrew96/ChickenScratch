'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Plus, X, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface OfficerTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
  assigned_to_profile?: { display_name: string; email: string };
  created_by_profile?: { display_name: string; email: string };
}

interface Officer {
  id: string;
  display_name: string;
  email: string;
}

export function TaskManager({ officers }: { officers: Officer[] }) {
  const [tasks, setTasks] = useState<OfficerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<OfficerTask | null>(null);
  const [filter, setFilter] = useState<{
    status?: string;
    priority?: string;
    assigned_to?: string;
  }>({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/officer/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingTask
      ? `/api/officer/tasks/${editingTask.id}`
      : '/api/officer/tasks';
    const method = editingTask ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assigned_to: formData.assigned_to || null,
          due_date: formData.due_date || null,
        }),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setEditingTask(null);
        setFormData({
          title: '',
          description: '',
          assigned_to: '',
          priority: 'medium',
          due_date: '',
        });
        fetchTasks();
      }
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleEdit = (task: OfficerTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to || '',
      priority: task.priority,
      due_date: task.due_date || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      const response = await fetch(`/api/officer/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/officer/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter.status && task.status !== filter.status) return false;
    if (filter.priority && task.priority !== filter.priority) return false;
    if (filter.assigned_to && task.assigned_to !== filter.assigned_to) return false;
    return true;
  });

  const groupedTasks = {
    todo: filteredTasks.filter((t) => t.status === 'todo'),
    in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
    completed: filteredTasks.filter((t) => t.status === 'completed'),
  };

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  if (loading) {
    return <div className="text-slate-300">Loading tasks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Officer Tasks
        </h2>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingTask(null);
            setFormData({
              title: '',
              description: '',
              assigned_to: '',
              priority: 'medium',
              due_date: '',
            });
          }}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreateForm ? 'Cancel' : 'Create Task'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-white/20 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={filter.priority || ''}
          onChange={(e) => setFilter({ ...filter, priority: e.target.value || undefined })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-white/20 focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={filter.assigned_to || ''}
          onChange={(e) => setFilter({ ...filter, assigned_to: e.target.value || undefined })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:border-white/20 focus:outline-none"
        >
          <option value="">All Officers</option>
          {officers.map((officer) => (
            <option key={officer.id} value={officer.id}>
              {officer.display_name}
            </option>
          ))}
        </select>
      </div>

      {showCreateForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/20 focus:outline-none"
              placeholder="e.g., Review budget proposal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-400 focus:border-white/20 focus:outline-none"
              rows={3}
              placeholder="Task details..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Assign To
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/20 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/20 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/20 transition-colors"
          >
            {editingTask ? 'Update Task' : 'Create Task'}
          </button>
        </form>
      )}

      {/* Task Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['todo', 'in_progress', 'completed'] as const).map((status) => (
          <div key={status} className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              {status === 'todo' ? 'To Do' : status === 'in_progress' ? 'In Progress' : 'Completed'}{' '}
              ({groupedTasks[status].length})
            </h3>
            <div className="space-y-2">
              {groupedTasks[status].length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
                  No tasks
                </div>
              ) : (
                groupedTasks[status].map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    priorityColors={priorityColors}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  priorityColors,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  task: OfficerTask;
  priorityColors: Record<string, string>;
  onEdit: (task: OfficerTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-white flex-1">{task.title}</h4>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(task)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-slate-300 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        {task.assigned_to_profile && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
            {task.assigned_to_profile.display_name}
          </span>
        )}
        {task.due_date && (
          <span className={`rounded-full px-2 py-0.5 text-xs ${
            isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-slate-300'
          }`}>
            {isOverdue && <AlertCircle className="inline h-3 w-3 mr-1" />}
            {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {task.status !== 'in_progress' && (
          <button
            onClick={() => onStatusChange(task.id, 'in_progress')}
            className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
          >
            Start
          </button>
        )}
        {task.status !== 'completed' && (
          <button
            onClick={() => onStatusChange(task.id, 'completed')}
            className="flex-1 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/30 transition-colors"
          >
            Complete
          </button>
        )}
        {task.status === 'completed' && (
          <button
            onClick={() => onStatusChange(task.id, 'todo')}
            className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
