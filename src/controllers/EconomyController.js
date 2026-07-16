import { EconomyService } from '../service/EconomyService.js';

export const getEconomyRules = async (req, res) => {
    try {
        const [rules, stats, leaderboard] = await Promise.all([
            EconomyService.getRules(),
            EconomyService.getStats(),
            EconomyService.getLeaderboard(10),
        ]);

        res.json({
            rules,
            totalCirculating: stats.totalCirculating,
            leaderboard,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateEconomyRules = async (req, res) => {
    try {
        const rules = await EconomyService.updateRules(req.body, req.user.id);
        const [stats, leaderboard] = await Promise.all([
            EconomyService.getStats(),
            EconomyService.getLeaderboard(10),
        ]);

        res.json({
            rules,
            totalCirculating: stats.totalCirculating,
            leaderboard,
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
