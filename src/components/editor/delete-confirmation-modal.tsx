'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  submissionTitle: string;
  submissionAuthor: string;
  hasFile: boolean;
  hasGoogleDoc: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  submissionTitle,
  submissionAuthor,
  hasFile,
  hasGoogleDoc,
}: DeleteConfirmationModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error deleting submission:', error);
    } finally {
      setIsDeleting(false);
      setConfirmText('');
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isDeleting}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200 disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start gap-4">
          <div className="rounded-full bg-red-500/20 p-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h2
              id="delete-modal-title"
              className="text-xl font-bold text-red-400"
            >
              Delete Submission
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Warning message */}
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-200">
            Are you sure you want to permanently delete this submission?
          </p>
        </div>

        {/* Submission details */}
        <div className="mb-6 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Title
            </p>
            <p className="mt-1 font-semibold text-slate-100">{submissionTitle}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Author
            </p>
            <p className="mt-1 text-slate-200">{submissionAuthor}</p>
          </div>
        </div>

        {/* What will be deleted */}
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-slate-300">
            The following will be permanently deleted:
          </p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <span className="text-red-400">•</span>
              Submission record from database
            </li>
            {hasFile && (
              <li className="flex items-center gap-2">
                <span className="text-red-400">•</span>
                Uploaded file from storage
              </li>
            )}
            {hasGoogleDoc && (
              <li className="flex items-center gap-2">
                <span className="text-red-400">•</span>
                Google Doc link (document itself will remain in Google Drive)
              </li>
            )}
          </ul>
        </div>

        {/* Confirmation input */}
        <div className="mb-6">
          <label
            htmlFor="confirm-delete"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Type <span className="font-bold text-red-400">DELETE</span> to confirm
          </label>
          <input
            id="confirm-delete"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-slate-100 placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
            placeholder="Type DELETE"
            autoComplete="off"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 font-semibold text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmText !== 'DELETE' || isDeleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500 bg-red-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
