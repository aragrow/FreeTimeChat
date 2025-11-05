# UI Components Library

Shared UI components for FreeTimeChat web application. All components are built with TypeScript, Tailwind CSS, and follow accessibility best practices.

## Components

### Button

Versatile button component with multiple variants and sizes.

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `isLoading`: boolean - Shows loading spinner
- `fullWidth`: boolean - Makes button full width

**Example:**
```tsx
import { Button } from '@/components/ui';

// Primary button
<Button variant="primary" onClick={handleClick}>
  Submit
</Button>

// Loading state
<Button isLoading>
  Saving...
</Button>

// Full width danger button
<Button variant="danger" size="lg" fullWidth>
  Delete Account
</Button>
```

### Input

Input field with label, error states, helper text, and icon support.

**Props:**
- `label`: string - Label text
- `error`: string - Error message to display
- `helperText`: string - Helper text below input
- `leftIcon`: ReactNode - Icon on left side
- `rightIcon`: ReactNode - Icon on right side
- `fullWidth`: boolean - Makes input full width

**Example:**
```tsx
import { Input } from '@/components/ui';

// Basic input with label
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  required
/>

// Input with error
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>

// Input with helper text and icon
<Input
  label="Search"
  helperText="Search by name or email"
  leftIcon={<SearchIcon />}
/>
```

### Card

Container component with optional header, body, and footer sections.

**Props:**
- `hoverable`: boolean - Adds hover effect with shadow
- `noPadding`: boolean - Removes padding from card

**Example:**
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card hoverable>
  <CardHeader>
    <h3 className="text-lg font-semibold">Project Stats</h3>
  </CardHeader>
  <CardBody>
    <p>Total hours: 120</p>
    <p>Active tasks: 5</p>
  </CardBody>
  <CardFooter>
    <Button variant="ghost">Cancel</Button>
    <Button variant="primary">View Details</Button>
  </CardFooter>
</Card>
```

### Modal

Modal dialog with overlay, accessible keyboard navigation, and customizable size.

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Close callback
- `title`: string - Modal title
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full' (default: 'md')
- `closeOnOverlayClick`: boolean - Close on overlay click (default: true)
- `showCloseButton`: boolean - Show close button (default: true)

**Features:**
- ESC key to close
- Click overlay to close
- Prevents body scroll when open
- Proper ARIA attributes for accessibility

**Example:**
```tsx
import { Modal, Button } from '@/components/ui';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Delete"
        size="md"
      >
        <p>Are you sure you want to delete this item?</p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
```

## Utilities

### cn (Class Name Utility)

Utility function for merging Tailwind CSS classes.

**Location:** `@/lib/utils/cn`

**Example:**
```tsx
import { cn } from '@/lib/utils/cn';

const className = cn(
  'base-class',
  isActive && 'active-class',
  error && 'error-class'
);
```

## Theme Configuration

Theme configuration is available at `@/lib/theme` with colors, spacing, typography, and other design tokens.

**Example:**
```tsx
import { theme } from '@/lib/theme';

// Access theme colors
const primaryColor = theme.colors.primary[600];
const spacing = theme.spacing.md;
```

## Guidelines

### Styling
- Use Tailwind CSS utility classes
- Follow the theme configuration for colors and spacing
- Maintain consistent spacing and sizing across components

### TypeScript
- All components have proper TypeScript types
- Export prop types for reusability
- Use `React.forwardRef` for components that need ref access

### Accessibility
- Include proper ARIA attributes
- Support keyboard navigation
- Provide focus styles
- Use semantic HTML elements

### Testing
- Test components with different prop combinations
- Test keyboard navigation
- Test accessibility with screen readers
- Test responsive behavior

## Adding New Components

When adding new UI components:

1. Create component file in `src/components/ui/ComponentName.tsx`
2. Export component and types from `src/components/ui/index.ts`
3. Add documentation to this README
4. Include JSDoc comments in component file
5. Follow existing patterns for props and styling
