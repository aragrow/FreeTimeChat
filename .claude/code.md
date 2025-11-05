# Code Standards and Best Practices

This document outlines coding standards, best practices, and architectural patterns for FreeTimeChat development.

## Table of Contents

1. [General Principles](#general-principles)
2. [Frontend Best Practices](#frontend-best-practices)
3. [Backend Best Practices](#backend-best-practices)
4. [Component Organization](#component-organization)
5. [File Structure](#file-structure)
6. [TypeScript Standards](#typescript-standards)
7. [Testing Standards](#testing-standards)
8. [Code Quality](#code-quality)

---

## General Principles

### Core Values

1. **Separation of Concerns**: Each file/component should have a single, well-defined responsibility
2. **DRY (Don't Repeat Yourself)**: Extract reusable logic into shared utilities/components
3. **Type Safety**: Leverage TypeScript's type system to catch errors at compile time
4. **Readability**: Code is read more often than written - prioritize clarity
5. **Performance**: Optimize for user experience without premature optimization
6. **Security First**: Always validate, sanitize, and protect against common vulnerabilities

### Code Organization Philosophy

- **Small Files**: Keep files under 300 lines when possible
- **Logical Components**: Break pages into multiple components based on functionality
- **Co-location**: Keep related files close together (component + styles + tests)
- **Feature-Based Structure**: Organize by feature, not by file type

---

## Frontend Best Practices

### Next.js App Router Conventions

#### File Structure for Pages

**❌ BAD: Everything in one file**
```typescript
// app/dashboard/page.tsx (500+ lines)
export default function DashboardPage() {
  return (
    <div>
      <header>
        <nav>...</nav>
        <div>User menu</div>
      </header>
      <aside>
        <div>Sidebar content...</div>
      </aside>
      <main>
        <div>Stats cards...</div>
        <div>Charts...</div>
        <div>Recent activity...</div>
        <div>Task list...</div>
      </main>
      <footer>...</footer>
    </div>
  );
}
```

**✅ GOOD: Broken into logical components**
```typescript
// app/dashboard/page.tsx (50 lines)
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardSidebar } from './components/DashboardSidebar';
import { StatsCards } from './components/StatsCards';
import { ActivityCharts } from './components/ActivityCharts';
import { RecentActivity } from './components/RecentActivity';
import { TaskList } from './components/TaskList';

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="dashboard-layout">
      <DashboardHeader user={data.user} />
      <div className="dashboard-content">
        <DashboardSidebar />
        <main className="dashboard-main">
          <StatsCards stats={data.stats} />
          <ActivityCharts data={data.chartData} />
          <div className="grid grid-cols-2 gap-6">
            <RecentActivity activities={data.activities} />
            <TaskList tasks={data.tasks} />
          </div>
        </main>
      </div>
    </div>
  );
}
```

#### Component File Organization

Organize page-specific components in a `components` folder next to the page:

```
app/
├── dashboard/
│   ├── page.tsx                    # Main page (small, orchestrates components)
│   ├── loading.tsx                 # Loading state
│   ├── error.tsx                   # Error boundary
│   ├── components/                 # Page-specific components
│   │   ├── DashboardHeader.tsx
│   │   ├── DashboardSidebar.tsx
│   │   ├── StatsCards.tsx
│   │   ├── ActivityCharts.tsx
│   │   ├── RecentActivity.tsx
│   │   └── TaskList.tsx
│   └── api/                        # Page-specific API routes
│       └── stats/
│           └── route.ts
```

### React Component Patterns

#### 1. Server Components (Default in App Router)

Use Server Components for:
- Data fetching
- Accessing backend resources directly
- Keeping sensitive information on server (API keys, tokens)
- Reducing client-side JavaScript

```typescript
// app/dashboard/components/RecentActivity.tsx
import { prisma } from '@/lib/prisma';

interface RecentActivityProps {
  userId: string;
}

export async function RecentActivity({ userId }: RecentActivityProps) {
  // Direct database access in Server Component
  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <div className="recent-activity">
      <h3>Recent Activity</h3>
      <ul>
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </ul>
    </div>
  );
}
```

#### 2. Client Components

Mark with `'use client'` for:
- Interactive elements (onClick, onChange, etc.)
- React hooks (useState, useEffect, useContext)
- Browser APIs (localStorage, window, etc.)

```typescript
// app/dashboard/components/TaskList.tsx
'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { TaskItem } from './TaskItem';
import { AddTaskForm } from './AddTaskForm';

interface TaskListProps {
  initialTasks: Task[];
}

export function TaskList({ initialTasks }: TaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
  });

  const handleAddTask = async (newTask: Task) => {
    setTasks([...tasks, newTask]);
  };

  return (
    <div className="task-list">
      <TaskListHeader filter={filter} onFilterChange={setFilter} />
      <AddTaskForm onAdd={handleAddTask} />
      <ul>
        {filteredTasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </ul>
    </div>
  );
}
```

#### 3. Component Composition

Break components into smaller pieces when:
- A component exceeds 150 lines
- Logic can be reused elsewhere
- A section has distinct responsibility
- Testing would be easier with isolation

```typescript
// app/dashboard/components/StatsCards.tsx
import { StatsCard } from '@/components/ui/StatsCard';
import { TrendIndicator } from '@/components/ui/TrendIndicator';

interface StatsCardsProps {
  stats: {
    totalTime: number;
    activeProjects: number;
    completedTasks: number;
    efficiency: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatsCard
        title="Total Time"
        value={`${stats.totalTime}h`}
        icon={<ClockIcon />}
        trend={<TrendIndicator value={12} />}
      />
      <StatsCard
        title="Active Projects"
        value={stats.activeProjects}
        icon={<ProjectIcon />}
      />
      <StatsCard
        title="Completed Tasks"
        value={stats.completedTasks}
        icon={<CheckIcon />}
        trend={<TrendIndicator value={8} />}
      />
      <StatsCard
        title="Efficiency"
        value={`${stats.efficiency}%`}
        icon={<ChartIcon />}
        trend={<TrendIndicator value={-3} />}
      />
    </div>
  );
}
```

### State Management

#### 1. Local State (useState)

Use for component-specific state:

```typescript
'use client';

import { useState } from 'react';

export function AddTaskForm() {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Submit logic
    setIsLoading(false);
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  );
}
```

#### 2. Context (React Context)

Use for app-wide state that changes infrequently:

```typescript
// lib/contexts/ThemeContext.tsx
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
```

#### 3. Server State (React Query / SWR)

Use for API data fetching with caching:

```typescript
// hooks/useActivities.ts
'use client';

import useSWR from 'swr';
import { Activity } from '@/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useActivities(userId: string) {
  const { data, error, mutate } = useSWR<Activity[]>(
    `/api/users/${userId}/activities`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  return {
    activities: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
```

### Data Fetching Patterns

#### Server Component Data Fetching

```typescript
// app/projects/[id]/page.tsx
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectTimeline } from './components/ProjectTimeline';

interface ProjectPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  if (!project) return { title: 'Project Not Found' };

  return {
    title: project.name,
    description: project.description,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      tasks: true,
      timeEntries: true,
      team: true,
    },
  });

  if (!project) notFound();

  return (
    <div>
      <ProjectHeader project={project} />
      <ProjectTimeline
        tasks={project.tasks}
        timeEntries={project.timeEntries}
      />
    </div>
  );
}
```

#### Client Component Data Fetching

```typescript
// app/chat/components/ChatMessages.tsx
'use client';

import { useEffect, useState } from 'react';
import { Message } from '@/types';
import { MessageBubble } from './MessageBubble';

interface ChatMessagesProps {
  conversationId: string;
}

export function ChatMessages({ conversationId }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`
        );
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMessages();
  }, [conversationId]);

  if (isLoading) return <ChatSkeleton />;

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
```

### Form Handling

Use React Hook Form for complex forms:

```typescript
// app/settings/components/ProfileForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData: ProfileFormData;
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      // Show success message
    } catch (error) {
      // Show error message
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          {...register('name')}
          className="input"
        />
        {errors.name && (
          <p className="error">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="input"
        />
        {errors.email && (
          <p className="error">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          {...register('bio')}
          className="textarea"
          rows={4}
        />
        {errors.bio && (
          <p className="error">{errors.bio.message}</p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

### Error Handling

```typescript
// app/error.tsx (Global error boundary)
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="error-page">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

```typescript
// app/dashboard/error.tsx (Route-specific error boundary)
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="dashboard-error">
      <h2>Failed to load dashboard</h2>
      <p>We couldn't load your dashboard data. Please try again.</p>
      <button onClick={reset}>Reload</button>
    </div>
  );
}
```

---

## Backend Best Practices

### API Route Organization

Organize API routes by feature/resource:

```
apps/api/src/
├── routes/
│   ├── auth/
│   │   ├── index.ts              # Main auth router
│   │   ├── login.ts              # POST /auth/login
│   │   ├── register.ts           # POST /auth/register
│   │   ├── refresh.ts            # POST /auth/refresh
│   │   └── logout.ts             # POST /auth/logout
│   ├── users/
│   │   ├── index.ts              # User router
│   │   ├── profile.ts            # GET/PUT /users/profile
│   │   ├── settings.ts           # GET/PUT /users/settings
│   │   └── [id]/
│   │       ├── index.ts          # GET/PUT/DELETE /users/:id
│   │       └── activities.ts     # GET /users/:id/activities
│   ├── projects/
│   │   ├── index.ts
│   │   ├── list.ts
│   │   └── [id]/
│   │       ├── index.ts
│   │       ├── tasks.ts
│   │       └── time-entries.ts
│   └── index.ts                  # Main router aggregator
```

### Service Layer Pattern

Keep route handlers thin, business logic in services:

```typescript
// routes/users/profile.ts
import { Router } from 'express';
import { authenticateJWT } from '@/middleware/auth';
import { UserService } from '@/services/UserService';
import { validate } from '@/middleware/validation';
import { updateProfileSchema } from '@/schemas/user';

const router = Router();

// GET /users/profile
router.get('/profile', authenticateJWT, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await UserService.getProfile(userId);

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// PUT /users/profile
router.put(
  '/profile',
  authenticateJWT,
  validate(updateProfileSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const updatedProfile = await UserService.updateProfile(userId, req.body);

      res.json(updatedProfile);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

```typescript
// services/UserService.ts
import { prisma } from '@/lib/prisma';
import { AuditService } from './AuditService';
import { CacheService } from './CacheService';
import { UpdateProfileDto } from '@/types/user';

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string) {
    // Check cache first
    const cached = await CacheService.get(`user:profile:${userId}`);
    if (cached) return JSON.parse(cached);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Cache for 5 minutes
    await CacheService.set(
      `user:profile:${userId}`,
      JSON.stringify(user),
      300
    );

    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateProfileDto) {
    // Get current profile for audit trail
    const currentProfile = await this.getProfile(userId);

    // Update profile
    const updatedProfile = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        bio: data.bio,
        avatar: data.avatar,
      },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        avatar: true,
        createdAt: true,
      },
    });

    // Invalidate cache
    await CacheService.delete(`user:profile:${userId}`);

    // Create audit trail
    await AuditService.log({
      userId,
      action: 'user.profile.update',
      resourceType: 'user',
      resourceId: userId,
      before: currentProfile,
      after: updatedProfile,
      ipAddress: data.ipAddress,
    });

    return updatedProfile;
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string, performedBy: string) {
    // Soft delete
    const deletedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@example.com`, // Anonymize
        name: 'Deleted User',
      },
    });

    // Invalidate cache
    await CacheService.delete(`user:profile:${userId}`);

    // Audit trail
    await AuditService.log({
      userId: performedBy,
      action: 'user.account.delete',
      resourceType: 'user',
      resourceId: userId,
      before: null,
      after: null,
    });

    return { success: true };
  }
}
```

### Middleware Organization

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { JWTService } from '@/services/JWTService';
import { UnauthorizedError } from '@/errors';

export async function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const payload = await JWTService.verifyAccessToken(token);

    // Attach user to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid token'));
  }
}
```

```typescript
// middleware/authorization.ts
import { Request, Response, NextFunction } from 'express';
import { AuthorizationService } from '@/services/AuthorizationService';
import { ForbiddenError } from '@/errors';

export function requireCapability(capability: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const hasCapability = await AuthorizationService.userHasCapability(
        userId,
        capability
      );

      if (!hasCapability) {
        throw new ForbiddenError(
          `Missing required capability: ${capability}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Usage:
// router.get('/users', authenticateJWT, requireCapability('user.read'), ...)
```

```typescript
// middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '@/errors';

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new ValidationError('Validation failed', error.errors));
      } else {
        next(error);
      }
    }
  };
}
```

### Error Handling

Create custom error classes:

```typescript
// errors/index.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors: any[]
  ) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}
```

Global error handler:

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err instanceof ValidationError && { errors: err.errors }),
    });
  }

  // Unhandled errors
  console.error('Unhandled error:', err);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
```

### Input Validation with Zod

```typescript
// schemas/user.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  teamMembers: z
    .array(z.string().uuid())
    .min(1, 'At least one team member required'),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type CreateProjectDto = z.infer<typeof createProjectSchema>;
```

### API Response Format

Standardize API responses:

```typescript
// utils/response.ts
export class ApiResponse {
  static success<T>(data: T, message?: string) {
    return {
      status: 'success',
      message,
      data,
    };
  }

  static error(message: string, errors?: any[]) {
    return {
      status: 'error',
      message,
      errors,
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ) {
    return {
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}

// Usage in routes:
router.get('/users', async (req, res) => {
  const users = await UserService.list();
  res.json(ApiResponse.success(users));
});
```

### Database Queries with Prisma

```typescript
// services/ProjectService.ts
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class ProjectService {
  /**
   * List projects with filtering and pagination
   */
  static async list(options: {
    userId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, status, page = 1, limit = 20 } = options;

    const where: Prisma.ProjectWhereInput = {};

    if (userId) {
      where.teamMembers = {
        some: { userId },
      };
    }

    if (status) {
      where.status = status;
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
              timeEntries: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.project.count({ where }),
    ]);

    return { projects, total, page, limit };
  }

  /**
   * Get project by ID with related data
   */
  static async getById(projectId: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        teamMembers: {
          some: { userId },
        },
      },
      include: {
        teamMembers: {
          include: {
            user: true,
          },
        },
        tasks: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        timeEntries: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            startTime: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return project;
  }

  /**
   * Create project with team members
   */
  static async create(data: CreateProjectDto, createdBy: string) {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        teamMembers: {
          create: data.teamMembers.map((userId) => ({
            userId,
            role: userId === createdBy ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: {
        teamMembers: {
          include: {
            user: true,
          },
        },
      },
    });

    await AuditService.log({
      userId: createdBy,
      action: 'project.create',
      resourceType: 'project',
      resourceId: project.id,
      after: project,
    });

    return project;
  }
}
```

### Caching Strategy

```typescript
// services/CacheService.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class CacheService {
  /**
   * Get cached value
   */
  static async get(key: string): Promise<string | null> {
    return redis.get(key);
  }

  /**
   * Set cached value with TTL (in seconds)
   */
  static async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await redis.setex(key, ttl, value);
    } else {
      await redis.set(key, value);
    }
  }

  /**
   * Delete cached value
   */
  static async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Delete multiple keys by pattern
   */
  static async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Get or set (fetch if not cached)
   */
  static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    const data = await fetcher();
    await this.set(key, JSON.stringify(data), ttl);

    return data;
  }
}
```

---

## Component Organization

### Breaking Down Complex Components

#### Example: Dashboard Page

**Step 1: Identify logical sections**

Look at your page and identify distinct sections:
- Header (navigation, user menu)
- Sidebar (filters, navigation)
- Stats cards
- Charts
- Activity feed
- Task list

**Step 2: Extract each section into its own component**

```
app/dashboard/
├── page.tsx                    # Orchestrator (50 lines)
├── components/
│   ├── DashboardHeader.tsx     # Header (80 lines)
│   ├── DashboardSidebar.tsx    # Sidebar (100 lines)
│   ├── StatsCards/
│   │   ├── index.tsx           # Container (40 lines)
│   │   └── StatsCard.tsx       # Individual card (60 lines)
│   ├── ActivityCharts/
│   │   ├── index.tsx           # Container (50 lines)
│   │   ├── TimeChart.tsx       # Chart component (80 lines)
│   │   └── ProjectChart.tsx    # Chart component (80 lines)
│   ├── RecentActivity/
│   │   ├── index.tsx           # Container (60 lines)
│   │   └── ActivityItem.tsx    # Individual item (40 lines)
│   └── TaskList/
│       ├── index.tsx           # Container (80 lines)
│       ├── TaskItem.tsx        # Individual task (60 lines)
│       └── AddTaskForm.tsx     # Form (70 lines)
```

**Step 3: Create reusable UI components**

Extract common patterns into `components/ui/`:

```
components/ui/
├── Button.tsx
├── Card.tsx
├── Input.tsx
├── Select.tsx
├── Modal.tsx
├── Dropdown.tsx
└── Avatar.tsx
```

### Component Size Guidelines

- **Page files**: 50-150 lines (mostly imports and composition)
- **Container components**: 100-200 lines
- **Presentational components**: 50-150 lines
- **UI components**: 30-100 lines

If a component exceeds these guidelines, consider breaking it down further.

### When to Extract a Component

Extract a new component when:

1. **Reusability**: Logic/UI is used in multiple places
2. **Complexity**: Component exceeds 200 lines
3. **Responsibility**: Component has multiple distinct responsibilities
4. **Testing**: Would be easier to test in isolation
5. **Readability**: Parent component is hard to understand

### Component Naming Conventions

```typescript
// Container components: Plural nouns
<TaskList />
<ProjectCards />
<UserSettings />

// Item components: Singular nouns
<TaskItem />
<ProjectCard />
<UserProfile />

// Form components: Noun + "Form"
<AddTaskForm />
<EditProjectForm />
<LoginForm />

// Modal/Dialog components: Noun + "Modal" or "Dialog"
<DeleteConfirmModal />
<ShareProjectDialog />

// Layout components: Noun + "Layout"
<DashboardLayout />
<AuthLayout />
```

---

## File Structure

### Monorepo Structure

```
FreeTimeChat/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # Auth routes group
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/    # Dashboard routes group
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   ├── tasks/
│   │   │   │   └── settings/
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/             # Reusable UI components
│   │   │   ├── forms/          # Form components
│   │   │   ├── layouts/        # Layout components
│   │   │   └── features/       # Feature-specific shared components
│   │   ├── lib/
│   │   │   ├── api.ts          # API client
│   │   │   ├── utils.ts
│   │   │   └── contexts/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── styles/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── routes/         # API routes
│       │   ├── services/       # Business logic
│       │   ├── middleware/     # Express middleware
│       │   ├── models/         # Database models (if not using Prisma)
│       │   ├── lib/            # Shared utilities
│       │   ├── types/          # TypeScript types
│       │   ├── schemas/        # Zod validation schemas
│       │   ├── errors/         # Custom error classes
│       │   ├── config/         # Configuration
│       │   └── index.ts        # Entry point
│       └── package.json
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── user.ts
│   │   │   ├── project.ts
│   │   │   ├── task.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── config/                 # Shared configuration
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── prettier/
│   │
│   └── ui/                     # Shared UI components (optional)
│       └── package.json
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── .claude/                    # Documentation
│   ├── instructions.md
│   ├── authentication.md
│   ├── authorization.md
│   ├── memory.md
│   ├── database.md
│   └── code.md
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

### Feature-Based Organization

For large features, use feature folders:

```
app/projects/
├── page.tsx                    # List view
├── [id]/
│   ├── page.tsx                # Detail view
│   ├── edit/
│   │   └── page.tsx            # Edit view
│   └── components/             # Project-specific components
│       ├── ProjectHeader.tsx
│       ├── ProjectTimeline.tsx
│       └── ProjectTeam.tsx
├── new/
│   └── page.tsx                # Create view
└── components/                 # Shared project components
    ├── ProjectCard.tsx
    ├── ProjectFilters.tsx
    └── ProjectStats.tsx
```

---

## TypeScript Standards

### Type Definitions

```typescript
// types/user.ts

// Use interfaces for object shapes
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Use type for unions, intersections, primitives
export type UserRole = 'admin' | 'manager' | 'user';

export type UserWithRoles = User & {
  roles: UserRole[];
};

// Use Pick, Omit, Partial for derived types
export type UserProfile = Pick<User, 'id' | 'name' | 'avatar'>;
export type CreateUserDto = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserDto = Partial<CreateUserDto>;
```

### Avoid `any`, use `unknown`

```typescript
// ❌ BAD
function processData(data: any) {
  return data.value;
}

// ✅ GOOD
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data format');
}
```

### Use Type Guards

```typescript
// types/guards.ts

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'name' in obj
  );
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Usage
function handleApiResponse(response: unknown) {
  if (isUser(response)) {
    console.log(response.email); // TypeScript knows this is a User
  }
}
```

### Generic Types

```typescript
// types/api.ts

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Usage
async function fetchUsers(): Promise<ApiResponse<User[]>> {
  const response = await fetch('/api/users');
  return response.json();
}
```

### Utility Types

```typescript
// types/utils.ts

