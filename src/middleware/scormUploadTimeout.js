/** Max time allowed for receiving a ZIP and forwarding it to SCORM Cloud. */
const DEFAULT_SCORM_UPLOAD_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export function getScormUploadTimeoutMs() {
    const fromEnv = Number(process.env.SCORM_UPLOAD_TIMEOUT_MS);
    return fromEnv > 0 ? fromEnv : DEFAULT_SCORM_UPLOAD_TIMEOUT_MS;
}

/** Scale upload timeout from file size (~30s per MB, min 15 min, max 2h). */
export function getScormUploadTimeoutForBytes(fileSizeBytes = 0) {
    const cap = getScormUploadTimeoutMs();
    const baseMs = 15 * 60 * 1000;
    const perMbMs = 30 * 1000;
    const sizeMb = fileSizeBytes / (1024 * 1024);
    return Math.min(cap, Math.max(baseMs, baseMs + sizeMb * perMbMs));
}

export function scormUploadTimeout(req, res, next) {
    const timeoutMs = getScormUploadTimeoutMs();
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs);
    next();
}
