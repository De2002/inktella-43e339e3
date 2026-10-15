export type ThemePref = "system" | "light" | "dark";
const KEY = "inktella:theme";

export function getThemePref(): ThemePref {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(KEY) as ThemePref) || "system";
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, pref);
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
