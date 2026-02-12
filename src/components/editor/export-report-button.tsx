'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

export function ExportReportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    setShowSuccess(false);

    try {
      const response = await fetch('/api/editor/export-report');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export report');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1]
        ?? `chicken-scratch-report-${new Date().toISOString().split('T')[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert(
        `Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-[var(--text)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span>Generating Report...</span>
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            <span>Export Report</span>
          </>
        )}
      </button>

      {showSuccess && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-lg border border-green-500/50 bg-green-900/20 px-4 py-2 text-sm text-green-200">
          ✓ Report exported successfully!
        </div>
      )}
    </div>
  );
}
