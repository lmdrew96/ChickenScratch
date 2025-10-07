# User Feedback System Implementation

## Overview

This document describes the comprehensive user feedback system implemented for ChickenScratch. The system provides clear, accessible feedback for all user actions including form submissions, API calls, errors, and destructive operations.

## Components

### 1. Feedback Components (`src/components/ui/feedback.tsx`)

#### ErrorMessage
Displays error messages with optional recovery actions.

**Props:**
- `title` (optional): Error title (default: "Something went wrong")
- `message` (required): Error description
- `actions` (optional): Array of recovery action buttons
- `className` (optional): Additional CSS classes
- `onDismiss` (optional): Callback for dismissing the error

**Usage:**
```tsx
<ErrorMessage
  title="Submission Failed"
  message="Unable to submit your work. Please try again."
  actions={[
    {
      label: 'Try Again',
      onClick: () => handleRetry(),
      variant: 'primary'
    }
  ]}
  onDismiss={() => clearError()}
/>
```

#### SuccessMessage
Displays success messages with optional action button.

**Props:**
- `title` (optional): Success title (default: "Success")
- `message` (required): Success description
- `action` (optional): Single action button
- `className` (optional): Additional CSS classes
- `onDismiss` (optional): Callback for dismissing the message

**Usage:**
```tsx
<SuccessMessage
  title="Submission Successful"
  message="Your work has been submitted for review."
  action={{
    label: 'View Submissions',
    onClick: () => router.push('/mine')
  }}
/>
```

#### LoadingOverlay
Full loading state with optional progress indicator.

**Props:**
- `message` (optional): Loading message (default: "Loading...")
- `progress` (optional): Progress percentage (0-100)
- `className` (optional): Additional CSS classes

**Usage:**
```tsx
<LoadingOverlay
  message="Uploading your submission..."
  progress={uploadProgress}
/>
```

#### InlineLoading
Compact loading indicator for inline use.

**Props:**
- `message` (optional): Loading message (default: "Loading...")
- `size` (optional): 'sm' | 'md' (default: 'sm')
- `className` (optional): Additional CSS classes

**Usage:**
```tsx
<InlineLoading message="Saving draft..." size="sm" />
```

#### FieldError
Displays form field validation errors.

**Props:**
- `error` (optional): Error message to display
- `className` (optional): Additional CSS classes

**Usage:**
```tsx
<FieldError error={errors.email} />
```

#### InfoMessage
Displays informational or warning messages.

**Props:**
- `title` (optional): Message title
- `message` (required): Message content
- `icon` (optional): 'info' | 'warning' (default: 'info')
- `className` (optional): Additional CSS classes
- `onDismiss` (optional): Callback for dismissing the message

**Usage:**
```tsx
<InfoMessage
  message="Password must be at least 8 characters"
  icon="info"
/>
```

### 2. Hooks

#### useFeedback (`src/hooks/use-feedback.ts`)
Manages feedback state and integrates with toast notifications.

**Returns:**
- `feedback`: Current feedback state
- `showSuccess(message, title?, useToast?)`: Show success message
- `showError(message, title?, useToast?)`: Show error message
- `showInfo(message, title?, useToast?)`: Show info message
- `clearFeedback()`: Clear current feedback

**Usage:**
```tsx
const { feedback, showSuccess, showError, clearFeedback } = useFeedback();

// Show error
showError('Unable to save changes', 'Save Failed');

// Show success with toast
showSuccess('Changes saved successfully', 'Success', true);

// Clear feedback
clearFeedback();
```

#### useConfirmation (`src/hooks/use-confirmation.ts`)
Manages confirmation dialogs for destructive actions.

**Returns:**
- `isOpen`: Dialog open state
- `options`: Current confirmation options
- `isProcessing`: Processing state during confirmation
- `confirm(options)`: Show confirmation dialog
- `handleConfirm()`: Execute confirmed action
- `handleCancel()`: Cancel and close dialog

