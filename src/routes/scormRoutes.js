// src/routes/scormRouter.js
import { Router } from 'express';
import {
    uploadPackage,
    getManifest,
    getLaunch,
    getPackage,
    getPackages,
    deletePackage,
    testConnection,
    getUserScormScore,
    syncAndGetUserScormProgress
} from '../controllers/ScormController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { uploadMiddleware } from '../middleware/fileUploadMiddleware.js';
import { scormUploadTimeout } from '../middleware/scormUploadTimeout.js';

const scormRouter = Router();

// SCORM Cloud connection test (admin only)
scormRouter.get('/test-connection',
    authenticateToken,
    requireRole(['SUPER_ADMIN', 'HR_MANAGER']),
    testConnection
);

// Upload SCORM package to SCORM Cloud
scormRouter.post(
    '/',
    authenticateToken,
    requireRole(['SUPER_ADMIN', 'HR_MANAGER']),
    scormUploadTimeout,
    uploadMiddleware,
    uploadPackage
);

// Get all SCORM packages
scormRouter.get('/',
    authenticateToken,
    getPackages
);

// Static paths must come before /:id
scormRouter.get('/user/scorm-scores', authenticateToken, getUserScormScore);
scormRouter.get('/scorm-attempts/user/sync', authenticateToken, syncAndGetUserScormProgress);

// Get specific SCORM package details
scormRouter.get('/:id',
    authenticateToken,
    getPackage
);

// Get launch URL from SCORM Cloud
scormRouter.get('/:id/launch',
    authenticateToken,
    getLaunch
);

// Get manifest (compatibility endpoint)
scormRouter.get('/:id/manifest',
    authenticateToken,
    getManifest
);

// Delete SCORM package (from SCORM Cloud and database)
scormRouter.delete('/:id',
    authenticateToken,
    requireRole(['SUPER_ADMIN', 'HR_MANAGER']),
    deletePackage
);

export default scormRouter;