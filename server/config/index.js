// server/config/index.js
const dotenv = require('dotenv');

dotenv.config();

const parseList = (value, fallback = []) => {
  if (!value) return [...fallback];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const ensureLeadingSlash = (value) => {
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
};

const sanitizeOrigin = (value, fallback) => {
  const origin = (value || fallback || '').trim();
  if (!origin) {
    return fallback;
  }
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const env = process.env.NODE_ENV || 'development';
const port = Number.parseInt(process.env.PORT, 10) || 3001;
const host = process.env.HOST || '0.0.0.0';

const frontendUrl = sanitizeOrigin(
  process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN,
  'http://localhost:3000'
);
const backendUrl = sanitizeOrigin(process.env.BACKEND_URL, `http://localhost:${port}`);
const apiBasePath = ensureLeadingSlash(process.env.API_BASE_PATH || '/api');
const backendApiBaseUrl = `${backendUrl}${apiBasePath}`;

const allowedOrigins = parseList(process.env.ALLOWED_ORIGINS, [frontendUrl])
  .map((origin) => sanitizeOrigin(origin))
  .filter(Boolean);

if (!allowedOrigins.length) {
  allowedOrigins.push(frontendUrl);
}

if (!allowedOrigins.includes('http://localhost:3000')) {
  allowedOrigins.push('http://localhost:3000');
}

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

const config = {
  env,
  host,
  port,
  frontend: {
    url: frontendUrl,
  },
  backend: {
    url: backendUrl,
    apiBasePath,
    apiBaseUrl: backendApiBaseUrl,
  },
  cors: {
    allowedOrigins: uniqueAllowedOrigins,
  },
  database: {
    uri: process.env.MONGO_URI || '',
  },
  dify: {
    user: process.env.DIFY_USER || '',
    workflowUrl: process.env.DIFY_WORKFLOW_URL || '',
    chatflowUrl: process.env.DIFY_CHATFLOW_URL || '',
    keys: {
      profileSummary: process.env.PROFILE_SUMMARY_KEY || '',
      profileStrengths: process.env.PROFILE_STRENGTHS_KEY || '',
      profileImprovements: process.env.PROFILE_IMPROVEMENTS_KEY || '',
      collegeList: process.env.COLLEGE_LIST_KEY || '',
      collegeWhy: process.env.COLLEGE_WHY_KEY || '',
      strategies: process.env.STRATEGIES_KEY || '',
      scheduleGeneration: process.env.SCHEDULE_GENERATION_KEY || '',
      essayBrainstorm: process.env.ESSAY_BRAINSTORM_KEY || '',
      activitiesImprover: process.env.ACTIVITIES_IMPROVER_KEY || '',
      counselor: process.env.COUNSELOR_KEY || '',
    },
  },
};

module.exports = Object.freeze(config);
