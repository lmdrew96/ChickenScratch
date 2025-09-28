// API request/response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface SubmissionCreateRequest {
  title: string;
  type: 'writing' | 'visual';
  genre: string;
  summary?: string;
  content_warnings?: string;
  text_body?: string;
  files?: File[];
}

export interface SubmissionUpdateRequest extends Partial<SubmissionCreateRequest> {
  id: string;
}

export interface StatusUpdateRequest {
  submissionId: string;
  status: string;
  notes?: string;
  assignedEditor?: string;
}

export interface CommitteeWorkflowRequest {
  submissionId: string;
  action: string;
  comment?: string;
  linkUrl?: string;
}

export interface AuthSignInRequest {
  email: string;
  password: string;
}

export interface AuthSignUpRequest extends AuthSignInRequest {
  full_name: string;
}

export interface FileUploadResponse {
  url: string;
  path: string;
  error?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}