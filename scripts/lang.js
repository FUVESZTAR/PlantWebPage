/**
 * Language management utilities.
 * Reads/writes the current language from localStorage and applies translations
 * to elements that have a data-i18n attribute.
 *
 * Usage:
 *   import { t, applyTranslations, setupLanguageButtons } from './lang.js';
 *
 *   // Get a translated string
 *   const label = t('home.label.plantName');
 *
 *   // Apply all data-i18n translations to the DOM
 *   applyTranslations();
 *
 *   // Wire up .lang-btn buttons and apply initial translations
 *   setupLanguageButtons();
 */

import { TRANSLATIONS } from './i18n.js';

const LANG_KEY = 'fuvesztar_lang';

/** Returns the currently active language code ('hu' or 'en'). Default: 'hu'. */
export function getCurrentLang() {
  return localStorage.getItem(LANG_KEY) || 'hu';
}

/** Persists the selected language and reloads the page to apply it. */
export function setCurrentLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  window.location.reload();
}

/**
 * Returns the translated string for the given key in the current language.
 * Falls back to the key itself if no translation is found.
 */
export function t(key) {
  const lang = getCurrentLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS['hu'];
  const value = dict[key];
  if (value !== undefined) return value;
  // Try the other language as fallback
  const fallback = TRANSLATIONS['en'] || {};
  return fallback[key] !== undefined ? fallback[key] : key;
}

/**
 * Applies translations to every element with a [data-i18n] attribute.
 * Also handles [data-i18n-placeholder] for input placeholders and
 * [data-i18n-aria] for aria-label attributes.
 */
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = t(key);
    if (typeof value === 'string') {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const value = t(key);
    if (typeof value === 'string') {
      el.placeholder = value;
    }
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    const value = t(key);
    if (typeof value === 'string') {
      el.setAttribute('aria-label', value);
    }
  });

  // Update the page <title> if a data-i18n-title attribute is present on <html>
  const htmlEl = document.documentElement;
  const titleKey = htmlEl.getAttribute('data-i18n-title');
  if (titleKey) {
    const value = t(titleKey);
    if (typeof value === 'string') document.title = value;
  }
}

/** Updates the visual active state of language buttons. */
function updateLanguageButtons() {
  const lang = getCurrentLang();
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

/**
 * Wires up .lang-btn buttons so clicking them stores the chosen language
 * and reloads the page to apply it. Also applies translations immediately.
 */
export function setupLanguageButtons() {
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang');
      if (lang && lang !== getCurrentLang()) {
        setCurrentLang(lang);
      }
    });
  });
  updateLanguageButtons();
  applyTranslations();
}
