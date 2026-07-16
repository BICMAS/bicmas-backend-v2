import { RewardService } from '../service/RewardService.js';

export const awardPoints = async (req, res) => {
    try {
        const { learnerId, points } = req.body;
        const result = await RewardService.awardPoints(learnerId, points, req.user);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};