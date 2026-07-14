/**
 * Detect if the app is running inside Electron.
 * Exported as a function to avoid Vite/Terser minification scope issues
 * that cause "isElectron is not defined" in production builds.
 */
export function isElectron() {
  return !!(typeof window !== 'undefined' && window.process && window.process.type)
    || /electron/i.test(navigator.userAgent)
}