**Usage:**
```tsx
const confirmation = useConfirmation();

// Show confirmation
confirmation.confirm({
  title: 'Delete Submission',
  message: 'Are you sure you want to delete this submission? This action cannot be undone.',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  variant: 'danger',
  onConfirm: async () => {
    await deleteSubmission(id);
  }
});

// Render dialog
{confirmation.options && (
  <ConfirmModal
    isOpen={confirmation.isOpen}
    onClose={confirmation.handleCancel}
    onConfirm={confirmation.handleConfirm}
    title={confirmation.options.title}
    message={confirmation.options.message}
    confirmText={confirmation.options.confirmText}
    cancelText={confirmation.options.cancelText}
    variant={confirmation.options.variant}
  />
)}
```

## Implementation Examples

### Form Submission with Feedback

```tsx
import { useFeedback } from '@/hooks/use-feedback';
import { ErrorMessage, SuccessMessage, FieldError } from '@/components/ui/feedback';

function MyForm() {
  const { feedback, showSuccess, showError, clearFeedback } = useFeedback();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    clearFeedback();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        showError(data.error || 'Submission failed', 'Error');
        return;
      }

      showSuccess('Your submission was successful!', 'Success', true);
      setTimeout(() => router.push('/success'), 2000);
    } catch (error) {
      showError('Network error. Please check your connection.', 'Connection Error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {feedback.type === 'error' && (
        <ErrorMessage
          title={feedback.title}
          message={feedback.message}
          actions={[
            {
              label: 'Try Again',
              onClick: clearFeedback,
              variant: 'primary'
            }
          ]}
          onDismiss={clearFeedback}
        />
      )}

      {feedback.type === 'success' && (
        <SuccessMessage
          title={feedback.title}
          message={feedback.message}
          onDismiss={clearFeedback}
        />
      )}

      <input name="email" />
      <FieldError error={errors.email} />

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Destructive Action with Confirmation

```tsx
import { useConfirmation } from '@/hooks/use-confirmation';
import { ConfirmModal } from '@/components/ui/modal';

function EditorDashboard() {
  const confirmation = useConfirmation();

  function handleDecline() {
    confirmation.confirm({
      title: 'Decline Submission',
      message: 'Are you sure you want to decline this submission? The author will be notified via email.',
      confirmText: 'Decline',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        await declineSubmission();
      }
    });
  }

  return (
    <>
      <button onClick={handleDecline}>Decline</button>

      {confirmation.options && (
        <ConfirmModal
          isOpen={confirmation.isOpen}
          onClose={confirmation.handleCancel}
          onConfirm={confirmation.handleConfirm}
          title={confirmation.options.title}
          message={confirmation.options.message}
          confirmText={confirmation.options.confirmText}
          cancelText={confirmation.options.cancelText}
          variant={confirmation.options.variant}
        />
      )}
    </>
  );
}
```

## Accessibility Features

All feedback components include:

- **ARIA roles**: `role="alert"` for errors, `role="status"` for success/info
- **Live regions**: `aria-live="assertive"` for errors, `aria-live="polite"` for other messages
- **Keyboard navigation**: All interactive elements are keyboard accessible
- **Focus management**: Proper focus handling in modals and dialogs
- **Screen reader support**: Descriptive labels and announcements

## Best Practices

1. **Clear Messages**: Use specific, actionable error messages
2. **Recovery Actions**: Provide clear paths to recover from errors
3. **Loading States**: Show loading indicators for all async operations
4. **Confirmation Dialogs**: Use for all destructive or irreversible actions
5. **Toast Notifications**: Use for non-blocking success messages
6. **Field Validation**: Show inline errors for form fields
7. **Network Errors**: Provide specific guidance for connection issues

## Testing Checklist

- [ ] Success messages display correctly after form submissions
- [ ] Error messages show with recovery actions
- [ ] Loading states appear during API calls
- [ ] Confirmation dialogs prevent accidental destructive actions
- [ ] Field errors display inline with proper validation
- [ ] Toast notifications appear and auto-dismiss
- [ ] All feedback is keyboard accessible
- [ ] Screen readers announce feedback appropriately
- [ ] Network errors provide helpful guidance
- [ ] Multiple feedback types don't conflict

## Future Enhancements

- Add animation transitions for feedback components
- Implement undo functionality for certain actions
- Add progress tracking for multi-step operations
- Create feedback analytics to track common errors
- Implement retry logic with exponential backoff
- Add offline detection and queuing
