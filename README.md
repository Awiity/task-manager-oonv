# Task Manager Web Application

A modern task management application built with TypeScript, React, Node.js, SQLite, and Tailwind CSS.

## Design Patterns Implemented

1. **Singleton Pattern** - Database connection management
2. **Factory Pattern** - Task status creation and management  
3. **Observer Pattern** - Task event notifications and logging

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite with better-sqlite3
- **Styling**: Tailwind CSS v4

## Quick Start

### Backend Setup
```bash
npm install
npm run dev
```

### Frontend Setup
The React component is ready to use - just ensure the backend is running on port 3001.

## API Endpoints

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/statuses` - Get available statuses

## Features

- ✅ Create, read, update, delete tasks
- ✅ Task priority levels (low, medium, high)
- ✅ Task status tracking (pending, in-progress, completed)
- ✅ Real-time task logging
- ✅ Modern responsive UI
- ✅ TypeScript throughout

## Architecture

The application demonstrates clean architecture with separation of concerns:
- Database layer (Singleton pattern)
- Service layer with business logic
- API layer with Express routes
- Frontend with React hooks and state management