// Make specific properties required
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Make specific properties optional
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract keys with specific value type
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// Usage
type UserWithEmail = WithRequired<User, 'email'>;
type UserStringKeys = KeysOfType<User, string>; // 'id' | 'email' | 'name'
```

---

## Testing Standards

### Unit Testing Components

```typescript
// components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

### Testing API Routes

```typescript
// routes/users/profile.test.ts
import request from 'supertest';
import { app } from '@/app';
import { prisma } from '@/lib/prisma';
import { generateTestToken } from '@/test/helpers';

describe('GET /users/profile', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
      },
    });

    userId = user.id;
    authToken = generateTestToken(userId);
  });

  afterEach(async () => {
    await prisma.user.delete({ where: { id: userId } });
  });

  it('returns user profile', async () => {
    const response = await request(app)
      .get('/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    });
  });

  it('returns 401 without token', async () => {
    await request(app).get('/users/profile').expect(401);
  });
});
```

### Testing Services

```typescript
// services/UserService.test.ts
import { UserService } from './UserService';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('UserService', () => {
  describe('getProfile', () => {
    it('returns user profile', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const profile = await UserService.getProfile('123');

      expect(profile).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '123' },
        select: expect.any(Object),
      });
    });

    it('throws error when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(UserService.getProfile('123')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
```

