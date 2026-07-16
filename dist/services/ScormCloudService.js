"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ScormCloudService = void 0;
var _axios = _interopRequireDefault(require("axios"));
var _fs = _interopRequireDefault(require("fs"));
var _uuid = require("uuid");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
class ScormCloudService {
  static client = null;
  static formatAxiosError(err, fallbackMessage) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const detail = typeof data === 'string' ? data : data?.message || data?.error || (data && Object.keys(data).length > 0 ? JSON.stringify(data) : null);
    return new Error(`${fallbackMessage}${status ? ` (status ${status})` : ''}: ${detail || err.message || 'Unknown SCORM Cloud error'}`);
  }
  static init() {
    if (!this.client) {
      this.client = _axios.default.create({
        baseURL: 'https://cloud.scorm.com/api/v2',
        auth: {
          username: process.env.SCORM_CLOUD_APP_ID,
          password: process.env.SCORM_CLOUD_SECRET_KEY
        },
        headers: {
          Accept: 'application/json'
        },
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
    }
    return this.client;
  }

  /**
   * Submit a SCORM package to SCORM Cloud's import queue.
   *
   * The file is streamed (not buffered into memory) to avoid OOM crashes on
   * memory-constrained hosts, and this resolves as soon as the import job is
   * accepted — it does NOT wait for the import to finish. Use
   * `waitForImportJob` separately (e.g. in the background) to confirm.
   */
  static async submitCourseUpload(filePath, filename, lessonId = null) {
    console.log(`[UPLOAD] Submitting: ${filename} (lesson: ${lessonId || 'none'})`);
    if (!_fs.default.existsSync(filePath)) throw new Error(`File missing: ${filePath}`);
    const stats = _fs.default.statSync(filePath);
    if (stats.size === 0) throw new Error('File empty');
    const courseId = lessonId ? `lesson-${lessonId}` : `pkg-${(0, _uuid.v4)().replace(/-/g, '')}`;
    const FormData = (await Promise.resolve().then(() => _interopRequireWildcard(require('form-data')))).default;
    const form = new FormData();
    // Stream the file instead of reading it fully into memory. `knownLength`
    // lets form-data set Content-Length so SCORM Cloud accepts the body.
    form.append('file', _fs.default.createReadStream(filePath), {
      filename,
      contentType: 'application/zip',
      knownLength: stats.size
    });
    form.append('mayCreateNewVersion', 'true');
    const client = this.init();
    const endpoint = `/courses/importJobs/upload?courseId=${encodeURIComponent(courseId)}`;
    console.log(`[UPLOAD] POST to: ${endpoint}`);
    const res = await client.post(endpoint, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log('[UPLOAD] Status:', res.status);
    console.log('[UPLOAD] Data:', JSON.stringify(res.data, null, 2));
    let jobId;
    if (res.data.id) {
      jobId = res.data.id;
    } else if (res.data.result) {
      if (res.data.result.includes(courseId)) {
        jobId = res.data.result.replace(courseId, '');
      } else {
        jobId = res.data.result.substring(0, 10);
      }
    }
    if (!jobId) throw new Error('No jobId extracted from SCORM Cloud upload response');
    console.log(`[UPLOAD] Job ID: ${jobId}`);
    return {
      jobId,
      courseId
    };
  }
  static async uploadCourse(filePath, filename, lessonId = null) {
    try {
      const {
        jobId,
        courseId
      } = await this.submitCourseUpload(filePath, filename, lessonId);
      return await this.waitForImportJob(jobId, courseId, filename);
    } catch (err) {
      console.error('[UPLOAD ERROR]', err.message, err.response?.data);
      throw err;
    }
  }
  static async waitForImportJob(jobId, courseId, filename, maxAttempts = 180, intervalMs = 10000) {
    console.log(`[POLL] Job ${jobId} → Course ${courseId} | ${maxAttempts} attempts (~30 min)`);
    const client = this.init();
    await new Promise(r => setTimeout(r, 15000)); // initial delay

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, intervalMs));
      try {
        const courseRes = await client.get(`/courses/${courseId}`);
        const course = courseRes.data;
        console.log(`[POLL ${attempt}] Course READY! Title: ${course.title}`);
        return {
          scormCloudId: course.id || courseId,
          title: course.title || filename.replace(/\.zip$/i, ''),
          scormVersion: course.version || '2004 4th Edition'
        };
      } catch (err) {
        if (err.response?.status === 404) {
          console.log(`[POLL ${attempt}] Course not ready yet`);
          continue;
        }
        console.error(`[POLL ERROR ${attempt}]`, err.message, err.response?.data);
        throw err;
      }
    }
    throw new Error(`Timeout after ${maxAttempts} attempts. Check dashboard for course ${courseId}`);
  }
  static async createLaunchLink(courseId, learnerId, learnerName) {
    const client = this.init();
    const registrationId = `reg-${(0, _uuid.v4)().replace(/-/g, '')}`;
    console.log(`[LAUNCH] Generated registrationId: ${registrationId}`);
    const nameParts = (learnerName || 'Learner User').split(' ');
    const firstName = nameParts[0] || 'Learner';
    const lastName = nameParts.slice(1).join(' ') || 'User';
    const payload = {
      registrationId,
      courseId,
      learner: {
        id: learnerId.toString(),
        firstName: firstName.substring(0, 100),
        lastName: lastName.substring(0, 100)
      }
    };
    try {
      await client.post('/registrations', payload);
    } catch (err) {
      throw this.formatAxiosError(err, 'SCORM registration create failed');
    }
    console.log('[LAUNCH] Registration created');

    // Confirm registration
    await new Promise(r => setTimeout(r, 2000));
    try {
      await client.get(`/registrations/${registrationId}`);
    } catch (err) {
      throw this.formatAxiosError(err, 'SCORM registration confirm failed');
    }
    console.log('[LAUNCH] Registration confirmed');

    // Launch with Vault (per-launch – this is what support recommends right now)
    const launchPayload = {
      redirectOnExitUrl: "https://bicmas-trainee.vercel.app/scorm-exit.html",
      launchAuth: {
        type: "vault",
        options: {
          // Link is generated by backend server but opened in learner browser,
          // so binding to server IP invalidates the launch for end users.
          ipAddress: false,
          fingerprint: false,
          // SCORM Cloud requires 300-31540000 seconds
          expiry: 3600,
          slidingExpiry: 3600
        }
      }
    };
    let launchRes;
    try {
      launchRes = await client.post(`/registrations/${registrationId}/launchLink`, launchPayload);
    } catch (err) {
      throw this.formatAxiosError(err, 'SCORM launch link create failed');
    }
    const launchUrl = launchRes.data.launchLink;
    if (!launchUrl) throw new Error('No launchLink');
    console.log('[LAUNCH] Success:', launchUrl);
    return {
      launchUrl,
      registrationId
    };
  }
  static async getRegistrationProgress(registrationId) {
    const client = this.init();
    const res = await client.get(`/registrations/${registrationId}/progress`);
    return res.data;
  }
  static async testConnection() {
    const client = this.init();
    try {
      await client.get('/courses?limit=1');
      return true;
    } catch (err) {
      return false;
    }
  }
  static async getRegistrationScore(registrationId) {
    const client = this.init();
    try {
      const res = await client.get(`/registrations/${registrationId}`);
      const data = res.data;
      return {
        raw: data.score?.raw || null,
        // actual score (e.g. 85)
        scaled: data.score?.scaled || null,
        // 0–1 scale (e.g. 0.85)
        min: data.score?.min || null,
        max: data.score?.max || null,
        completion: data.completion || null,
        success: data.success || null,
        totalSecondsTracked: data.totalSecondsTracked || null
      };
    } catch (err) {
      console.error('[SCORE FETCH ERROR]', err.response?.data || err.message);
      throw new Error(`Failed to fetch score for registration ${registrationId}`);
    }
  }
}
exports.ScormCloudService = ScormCloudService;