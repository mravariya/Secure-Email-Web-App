"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOLDERS = exports.JWT_REFRESH_EXPIRY = exports.JWT_ACCESS_EXPIRY = exports.API_VERSION = void 0;
exports.apiError = apiError;
exports.API_VERSION = 'v1';
exports.JWT_ACCESS_EXPIRY = '15m';
exports.JWT_REFRESH_EXPIRY = '7d';
exports.FOLDERS = ['inbox', 'sent', 'drafts', 'spam', 'trash'];
function apiError(code, message, details) {
    return { code, message, details };
}
//# sourceMappingURL=index.js.map