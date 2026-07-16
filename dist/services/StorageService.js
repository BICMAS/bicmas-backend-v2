"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StorageService = void 0;
var _fs = _interopRequireDefault(require("fs"));
var _crypto = require("crypto");
var _clientS = require("@aws-sdk/client-s3");
var _s3RequestPresigner = require("@aws-sdk/s3-request-presigner");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const DEFAULT_PRESIGN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

let s3Client;
function getConfig() {
  const endpoint = process.env.AWS_ENDPOINT_URL || process.env.S3_ENDPOINT_URL || 'https://t3.storageapi.dev';
  const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'auto';
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET_NAME (or S3_BUCKET_NAME) is required for object storage');
  }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required for object storage');
  }
  return {
    endpoint,
    bucket,
    region
  };
}
function getClient() {
  if (!s3Client) {
    const {
      endpoint,
      region
    } = getConfig();
    s3Client = new _clientS.S3Client({
      region,
      endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
  return s3Client;
}
function sanitizeFilename(filename) {
  return String(filename || 'file').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}
class StorageService {
  static isConfigured() {
    const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;
    return !!(bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }
  static buildObjectKey(prefix, filename) {
    return `${prefix}/${Date.now()}-${(0, _crypto.randomUUID)()}-${sanitizeFilename(filename)}`;
  }
  static async uploadBuffer(key, buffer, contentType) {
    const {
      bucket
    } = getConfig();
    const client = getClient();
    await client.send(new _clientS.PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));
    return {
      key
    };
  }
  static async uploadFile(key, filePath, contentType) {
    const buffer = _fs.default.readFileSync(filePath);
    return StorageService.uploadBuffer(key, buffer, contentType);
  }
  static async getObjectBuffer(storedValue) {
    if (!storedValue) {
      throw new Error('Storage key or URL required');
    }
    if (storedValue.startsWith('http://') || storedValue.startsWith('https://')) {
      const response = await fetch(storedValue);
      if (!response.ok) {
        throw new Error('Failed to fetch stored file');
      }
      return Buffer.from(await response.arrayBuffer());
    }
    const {
      bucket
    } = getConfig();
    const client = getClient();
    const response = await client.send(new _clientS.GetObjectCommand({
      Bucket: bucket,
      Key: storedValue
    }));
    return Buffer.from(await response.Body.transformToByteArray());
  }
  static async getPresignedUrl(storedValue, expiresInSeconds = DEFAULT_PRESIGN_TTL_SECONDS) {
    if (!storedValue) return null;
    if (storedValue.startsWith('http://') || storedValue.startsWith('https://')) {
      return storedValue;
    }
    const {
      bucket
    } = getConfig();
    const client = getClient();
    const command = new _clientS.GetObjectCommand({
      Bucket: bucket,
      Key: storedValue
    });
    return (0, _s3RequestPresigner.getSignedUrl)(client, command, {
      expiresIn: expiresInSeconds
    });
  }
  static async resolveStorageUrl(storedValue) {
    return StorageService.getPresignedUrl(storedValue);
  }
  static async resolveStorageUrls(records, fields) {
    if (!Array.isArray(records)) return records;
    return Promise.all(records.map(async record => {
      const resolved = {
        ...record
      };
      for (const field of fields) {
        if (resolved[field]) {
          resolved[field] = await StorageService.resolveStorageUrl(resolved[field]);
        }
      }
      return resolved;
    }));
  }
}
exports.StorageService = StorageService;