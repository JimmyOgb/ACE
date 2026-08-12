/** Deployment-safe switch for disabling automatic Studio traffic. */
export const STUDIO_SAFE_MODE = String(import.meta.env.VITE_STUDIO_SAFE_MODE ?? '').toLowerCase() === 'true'
