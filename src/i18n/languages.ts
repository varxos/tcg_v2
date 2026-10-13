export type Language = 'en' | 'fr' | 'es' | 'pt' | 'de' | 'it' | 'ru' | 'ja' | 'ko' | 'zh';

export const languages: { id: Language; native: string; flag: string }[] = [
  { id: 'en', native: 'English', flag: '🇬🇧' },
  { id: 'fr', native: 'Français', flag: '🇫🇷' },
  { id: 'es', native: 'Español', flag: '🇪🇸' },
  { id: 'pt', native: 'Português', flag: '🇧🇷' },
  { id: 'de', native: 'Deutsch', flag: '🇩🇪' },
  { id: 'it', native: 'Italiano', flag: '🇮🇹' },
  { id: 'ru', native: 'Русский', flag: '🇷🇺' },
  { id: 'ja', native: '日本語', flag: '🇯🇵' },
  { id: 'ko', native: '한국어', flag: '🇰🇷' },
  { id: 'zh', native: '简体中文', flag: '🇨🇳' },
];

export const detectLanguage = (): Language => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    const base = locale.split(/[-_]/)[0];
    return languages.some((language) => language.id === base) ? (base as Language) : 'en';
  } catch {
    return 'en';
  }
};
