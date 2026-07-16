import { UserService } from '../service/UserService.js'
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

export const getAllUsers = async (req, res) => {
    try {
        const users = await UserService.getAllUsers(req.user);
        res.json(users);
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
};

export const getCurrentOrgUsers = async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[ORG CTRL START] ${timestamp} - User role: ${req.user.userRole}, orgId: ${req.user.orgId}`);

    try {
        const users = await UserService.getCurrentOrgUsers(req.user);
        console.log(`[ORG CTRL END] ${timestamp} - Returned ${users.length} users`);
        res.json(users || []);  // FIXED: Always return array (empty OK)
    } catch (error) {
        console.error(`[ORG CTRL ERROR] ${timestamp} - ${error.message}`);
        res.status(500).json({ error: error.message });  // FIXED: 500 for service errors (not 403)
    }
};
export const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await UserService.getUser(id, req.user);
        res.json(user);
    } catch (error) {
        const status = error.message === 'Access denied' || error.message.includes('Insufficient role')
            ? 403
            : 404;
        res.status(status).json({ error: error.message });
    }
};

export const createUser = async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[USER CTRL START] ${timestamp} - Body keys: ${Object.keys(req.body).join(', ')}, req.user: ${req.user ? req.user.userRole : 'UNDEFINED'}`);

    try {
        if (!req.user) {
            console.log(`[USER CTRL FAIL] ${timestamp} - No req.user, 401`);
            return res.status(401).json({ error: 'Unauthorized - no user context' });
        }

        const result = await UserService.createUser(req.body, req.user);
        console.log(`[USER CTRL SUCCESS] ${timestamp} - Created user ID: ${result.id}`);
        res.status(201).json(result);
    } catch (error) {
        console.error(`[USER CTRL ERROR] ${timestamp} - ${error.message}`);
        res.status(400).json({ error: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await UserService.updateUser(id, req.body, req.user);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const blockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await UserService.blockUser(id);
        res.json(result);
    } catch (error) {
        const status = error.message === 'User not found' ? 404 : 400;
        res.status(status).json({ error: error.message });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await UserService.unblockUser(id);
        res.json(result);
    } catch (error) {
        const status = error.message === 'User not found' ? 404 : 400;
        res.status(status).json({ error: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await UserService.deleteUser(id, req.user);
        res.json(result);
    } catch (error) {
        const status = error.message === 'User not found' ? 404 : 400;
        res.status(status).json({ error: error.message });
    }
};

export const bulkUpload = (req, res) => {
    upload.single('csv')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: 'File upload failed' });
        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                fs.unlinkSync(req.file.path);  // Clean up
                try {
                    const result = await UserService.bulkUpload(results, req.user);
                    res.json(result);
                } catch (error) {
                    res.status(400).json({ error: error.message });
                }
            });
    });
};