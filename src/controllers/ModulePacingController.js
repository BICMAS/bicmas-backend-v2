import { getModuleAccessForUser } from '../lib/modulePacing.js';
import { AssignmentModel } from '../models/AssignmentModel.js';

export const getCourseModuleAccess = async (req, res) => {
    try {
        const { id: courseId } = req.params;
        const now = req.query.now ? Number(req.query.now) : Date.now();

        if (req.user.userRole === 'LEARNER') {
            const assignment = await AssignmentModel.findByCourseAndLearner(courseId, req.user.id);
            if (!assignment) {
                return res.status(403).json({ success: false, error: 'Course not assigned to learner' });
            }
        }

        const access = await getModuleAccessForUser(req.user.id, courseId, now);

        res.json({
            success: true,
            data: access,
        });
    } catch (error) {
        console.error('[MODULE ACCESS ERROR]', error.message);
        res.status(400).json({ success: false, error: error.message });
    }
};
