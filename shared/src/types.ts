/**
 * Shared TypeScript Types for SafePath Platform
 * Used by both backend and frontend/mobile apps
 */

export type UserRole = 'user' | 'lgu_admin' | 'superadmin';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface UserWithoutPassword extends User {}

export interface AuthRequest {
    email: string;
    password: string;
}

export interface RegisterRequest extends AuthRequest {
    name: string;
}

export interface AuthResponse {
    user: UserWithoutPassword;
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

export interface RefreshTokenRequest {
    refresh_token: string;
}

export interface TokenPayload {
    id: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}

export type SeverityLevel = 'low' | 'medium' | 'high';
export type VoteType = 'up' | 'down';


export interface Location {
    latitude: number;
    longitude: number;
}

export interface Report {
    id: string;
    user_id: string;
    title: string;
    description: string;
    location: Location;
    severity_level: SeverityLevel;
    sentiment_score: number;
    upvotes_count: number;
    downvotes_count: number;
    user_vote?: VoteType;
    created_at: string;
    updated_at: string;
}


export interface CreateReportRequest {
    title: string;
    description: string;
    location: Location;
}

export interface UpdateReportRequest {
    title?: string;
    description?: string;
    severity_level?: SeverityLevel;
}

export interface ReportWithUser extends Report {
    user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface ReportListResponse {
    data: ReportWithUser[];
    total: number;
    page: number;
    limit: number;
}

export interface ReportComment {
    id: string;
    report_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    updated_at: string;
}

export interface ReportVote {
    id: string;
    report_id: string;
    user_id: string;
    vote_type: VoteType;
    created_at: string;
}


export interface CreateCommentRequest {
    comment: string;
}

export interface ReportCommentWithUser extends ReportComment {
    user: Pick<User, 'id' | 'name'>;
}

export type PathType = 'road' | 'dirt';

export interface StreetRating {
    id: string;
    user_id: string;
    path_type: PathType;
    street_name?: string;
    location: Location;
    lighting_score: number;
    pedestrian_safety_score: number;
    driver_safety_score: number;
    overall_safety_score: number;
    created_at: string;
    updated_at: string;
}

export interface CreateStreetRatingRequest {
    path_type: PathType;
    street_name?: string;
    location: Location;
    lighting_score: number;
    pedestrian_safety_score: number;
    driver_safety_score: number;
    overall_safety_score: number;
    comment?: string;
}

export interface StreetStats {
    path_type: PathType;
    street_name?: string;
    average_rating: number;
    total_ratings: number;
    location: Location;
}

export interface HeatmapPoint {
    latitude: number;
    longitude: number;
    intensity: number;
}

export interface HeatmapResponse {
    data: HeatmapPoint[];
    bounds: {
        min_lat: number;
        max_lat: number;
        min_lng: number;
        max_lng: number;
    };
    generated_at: string;
}

export interface HeatmapFilter {
    min_latitude: number;
    max_latitude: number;
    min_longitude: number;
    max_longitude: number;
    severity_level?: SeverityLevel;
    days_back?: number;
    start_date?: string;
    end_date?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
    request_id?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
