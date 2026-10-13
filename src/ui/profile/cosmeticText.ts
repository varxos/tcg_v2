import { Cosmetic, ruleSubject } from '../../game/cosmetics';
import { Translator, tk } from '../../i18n';

export const cosmeticKindLabel = (t: Translator, cosmetic: Cosmetic) => t(tk(`cosmetic.${cosmetic.kind}`));

export const unlockText = (t: Translator, cosmetic: Cosmetic) => {
  const rule = cosmetic.rule;
  switch (rule.kind) {
    case 'default': return t('unlock.default');
    case 'event': return t('unlock.event');
    case 'constellation': return t('unlock.constellation', { name: ruleSubject(rule) });
    case 'allGolden': return t('unlock.allGolden');
    case 'warden': return t('unlock.warden', { name: ruleSubject(rule) });
    case 'wardenCount': return t('unlock.wardenCount', { count: rule.count });
    case 'chapter': return t('unlock.chapter', { number: rule.number });
    case 'starsLit': return rule.count === 1 ? t('unlock.starsLitOne') : t('unlock.starsLitMany', { count: rule.count });
    case 'stat': return t('unlock.wildWins', { target: rule.target });
    case 'discovered': return t('unlock.discovered', { count: rule.count });
    case 'void': return t('unlock.void');
    case 'voidStage': return t('unlock.voidStage');
    case 'demons': return t('unlock.demons', { count: rule.count });
  }
};
