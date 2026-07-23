/**
 * Runs synchronously in <head>, before paint, so the correct theme applies
 * immediately instead of flashing light-then-dark (or vice versa) once React
 * hydrates. Kept as a plain string (not a .tsx component) since it has to be
 * injected via dangerouslySetInnerHTML as an actual inline <script>.
 */
export const THEME_INIT_SCRIPT = `(function () {
  try {
    var theme = localStorage.getItem('theme') || 'auto';
    var isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();`;
