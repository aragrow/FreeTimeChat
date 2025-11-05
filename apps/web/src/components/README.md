# Components

Reusable React components for the FreeTimeChat web application.

## Structure

### `/ui`
Basic UI components (Button, Input, Card, Modal, etc.)
- Should be generic and reusable across the app
- Follow consistent design system
- Include proper TypeScript types

### `/forms`
Form-specific components
- Form wrappers with validation
- Form field components
- Form submission handlers

### `/layout`
Layout components
- Header, Footer, Sidebar
- Page layouts and containers
- Navigation components

## Usage

```tsx
import { Button } from '@/components/ui/Button';
import { LoginForm } from '@/components/forms/LoginForm';
import { Header } from '@/components/layout/Header';
```

## Guidelines

- All components should be typed with TypeScript
- Use Tailwind CSS for styling
- Include JSDoc comments for complex components
- Export named exports (not default)
