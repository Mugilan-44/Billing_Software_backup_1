// Re-export all auth middleware from authMiddleware.js for compatibility
// New code imports from 'auth.middleware.js', old code from 'authMiddleware.js'
export { protect, authorizeRoles, companyScope, checkPermission, authorize, authenticate } from './authMiddleware.js';
