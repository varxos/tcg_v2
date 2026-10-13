// Hand-painted illustrations. A creature listed here is drawn from its painting instead of
// being generated, so a card can be upgraded to bespoke art without touching anything else.
export const paintedArtwork: Record<string, number> = {
  'demon-vorhex': require('../../../assets/cards/full/demon-vorhex.png'),
  'demon-azkarel': require('../../../assets/cards/full/demon-azkarel.png'),
  'demon-nyxira': require('../../../assets/cards/full/demon-nyxira.png'),
};

export const hasPainting = (cardId: string) => paintedArtwork[cardId] !== undefined;
