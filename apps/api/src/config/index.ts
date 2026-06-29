import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),

  db: {
    url: required('DATABASE_URL'),
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
  },

  s3: {
    endpoint: optional('S3_ENDPOINT', ''),
    accessKey: optional('S3_ACCESS_KEY', ''),
    secretKey: optional('S3_SECRET_KEY', ''),
    bucket: optional('S3_BUCKET', 'dito-assets'),
    region: optional('S3_REGION', 'us-east-1'),
  },

  ai: {
    openaiKey: optional('OPENAI_API_KEY', ''),
    ollamaUrl: optional('OLLAMA_BASE_URL', 'http://localhost:11434'),
  },

  qdrant: {
    url: optional('QDRANT_URL', 'http://localhost:6333'),
  },

  cors: {
    origin: optional('CORS_ORIGIN', 'http://localhost:4200'),
  },

  upload: {
    maxFileSize: parseInt(optional('MAX_FILE_SIZE', '104857600'), 10),
  },

  isDev(): boolean {
    return this.env === 'development';
  },
} as const;
