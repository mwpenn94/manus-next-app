# Manus Projects Feature — Research Summary

## Core Concept
Projects are **persistent, reusable workspaces** for recurring tasks. A project serves as a dedicated workspace where you define:
1. **Master Instruction** — core directive auto-applied to every new task in the project
2. **Knowledge Base** — uploaded files and documents shared across all tasks
3. **Connectors** — linked external services (Gmail, Notion, GitHub, etc.)

## Key Features

### Creating a Project
1. Click "Create Project" button (+ icon next to "Projects") in sidebar
2. Enter name + write master instruction
3. Upload knowledge base files
4. Start creating tasks — each inherits project config

### Organization
- **Pin projects** — hover to see pin icon, pinned stay at top
- **Drag and drop** — manually reorder projects
- **Filter tasks** — All tasks, Non-project tasks, Favorites, Scheduled

### Collaboration & Privacy
- Projects and tasks are **private by default**
- Inviting a colleague gives access to shared instruction + knowledge base
- They can only see their own tasks (not others')
- Must explicitly invite to share specific tasks

### Configuration Updates
| Update Type | When it Takes Effect |
|-------------|---------------------|
| Instruction updates | Next message in current task |
| File updates | Only in new tasks created after update |

### UI Structure (from screenshots and docs)
- Sidebar shows "PROJECTS" section with expandable project list
- Each project shows its name + task count
- Clicking a project filters the task list to show only that project's tasks
- Project settings accessible via gear icon or right-click context menu
- Project detail view shows: Instructions tab, Files tab, Connectors tab

## What We Need to Build

### Database Schema
- `projects` table: id, userId, name, instructions, createdAt, updatedAt, pinned, sortOrder
- `project_files` table: id, projectId, fileName, fileUrl, fileKey, mimeType, size, createdAt
- Update `tasks` table: add `projectId` foreign key (nullable)

### Server Procedures
- `project.create` — create new project with name + instructions
- `project.update` — update name, instructions
- `project.delete` — delete project (tasks become standalone)
- `project.list` — list user's projects with task counts
- `project.get` — get project details with files
- `project.pin` — toggle pin status
- `project.reorder` — update sort order
- `project.addFile` — upload file to project knowledge base
- `project.removeFile` — remove file from knowledge base

### UI Components
- Sidebar: "PROJECTS" section with collapsible project list
- Create Project dialog/modal
- Project settings page (Instructions, Files tabs)
- Task list filtering by project
- Project badge on task cards in sidebar
