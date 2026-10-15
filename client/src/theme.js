// index.html applies the saved theme before first paint with the same key and colours.
const STORAGE_KEY = 'trackfit-theme';
const BROWSER_CHROME_COLORS = { dark: '#0f172a', light: '#f1f5f9' };

export const getTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BROWSER_CHROME_COLORS[theme]);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  try {
    // A UI preference, so synchronous localStorage (persisted in the Capacitor WebView too) beats
    // the async storage service: it's readable before React renders.
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or storage disabled: the choice just lasts for this session.
  }
}
