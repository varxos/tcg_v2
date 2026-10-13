export type ItemId = 'tonic' | 'elixir' | 'dew' | 'revive' | 'candy';
export type ItemDef = { id: ItemId; name: string; icon: string; color: string; copy: string; price: number; battle: boolean };
export type ItemReward = { itemId: ItemId; amount: number };
export type Bag = Record<ItemId, number>;

export const items: Record<ItemId, ItemDef> = {
  tonic: { id: 'tonic', name: 'Star Tonic', icon: '✚', color: '#8ED0A7', copy: 'Restores 30 HP to one creature.', price: 8, battle: true },
  elixir: { id: 'elixir', name: 'Nova Elixir', icon: '✙', color: '#73DDEC', copy: 'Restores 100 HP to one creature.', price: 20, battle: true },
  dew: { id: 'dew', name: 'Clarity Dew', icon: '❉', color: '#F39DC8', copy: 'Cures burn, poison, sleep, freeze and dazzle.', price: 6, battle: true },
  revive: { id: 'revive', name: 'Revive Shard', icon: '✧', color: '#FFE072', copy: 'Revives a fainted creature with half of its HP.', price: 28, battle: true },
  candy: { id: 'candy', name: 'Stardust Candy', icon: '✺', color: '#D79CF7', copy: 'Raises a creature by one level. Use it from the squad screen.', price: 60, battle: false },
};
export const itemOrder: ItemId[] = ['tonic', 'elixir', 'dew', 'revive', 'candy'];
export const itemHeal: Partial<Record<ItemId, number>> = { tonic: 30, elixir: 100 };
export const emptyBag = (): Bag => ({ tonic: 0, elixir: 0, dew: 0, revive: 0, candy: 0 });
export const starterBag = (): Bag => ({ tonic: 3, elixir: 0, dew: 1, revive: 0, candy: 0 });

export const canUseItem = (itemId: ItemId, creature: { hp: number; maxHp: number; status: string | null }) => {
  if (itemId === 'tonic' || itemId === 'elixir') return creature.hp > 0 && creature.hp < creature.maxHp;
  if (itemId === 'dew') return creature.hp > 0 && Boolean(creature.status);
  if (itemId === 'revive') return creature.hp <= 0;
  return false;
};

export const rewardLabel = (reward: ItemReward) => `${items[reward.itemId].icon} ${items[reward.itemId].name} ×${reward.amount}`;
