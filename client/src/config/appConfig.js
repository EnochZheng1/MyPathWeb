// client/src/config/appConfig.js
const resolveDefaultFrontendUrl = () => {
    if (typeof window !== 'undefined' && window.location) {
        return window.location.origin;
    }
    return 'http://localhost:3000';
};

const normalizeBaseUrl = (value, fallback) => {
    const base = (value || fallback || '').trim();
    if (!base) {
        return fallback;
    }
    return base.endsWith('/') ? base.slice(0, -1) : base;
};

const normalizePath = (value, fallback) => {
    const path = (value || fallback || '').trim();
    if (!path) {
        return fallback;
    }
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const environment = process.env.REACT_APP_ENVIRONMENT || process.env.NODE_ENV || 'development';
const frontendUrl = process.env.REACT_APP_FRONTEND_URL || resolveDefaultFrontendUrl();

const fallbackBackendBase = 'http://localhost:3001';
const fallbackApiPath = '/api';
const rawBaseOverride = process.env.REACT_APP_API_BASE_URL;
const rawLegacyUrl = process.env.REACT_APP_API_URL;
const rawPathOverride = process.env.REACT_APP_API_PATH;

let backendBaseUrl = normalizeBaseUrl(rawBaseOverride, fallbackBackendBase);
let backendApiPath = normalizePath(rawPathOverride, fallbackApiPath);

if (!rawBaseOverride && rawLegacyUrl) {
    try {
        const legacyUrl = new URL(rawLegacyUrl);
        backendBaseUrl = normalizeBaseUrl(`${legacyUrl.protocol}//${legacyUrl.host}`, backendBaseUrl);
        if (!rawPathOverride && legacyUrl.pathname && legacyUrl.pathname !== '/') {
            backendApiPath = normalizePath(legacyUrl.pathname, backendApiPath);
        }
    } catch (error) {
        backendBaseUrl = normalizeBaseUrl(rawLegacyUrl, backendBaseUrl);
    }
}

const appConfig = {
    environment,
    frontend: {
        url: frontendUrl,
    },
};

appConfig.backend = {
    url: backendBaseUrl,
    apiPath: backendApiPath,
    apiBaseUrl: `${backendBaseUrl}${backendApiPath}`,
};

export default Object.freeze(appConfig);
