'use client';

import { useState } from 'react';
import type { Submission } from '@/types/database';
import { StatusBadge } from '@/components/common/status-badge';
import { LoadingSkeleton } from '@/components/shared/loading-states';

interface SubmissionCardProps {
  submission: Submission & {
    art_files?: string[];
    owner?: { name: string | null; email: string | null };
  };
  onClick?: () => void;
  showAuthor?: boolean;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SubmissionCard({ 
  submission, 
  onClick, 
  showAuthor = false, 
  showStatus = false,
  size = 'md'
}: SubmissionCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const sizeClasses = {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-80'
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const getPreviewImage = () => {
    if (submission.type === 'visual' && submission.art_files && submission.art_files.length > 0) {
      return submission.art_files[0];
    }
    return submission.cover_image;
  };

  const previewImage = getPreviewImage();

  return (
    <div 
      className={`submission-card ${sizeClasses[size]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="submission-card-image">
        {previewImage && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSkeleton className="w-full h-full" variant="rectangular" />
              </div>
            )}
            <img
              src={previewImage}
              alt={submission.title}
              onError={handleImageError}
              onLoad={handleImageLoad}
              className={`submission-image ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            />
          </>
        ) : (
          <div className="submission-placeholder">
            <div className="submission-placeholder-icon">
              {submission.type === 'writing' ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="submission-placeholder-text">
              {submission.type === 'writing' ? 'Writing' : 'Visual Art'}
            </p>
          </div>
        )}
      </div>
      
      <div className="submission-card-content">
        <h3 className="submission-title">{submission.title}</h3>
        
        <div className="submission-meta">
          {submission.genre && (
            <span className="submission-genre">{submission.genre}</span>
          )}
          {showStatus && (
            <StatusBadge status={submission.status} />
          )}
        </div>
        
        {showAuthor && submission.owner && (
          <p className="submission-author">
            by {submission.owner.name || submission.owner.email || 'Anonymous'}
          </p>
        )}
        
        {submission.summary && (
          <p className="submission-summary">
            {submission.summary}
          </p>
        )}
      </div>
    </div>
  );
}

interface SubmissionGridProps {
  submissions: Array<Submission & {
    art_files?: string[];
    owner?: { name: string | null; email: string | null };
  }>;
  onSubmissionClick?: (submission: any) => void;
  showAuthor?: boolean;
  showStatus?: boolean;
  cardSize?: 'sm' | 'md' | 'lg';
  emptyMessage?: string;
}

export function SubmissionGrid({
  submissions,
  onSubmissionClick,
  showAuthor = false,
  showStatus = false,
  cardSize = 'md',
  emptyMessage = 'No submissions found.'
}: SubmissionGridProps) {
  if (submissions.length === 0) {
    return (
      <div className="submission-grid-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="submission-grid">
      {submissions.map((submission) => (
        <SubmissionCard
          key={submission.id}
          submission={submission}
          onClick={() => onSubmissionClick?.(submission)}
          showAuthor={showAuthor}
          showStatus={showStatus}
          size={cardSize}
        />
      ))}
    </div>
  );
}
