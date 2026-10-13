import { createContext, ReactNode, useContext, useMemo } from 'react';
import { de } from './de';
import { en, TranslationKey } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { Language } from './languages';
import { pt } from './pt';
import { ru } from './ru';
import { zh } from './zh';

export type { TranslationKey } from './en';
export type { Language } from './languages';
export { languages, detectLanguage } from './languages';
export type TParams = Record<string, string | number>;
export type Translator = (key: TranslationKey, params?: TParams) => string;

const dictionaries: Partial<Record<Language, Partial<Record<TranslationKey, string>>>> = { en, fr, es, pt, de, it, ru, ja, ko, zh };

export const makeTranslator = (language: Language): Translator => {
  const dictionary = dictionaries[language] ?? en;
  return (key, params) => {
    const template = dictionary[key] ?? en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (params[name] === undefined ? match : String(params[name])));
  };
};
// For keys built from game ids (quests, creatures, moves…).
export const tk = (key: string) => key as TranslationKey;
export const hasKey = (key: string) => key in en;

const I18nContext = createContext<{ language: Language; t: Translator }>({ language: 'en', t: makeTranslator('en') });

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo(() => ({ language, t: makeTranslator(language) }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);

type MessageRef = { side: 'player' | 'enemy'; name: string };
export type BattleMessage = { key: TranslationKey; params?: TParams; actor?: MessageRef; target?: MessageRef; stat?: string };

export const formatBattleMessage = (t: Translator, kind: 'wild' | 'warden', message: BattleMessage) => {
  const who = (ref: MessageRef, lower: boolean) => {
    if (ref.side === 'player') return ref.name;
    const key = kind === 'wild' ? (lower ? 'battle.actor.wildLower' : 'battle.actor.wild') : lower ? 'battle.actor.foeLower' : 'battle.actor.foe';
    return t(key, { name: ref.name });
  };
  const params: TParams = { ...(message.params ?? {}) };
  if (message.actor) { params.actor = who(message.actor, false); params.actorLower = who(message.actor, true); }
  if (message.target) { params.target = who(message.target, false); params.targetLower = who(message.target, true); }
  if (message.stat) params.stat = t(tk(`stat.${message.stat}`));
  return t(message.key, params);
};
