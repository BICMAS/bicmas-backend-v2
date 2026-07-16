import { GroupService } from '../service/GroupService.js';

export const getGroups = async (req, res) => {
    try {
        const groups = await GroupService.getGroups();
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createGroup = async (req, res) => {
    try {
        const result = await GroupService.createGroup(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const addGroupMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.body;
        const result = await GroupService.addGroupMember(id, userId, role);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};