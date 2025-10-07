'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/ui';
import type { PublishedSubmission } from '@/types/database';

interface PublishedGalleryClientProps {
  submissions: PublishedSubmission[];
}

interface LightboxState {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  downloadUrl?: string;
}

export function PublishedGalleryClient({ submissions }: PublishedGalleryClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'writing' | 'visual'>('all');
  const [issueFilter, setIssueFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [lightbox, setLightbox] = useState<LightboxState>({
    isOpen: false,
    imageUrl: '',
    title: '',
  });
  
  const itemsPerPage = 12;

  // Get unique issues for filter
  const issues = useMemo(() => {
    const uniqueIssues = new Set(
      submissions
        .map(s => s.issue)
        .filter((issue): issue is string => issue !== null && issue !== undefined)
    );
    return Array.from(uniqueIssues).sort();
  }, [submissions]);

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(submission => {
      const matchesSearch = 
        submission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (submission.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesType = typeFilter === 'all' || submission.type === typeFilter;
      
      const matchesIssue = issueFilter === 'all' || submission.issue === issueFilter;
      
      return matchesSearch && matchesType && matchesIssue;
    });
  }, [submissions, searchQuery, typeFilter, issueFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSubmissions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSubmissions, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };

  const openLightbox = (imageUrl: string, title: string, downloadUrl?: string) => {
    setLightbox({ isOpen: true, imageUrl, title, downloadUrl });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightbox({ isOpen: false, imageUrl: '', title: '' });
    document.body.style.overflow = 'unset';
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Published pieces</h1>
          <p className="text-sm text-white/70">
            Explore the latest stories and artwork from the Chicken Scratch community. Visual work includes signed download
            links valid for seven days.
          </p>
        </header>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by title or summary..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 pl-10 text-white placeholder-white/50 transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-white/70">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => handleFilterChange(() => setTypeFilter(e.target.value as typeof typeFilter))}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="all">All</option>
                <option value="writing">Writing</option>
                <option value="visual">Visual Art</option>
              </select>
            </div>

            {/* Issue Filter */}
            {issues.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-white/70">Issue:</label>
                <select
                  value={issueFilter}
                  onChange={(e) => handleFilterChange(() => setIssueFilter(e.target.value))}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white transition focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="all">All Issues</option>
                  {issues.map((issue) => (
                    <option key={issue} value={issue}>
                      {issue}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Results Count */}
            <div className="ml-auto flex items-center text-sm text-white/60">
              {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'result' : 'results'}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedSubmissions.map((submission) => (
            <article
              key={submission.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-black/30 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-xl hover:shadow-black/40"
            >
              {/* Image */}
              <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-amber-500/40 to-purple-500/30">
                {submission.coverSignedUrl ? (
                  <>
                    <img
                      src={submission.coverSignedUrl}
                      alt={submission.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {/* Overlay buttons for visual art */}
                    {submission.type === 'visual' && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <button
                          onClick={() => openLightbox(submission.coverSignedUrl!, submission.title, submission.coverSignedUrl ?? undefined)}
                          className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-white"
                          title="View full size"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDownload(submission.coverSignedUrl!, `${submission.title}.jpg`)}
                          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
                          title="Download image"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-sm font-semibold uppercase tracking-wide text-white/70">Chicken Scratch</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <StatusBadge status="published" />
                  {submission.issue && (
                    <span className="rounded-full bg-white/10 px-2 py-1">{submission.issue}</span>
                  )}
                  <span>{submission.type === 'writing' ? 'Writing' : 'Visual art'}</span>
                </div>
                
                <h2 className="text-xl font-semibold text-white transition group-hover:text-amber-200">
                  {submission.title}
                </h2>
                
                <p className="line-clamp-2 text-sm text-white/70">
                  {submission.summary ?? 'No summary provided.'}
                </p>
                
                <div className="mt-auto flex items-center justify-between gap-2 text-sm text-white/60">
                  <Link
                    href={`/published/${submission.id}`}
                    className="text-amber-200 transition hover:text-amber-100 hover:underline"
                  >
                    View details
                  </Link>
                  {submission.published_url && (
                    <a
                      href={submission.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-200 transition hover:text-amber-100 hover:underline"
                    >
                      External link
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Empty State */}
        {filteredSubmissions.length === 0 && (
          <EmptyState
            variant="search"
            title="No published works found"
            description="No published work matches your current filters. Try adjusting your search criteria or clearing all filters to see more results."
            action={{
              label: "Clear all filters",
              onClick: () => {
                setSearchQuery('');
                setTypeFilter('all');
                setIssueFilter('all');
                setCurrentPage(1);
              }
            }}
            secondaryAction={{
              label: "Submit your work",
              href: "/submit"
            }}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/5"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage = 
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);
                
                const showEllipsis = 
                  (page === 2 && currentPage > 3) ||
                  (page === totalPages - 1 && currentPage < totalPages - 2);

                if (showEllipsis) {
                  return (
                    <span key={page} className="px-2 text-white/50">
                      ...
                    </span>
                  );
                }

                if (!showPage) return null;

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[40px] rounded-lg px-3 py-2 text-sm font-medium transition ${
                      currentPage === page
                        ? 'bg-amber-500 text-white'
                        : 'border border-white/20 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {lightbox.downloadUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(lightbox.downloadUrl!, `${lightbox.title}.jpg`);
              }}
              className="absolute right-4 top-16 rounded-full bg-amber-500 p-2 text-white transition hover:bg-amber-600"
              aria-label="Download image"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
          
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.imageUrl}
              alt={lightbox.title}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
            <p className="mt-4 text-center text-sm text-white/80">{lightbox.title}</p>
          </div>
        </div>
      )}
    </>
  );
}
