/**
 * Project Type Definitions
 *
 * Types for projects, tasks, and time tracking
 */

/**
 * Project entity
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  timeEntries?: TimeEntry[];
  tasks?: Task[];
}

/**
 * Time entry entity
 */
export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // Minutes
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
}

/**
 * Task entity
 */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
}

/**
 * Task status enum
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

/**
 * Task priority enum
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Create project request
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Update project request
 */
export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Create time entry request
 */
export interface CreateTimeEntryRequest {
  projectId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Update time entry request
 */
export interface UpdateTimeEntryRequest {
  projectId?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

/**
 * Create task request
 */
export interface CreateTaskRequest {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueDate?: Date;
}

/**
 * Update task request
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToUserId?: string;
  dueDate?: Date;
  completedAt?: Date;
}
