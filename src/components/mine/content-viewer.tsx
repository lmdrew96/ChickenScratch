'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getSignedDownloadUrl } from '@/lib/actions/storage';

type ContentViewerProps = {
  /** R2 object path (e.g. "userId/timestamp-file.pdf") */
  filePath: string;
  /** Original MIME type stored on the submission */
  fileType: string | null;
  /** Original filename for display / download fallback */
  fileName: string | null;
  /** Determines the R2 bucket: 'writing' → 'submissions', 'visual' → 'art' */
  submissionType: 'writing' | 'visual';
};

export function ContentViewer({ filePath, fileType, fileName, submissionType }: ContentViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bucket = submissionType === 'writing' ? 'submissions' : 'art';
  const displayName = fileName || filePath.split('/').pop() || 'File';
  const isImage = fileType?.startsWith('image/') ?? false;
  const isPdf = fileType === 'application/pdf';
  const isTxt = fileType === 'text/plain';
  const isWordDoc = fileType === 'application/msword'
    || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { signedUrl: url, error: urlError } = await getSignedDownloadUrl(filePath, bucket);

      if (cancelled) return;

      if (urlError || !url) {
        setError(urlError || 'Unable to load file.');
        setLoading(false);
        return;
      }

      setSignedUrl(url);

      // For plain text files, fetch the content to display inline
      if (isTxt) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed to fetch text content');
          const text = await res.text();
          if (!cancelled) setTextContent(text);
        } catch {
          if (!cancelled) setError('Unable to load text content.');
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [filePath, bucket, isTxt]);

  function handleDownload() {
    if (signedUrl) window.open(signedUrl, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-white/10 bg-slate-900/40 p-8">
        <p className="text-sm text-white/50">Loading content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/10 p-4 text-sm text-red-200">
        {error}
      </div>
    );
  }

  // Plain text
  if (isTxt && textContent !== null) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-white/50">{displayName}</p>
          <Button type="button" size="sm" variant="outline" onClick={handleDownload}>
            Download
          </Button>
        </div>
        <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-900/40 p-4 text-sm text-white/80">
          {textContent}
        </pre>
      </div>
    );
  }

  // Images
  if (isImage && signedUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-white/50">{displayName}</p>
          <Button type="button" size="sm" variant="outline" onClick={handleDownload}>
            Download
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-900/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={displayName}
            className="mx-auto max-h-[600px] object-contain"
          />
        </div>
      </div>
    );
  }

  // PDF
  if (isPdf && signedUrl) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-white/50">{displayName}</p>
          <Button type="button" size="sm" variant="outline" onClick={handleDownload}>
            Download
          </Button>
        </div>
        <iframe
          src={signedUrl}
          title={displayName}
          className="h-[600px] w-full rounded-lg border border-white/10"
        />
      </div>
    );
  }

  // Word docs and other unsupported types — download only
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
      <div>
        <p className="font-medium">{displayName}</p>
        {isWordDoc && (
          <p className="mt-1 text-xs text-white/50">Word documents cannot be previewed in the browser.</p>
        )}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={handleDownload}>
        Download
      </Button>
    </div>
  );
}
