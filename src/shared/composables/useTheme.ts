import { ref } from 'vue';

const THEME_KEY = 'horde-theme';

function getInitialDark(): boolean {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const isDark = ref(getInitialDark());

function apply(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

apply(isDark.value);

export function useTheme() {
  function toggle() {
    isDark.value = !isDark.value;
    localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light');
    apply(isDark.value);
  }

  return { isDark, toggle };
}
