import { LearningPathService } from '../service/LearningPathService.js';
export const createPath = async (req, res) => {
    try {
        const result = await LearningPathService.createPath(req.body, req.user);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getAllPaths = async (req, res) => {
    try {
        const result = await LearningPathService.getAllPaths();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};