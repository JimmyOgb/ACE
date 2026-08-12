/** Development switch for testing the UI without automatic Studio traffic. */
export const STUDIO_SAFE_MODE = import.meta.env.DEV
  && String(import.meta.env.VITE_STUDIO_SAFE_MODE ?? '').toLowerCase() === 'true'
