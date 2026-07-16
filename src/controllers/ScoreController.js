import { ScoreService } from '../service/ScoreService.js';

export const getMyScores = async (req, res) => {
    try {
        const result = await ScoreService.getMyScores(req.user.id);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getOrgScores = async (req, res) => {
    try {
        const { orgId } = req.user;
        if (!orgId) throw new Error('HR must be in an organization');

        const { learnerId, limit, offset } = req.query;
        const result = await ScoreService.getOrgScores(orgId, {
            learnerId: learnerId || null,
            limit: limit ? parseInt(limit, 10) : 100,
            offset: offset ? parseInt(offset, 10) : 0,
        });
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(403).json({ success: false, error: error.message });
    }
};

export const getLeaderboard = async (req, res) => {
    try {
        const metric = ['points', 'score', 'completion'].includes(req.query.metric)
            ? req.query.metric
            : 'points';
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

        let orgId = null;
        if (req.user.userRole === 'HR_MANAGER') {
            orgId = req.user.orgId;
            if (!orgId) throw new Error('HR must be in an organization');
        } else if (req.user.userRole === 'LEARNER') {
            orgId = req.user.orgId ?? null;
        }

        const result = await ScoreService.getLeaderboard({ metric, orgId, limit });
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(403).json({ success: false, error: error.message });
    }
};
