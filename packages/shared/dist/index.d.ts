export declare const API_VERSION = "v1";
export declare const JWT_ACCESS_EXPIRY = "15m";
export declare const JWT_REFRESH_EXPIRY = "7d";
export declare const FOLDERS: readonly ["inbox", "sent", "drafts", "spam", "trash"];
export type Folder = (typeof FOLDERS)[number];
export interface ApiError {
    code: string;
    message: string;
    details?: unknown[];
}
export declare function apiError(code: string, message: string, details?: unknown[]): ApiError;
//# sourceMappingURL=index.d.ts.map