---

## Code Quality

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Git Hooks (Husky + lint-staged)

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

### Code Comments

```typescript
// ✅ GOOD: Comments explain WHY, not WHAT

/**
 * Rotate refresh token to prevent token reuse attacks.
 * If a refresh token is used twice, it indicates potential theft,
 * so we revoke the entire token family.
 */
async function rotateRefreshToken(oldToken: string) {
  // ...
}

// ❌ BAD: Comments explain obvious things

// Get the user ID from the request
const userId = req.user.id;

// Loop through all tasks
for (const task of tasks) {
  // ...
}
```

### Code Review Checklist

Before submitting PR:

- [ ] All files under 300 lines
- [ ] Components properly broken down
- [ ] No `any` types used
- [ ] All functions have proper types
- [ ] Error handling implemented
- [ ] Input validation with Zod
- [ ] Tests written for new features
- [ ] No console.logs (use proper logging)
- [ ] Sensitive data not hardcoded
- [ ] API responses follow standard format
- [ ] Audit trail for admin actions
- [ ] Cache invalidation handled
- [ ] Database queries optimized
- [ ] Security vulnerabilities checked

---

## Summary

### Key Takeaways

1. **Break down pages into logical components** - Never have all code in one file
2. **Use Server Components by default** - Only use Client Components when needed
3. **Keep route handlers thin** - Business logic belongs in service layer
4. **Validate all inputs** - Use Zod schemas for type-safe validation
5. **Handle errors properly** - Use custom error classes and global error handler
6. **Type everything** - Avoid `any`, use proper TypeScript types
7. **Test critical paths** - Write tests for services and important components
8. **Follow conventions** - Consistent naming and file organization

### Quick Reference

**Component sizes:**
- Page: 50-150 lines
- Container: 100-200 lines
- Presentational: 50-150 lines
- UI: 30-100 lines

**When to extract:**
- Reusability
- Complexity (>200 lines)
- Multiple responsibilities
- Testing isolation
- Readability

**File organization:**
- Feature-based structure
- Co-locate related files
- Separate concerns
- Small, focused files

---

For more details on specific systems:
- Authentication: See [authentication.md](.claude/authentication.md)
- Authorization: See [authorization.md](.claude/authorization.md)
- Memory: See [memory.md](.claude/memory.md)
- Database: See [database.md](.claude/database.md)
