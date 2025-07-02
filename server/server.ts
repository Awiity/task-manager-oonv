// server.ts
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';

// 1. Singleton Pattern - Database Connection
class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database;

  private constructor() {
    this.db = new Database('tasks.db');
    this.initializeDatabase();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public getDatabase(): Database.Database {
    return this.db;
  }
}

// 2. Factory Pattern - Task Status Factory
interface TaskStatus {
  name: string;
  color: string;
  canTransitionTo: string[];
}

class TaskStatusFactory {
  private static statuses: Map<string, TaskStatus> = new Map([
    ['pending', { name: 'Pending', color: 'yellow', canTransitionTo: ['in-progress', 'completed'] }],
    ['in-progress', { name: 'In Progress', color: 'blue', canTransitionTo: ['completed', 'pending'] }],
    ['completed', { name: 'Completed', color: 'green', canTransitionTo: ['pending'] }]
  ]);

  public static createStatus(statusType: string): TaskStatus | null {
    return this.statuses.get(statusType) || null;
  }

  public static getAllStatuses(): TaskStatus[] {
    return Array.from(this.statuses.values());
  }
}

// 3. Observer Pattern - Task Event Notifier
interface TaskObserver {
  onTaskCreated(task: Task): void;
  onTaskUpdated(task: Task): void;
  onTaskDeleted(taskId: number): void;
}

class TaskEventNotifier {
  private observers: TaskObserver[] = [];

  public addObserver(observer: TaskObserver): void {
    this.observers.push(observer);
  }

  public removeObserver(observer: TaskObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  public notifyTaskCreated(task: Task): void {
    this.observers.forEach(observer => observer.onTaskCreated(task));
  }

  public notifyTaskUpdated(task: Task): void {
    this.observers.forEach(observer => observer.onTaskUpdated(task));
  }

  public notifyTaskDeleted(taskId: number): void {
    this.observers.forEach(observer => observer.onTaskDeleted(taskId));
  }
}

// Task Model
interface Task {
  id?: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  created_at?: string;
  updated_at?: string;
}

// Logger Observer Implementation
class TaskLogger implements TaskObserver {
  onTaskCreated(task: Task): void {
    console.log(`📝 Task created: ${task.title}`);
  }

  onTaskUpdated(task: Task): void {
    console.log(`✏️ Task updated: ${task.title}`);
  }

  onTaskDeleted(taskId: number): void {
    console.log(`🗑️ Task deleted: ID ${taskId}`);
  }
}

// Task Service
class TaskService {
  private db: Database.Database;
  private notifier: TaskEventNotifier;

  constructor() {
    this.db = DatabaseManager.getInstance().getDatabase();
    this.notifier = new TaskEventNotifier();
    this.notifier.addObserver(new TaskLogger());
  }

  public getAllTasks(): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
    return stmt.all() as Task[];
  }

  public createTask(task: Omit<Task, 'id'>): Task {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (title, description, status, priority)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(task.title, task.description || '', task.status, task.priority);
    const newTask = this.getTaskById(result.lastInsertRowid as number);
    
    if (newTask) {
      this.notifier.notifyTaskCreated(newTask);
    }
    
    return newTask!;
  }

  public updateTask(id: number, updates: Partial<Task>): Task | null {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(
      updates.title,
      updates.description,
      updates.status,
      updates.priority,
      id
    );
    
    if (result.changes > 0) {
      const updatedTask = this.getTaskById(id);
      if (updatedTask) {
        this.notifier.notifyTaskUpdated(updatedTask);
      }
      return updatedTask;
    }
    
    return null;
  }

  public deleteTask(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes > 0) {
      this.notifier.notifyTaskDeleted(id);
      return true;
    }
    
    return false;
  }

  private getTaskById(id: number): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id) as Task | null;
  }
}

// Express App Setup
const app = express();
const taskService = new TaskService();

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = taskService.getAllTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, status = 'pending', priority = 'medium' } = req.body;
    
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    
    const task = taskService.createTask({ title, description, status, priority });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const task = taskService.updateTask(id, updates);
    
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = taskService.deleteTask(id);
    
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('/api/statuses', (req, res) => {
  const statuses = TaskStatusFactory.getAllStatuses();
  res.json(statuses);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;