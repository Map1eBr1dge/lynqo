export type DesktopPlatform = "mac" | "windows" | "linux" | "web";

/**
 * Best-effort desktop platform detection for shell chrome decisions
 * (traffic lights vs custom caption buttons). Web builds always report
 * "web" and render no window controls at all.
 */
export function detectDesktopPlatform(): DesktopPlatform {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  if (/Windows NT/i.test(ua)) return "windows";
  if (/Linux|X11/i.test(ua) && !/Android/i.test(ua)) return "linux";
  return "web";
}

/** True when running inside the Tauri shell on a desktop platform. */
export function isDesktopShell(platform: DesktopPlatform): boolean {
  return platform !== "web" && "__TAURI_INTERNALS__" in window;
}
