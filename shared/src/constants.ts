/**
 * Shared Constants for SafePath Platform
 */

export const API_BASE_PATH = "/api/v1";

export const API_ENDPOINTS = {
    AUTH_REGISTER: "/auth/register",
    AUTH_LOGIN: "/auth/login",
    AUTH_REFRESH: "/auth/refresh",
    AUTH_LOGOUT: "/auth/logout",
    REPORTS_LIST: "/reports",
    REPORTS_CREATE: "/reports",
    REPORTS_GET: (id: string) => `/reports/${id}`,
    REPORTS_UPDATE: (id: string) => `/reports/${id}`,
    REPORTS_DELETE: (id: string) => `/reports/${id}`,
    REPORTS_COMMENTS: (id: string) => `/reports/${id}/comments`,
    STREET_RATE: "/streets/rate",
    STREET_RATINGS: "/streets/ratings",
    STREET_STATS: (name: string) => `/streets/stats/${name}`,
    HEATMAP_DATA: "/heatmap/data",
    HEATMAP_REGENERATE: "/heatmap/regenerate",
    ADMIN_STATS: "/admin/stats",
    ADMIN_REPORTS: "/admin/reports",
    ADMIN_HEATMAP: "/admin/heatmap",
    ADMIN_ANALYTICS: "/admin/analytics",
    HEALTH: "/health",
};

export const USER_ROLES = {
    USER: "user" as const,
    LGU_ADMIN: "lgu_admin" as const,
    SUPERADMIN: "superadmin" as const,
};

export const ADMIN_ROLES = [USER_ROLES.LGU_ADMIN, USER_ROLES.SUPERADMIN];

export const SEVERITY_LEVELS = {
    LOW: "low" as const,
    MEDIUM: "medium" as const,
    HIGH: "high" as const,
};

export const SEVERITY_LEVEL_ORDER = {
    low: 1,
    medium: 2,
    high: 3,
};

export const DEFAULT_PAGINATION = {
    PAGE: 1,
    LIMIT: 10,
    MAX_LIMIT: 100,
};

export const VALIDATION_RULES = {
    EMAIL_MIN_LENGTH: 5,
    EMAIL_MAX_LENGTH: 255,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    TITLE_MIN_LENGTH: 5,
    TITLE_MAX_LENGTH: 100,
    DESCRIPTION_MIN_LENGTH: 10,
    DESCRIPTION_MAX_LENGTH: 1000,
    STREET_NAME_MIN_LENGTH: 3,
    STREET_NAME_MAX_LENGTH: 255,
    COMMENT_MIN_LENGTH: 1,
    COMMENT_MAX_LENGTH: 500,
    SAFETY_SCORE_MIN: 1,
    SAFETY_SCORE_MAX: 5,
};

export const ERROR_CODES = {
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
    INVALID_TOKEN: "INVALID_TOKEN",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    UNAUTHORIZED: "UNAUTHORIZED",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    INVALID_LOCATION: "INVALID_LOCATION",
    INVALID_SEVERITY: "INVALID_SEVERITY",
    REPORT_NOT_FOUND: "REPORT_NOT_FOUND",
    COMMENT_NOT_FOUND: "COMMENT_NOT_FOUND",
    RATING_NOT_FOUND: "RATING_NOT_FOUND",
    FORBIDDEN: "FORBIDDEN",
    ADMIN_ONLY: "ADMIN_ONLY",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
};

export const SOCKET_EVENTS = {
    CONNECT: "connect",
    DISCONNECT: "disconnect",
    REPORT_NEW: "report:new",
    REPORT_UPDATED: "report:updated",
    REPORT_DELETED: "report:deleted",
    REPORT_SUBSCRIBE: "report:subscribe",
    REPORT_UNSUBSCRIBE: "report:unsubscribe",
    HEATMAP_UPDATED: "heatmap:updated",
    HEATMAP_SUBSCRIBE: "heatmap:subscribe",
    HEATMAP_UNSUBSCRIBE: "heatmap:unsubscribe",
    COMMENT_NEW: "comment:new",
    COMMENT_DELETED: "comment:deleted",
    SUBSCRIBE_AREA: "area:subscribe",
    UNSUBSCRIBE_AREA: "area:unsubscribe",
    ERROR: "error",
};

export const MAP_CONFIG = {
    CENTER_LAT: 15.31997,
    CENTER_LNG: 119.99002,
    DEFAULT_ZOOM: 13,
    MIN_ZOOM: 10,
    MAX_ZOOM: 20,
};

export const TOKEN_EXPIRY = {
    ACCESS: 3600,
    REFRESH: 2592000,
};

export const FEATURES = {
    ENABLE_SOCKET_IO: true,
    ENABLE_SENTIMENT_ANALYSIS: true,
    ENABLE_HEATMAP_CACHING: true,
};
