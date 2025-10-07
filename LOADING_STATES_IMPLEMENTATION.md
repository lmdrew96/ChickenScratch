# Loading States Implementation

## Overview

This document describes the implementation of loading states across the ChickenScratch application. All loading components are properly defined and exported, resolving Issue #5.

## Components

### 1. LoadingSpinner

A spinning loader component for indicating active operations.

**Location:** `src/components/shared/loading-states.tsx`

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Size of the spinner (default: 'md')
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { LoadingSpinner } from '@/components/shared/loading-states';

<LoadingSpinner size="sm" />
```

**Used in:**
- `src/components/auth/auth-form.tsx` - Sign in/sign up buttons
- `src/components/forms/submission-form.tsx` - Form submission buttons
- `src/components/committee/kanban-board.tsx` - Action buttons
- `src/components/editor/editor-dashboard.tsx` - All async operation buttons

### 2. LoadingSkeleton

A skeleton loader for content placeholders during loading.

**Location:** `src/components/shared/loading-states.tsx`

**Props:**
- `className?: string` - Additional CSS classes
- `variant?: 'text' | 'rectangular' | 'circular'` - Shape variant (default: 'rectangular')
- `width?: string` - Custom width
- `height?: string` - Custom height

**Usage:**
```tsx
import { LoadingSkeleton } from '@/components/shared/loading-states';

<LoadingSkeleton variant="rectangular" width="100%" height="200px" />
```

**Used in:**
- `src/components/gallery/submission-card.tsx` - Image loading placeholders

### 3. LoadingState

A wrapper component that handles loading, error, and success states.

**Location:** `src/components/shared/loading-states.tsx`

**Props:**
- `loading: boolean` - Whether content is loading
- `error?: string | null` - Error message to display
- `children: React.ReactNode` - Content to show when loaded
- `fallback?: React.ReactNode` - Custom loading UI (optional)

**Usage:**
```tsx
import { LoadingState } from '@/components/shared/loading-states';

<LoadingState loading={isLoading} error={error}>
  <YourContent />
</LoadingState>
```

**Used in:**
- `src/components/mine/mine-client.tsx` - Wrapping submission content
- `src/components/committee/kanban-board.tsx` - Wrapping board content

## Implementation Details

### Editor Dashboard

The editor dashboard now includes loading states for all async operations:

1. **Assignment Operations** - Shows spinner when assigning/unassigning editors
2. **Notes Saving** - Shows spinner when saving editor notes
3. **Publish Settings** - Shows spinner when updating publish settings
4. **Status Changes** - Disables all status buttons during operations

**Key Features:**
- Single `isLoading` state prevents concurrent operations
- All buttons show LoadingSpinner with "Saving..." text
- Buttons are disabled during loading to prevent double-clicks

### Gallery Components

The submission card component now includes:

1. **Image Loading States** - Shows skeleton while images load
2. **Smooth Transitions** - Fades in images once loaded
3. **Error Handling** - Falls back to placeholder on image errors

**Key Features:**
- `imageLoading` state tracks individual image loading
- LoadingSkeleton provides visual feedback
- Opacity transition for smooth image appearance

### Form Components

All forms include loading indicators:

1. **Auth Forms** - Sign in/sign up buttons show spinner
2. **Submission Forms** - Submit/save buttons show spinner
3. **Committee Actions** - All workflow actions show spinner

## Export Structure

All loading components are properly exported through the shared components index:

**File:** `src/components/shared/index.ts`

```typescript
export { LoadingSpinner, LoadingSkeleton, LoadingState } from './loading-states';
```

This allows for clean imports:
```typescript
import { LoadingSpinner, LoadingSkeleton, LoadingState } from '@/components/shared';
```

## Best Practices

### When to Use Each Component

1. **LoadingSpinner**
   - Button loading states
   - Inline loading indicators
   - Small, focused loading areas

2. **LoadingSkeleton**
   - Content placeholders
   - Image loading
   - List item placeholders
   - Large content areas

3. **LoadingState**
   - Page-level loading
   - Section loading with error handling
   - When you need both loading and error states

### Implementation Guidelines

1. **Always disable interactive elements during loading**
   ```tsx
   <Button disabled={isLoading}>
     {isLoading ? <LoadingSpinner size="sm" /> : 'Submit'}
   </Button>
   ```

2. **Provide visual feedback for all async operations**
   - User should always know when something is processing
   - Use appropriate size spinners for the context

3. **Handle errors gracefully**
   - Use LoadingState's error prop for error messages
   - Provide clear, actionable error messages

4. **Prevent concurrent operations**
   - Use a single loading state to prevent multiple simultaneous operations
   - Disable all related buttons during loading

## Testing Checklist

- [x] LoadingSpinner component defined and exported
- [x] LoadingSkeleton component defined and exported
- [x] LoadingState wrapper component defined and exported
- [x] Loading indicators added to auth forms
- [x] Loading indicators added to submission forms
- [x] Loading indicators added to editor dashboard
- [x] Loading indicators added to committee kanban board
- [x] Loading indicators added to gallery components
- [x] All components properly imported and used
- [x] No undefined component references

## Future Enhancements

Potential improvements for loading states:

1. **Global Loading Context** - Centralized loading state management
2. **Progress Indicators** - For long-running operations
3. **Optimistic Updates** - Update UI before server confirmation
4. **Retry Mechanisms** - Automatic retry for failed operations
5. **Loading Timeouts** - Handle stuck loading states

## Related Files

- `src/components/shared/loading-states.tsx` - Component definitions
- `src/components/shared/index.ts` - Component exports
- `src/components/editor/editor-dashboard.tsx` - Editor loading states
- `src/components/gallery/submission-card.tsx` - Gallery loading states
- `src/components/committee/kanban-board.tsx` - Committee loading states
- `src/components/forms/submission-form.tsx` - Form loading states
- `src/components/auth/auth-form.tsx` - Auth loading states
- `src/components/mine/mine-client.tsx` - Mine page loading states
