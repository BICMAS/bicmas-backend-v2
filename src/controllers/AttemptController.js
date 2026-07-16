import { AttemptService } from '../service/AttemptService.js';

export const updateProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { completionPercentage, status, notes } = req.body;
        const result = await AttemptService.updateProgress(courseId, { completionPercentage, status, notes }, req.user);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const syncScormProgress = async (req, res) => {
    try {
        const { scormAttemptId } = req.params;
        const updated = await AttemptService.syncScormProgress(scormAttemptId, req.user);
        res.json({
            success: true,
            data: updated
        });
    } catch (error) {
        console.error('[SCORM SYNC ERROR]', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

export const retakeCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const result = await AttemptService.retakeCourse(courseId, req.user);
        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};