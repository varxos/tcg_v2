import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState } from 'react-native';

export type SoundId =
  | 'tap' | 'back' | 'toggle' | 'tab' | 'reward' | 'purchase' | 'unlock' | 'error'
  | 'starCharge' | 'roulette' | 'revealCommon' | 'revealRare' | 'revealEpic' | 'revealLegendary' | 'revealGolden'
  | 'battleIntro' | 'wardenVs' | 'attackFlame' | 'attackNature' | 'attackTide' | 'attackCrystal' | 'attackLunar' | 'attackStellar' | 'attackNeutral'
  | 'hit' | 'hitSuper' | 'hitWeak' | 'crit' | 'miss' | 'faint' | 'heal' | 'statUp' | 'statDown' | 'status' | 'switchIn' | 'levelUp'
  | 'victory' | 'defeat' | 'run'
  | 'voidTap' | 'voidCollapse' | 'voidReveal' | 'demonEssence';
export type MusicId = 'hub' | 'battle';

const soundSources: Record<SoundId, number> = {
  tap: require('../../assets/sounds/ui_tap.wav'),
  back: require('../../assets/sounds/ui_back.wav'),
  toggle: require('../../assets/sounds/ui_toggle.wav'),
  tab: require('../../assets/sounds/tab_swipe.wav'),
  reward: require('../../assets/sounds/reward_celesti.wav'),
  purchase: require('../../assets/sounds/purchase.wav'),
  unlock: require('../../assets/sounds/cosmetic_unlock.wav'),
  error: require('../../assets/sounds/error.wav'),
  starCharge: require('../../assets/sounds/star_charge.wav'),
  roulette: require('../../assets/sounds/roulette_spin.wav'),
  revealCommon: require('../../assets/sounds/reveal_common.wav'),
  revealRare: require('../../assets/sounds/reveal_rare.wav'),
  revealEpic: require('../../assets/sounds/reveal_epic.wav'),
  revealLegendary: require('../../assets/sounds/reveal_legendary.wav'),
  revealGolden: require('../../assets/sounds/reveal_golden.wav'),
  battleIntro: require('../../assets/sounds/battle_intro.wav'),
  wardenVs: require('../../assets/sounds/warden_vs.wav'),
  attackFlame: require('../../assets/sounds/attack_flame.wav'),
  attackNature: require('../../assets/sounds/attack_nature.wav'),
  attackTide: require('../../assets/sounds/attack_tide.wav'),
  attackCrystal: require('../../assets/sounds/attack_crystal.wav'),
  attackLunar: require('../../assets/sounds/attack_lunar.wav'),
  attackStellar: require('../../assets/sounds/attack_stellar.wav'),
  attackNeutral: require('../../assets/sounds/attack_neutral.wav'),
  hit: require('../../assets/sounds/hit.wav'),
  hitSuper: require('../../assets/sounds/hit_super.wav'),
  hitWeak: require('../../assets/sounds/hit_weak.wav'),
  crit: require('../../assets/sounds/crit.wav'),
  miss: require('../../assets/sounds/miss.wav'),
  faint: require('../../assets/sounds/faint.wav'),
  heal: require('../../assets/sounds/heal.wav'),
  statUp: require('../../assets/sounds/stat_up.wav'),
  statDown: require('../../assets/sounds/stat_down.wav'),
  status: require('../../assets/sounds/status.wav'),
  switchIn: require('../../assets/sounds/switch_in.wav'),
  levelUp: require('../../assets/sounds/level_up.wav'),
  victory: require('../../assets/sounds/victory.wav'),
  defeat: require('../../assets/sounds/defeat.wav'),
  run: require('../../assets/sounds/run.wav'),
  voidTap: require('../../assets/sounds/void_tap.wav'),
  voidCollapse: require('../../assets/sounds/void_collapse.wav'),
  voidReveal: require('../../assets/sounds/void_reveal.wav'),
  demonEssence: require('../../assets/sounds/demon_essence.wav'),
};
const musicSources: Record<MusicId, number> = {
  hub: require('../../assets/sounds/music_hub.wav'),
  battle: require('../../assets/sounds/music_battle.wav'),
};
// Mix levels so every effect sits at a consistent perceived loudness.
const soundGain: Partial<Record<SoundId, number>> = {
  tap: 0.45, back: 0.45, toggle: 0.5, tab: 0.4, error: 0.55, roulette: 0.75, purchase: 0.8,
  hit: 0.85, hitWeak: 0.7, miss: 0.6, status: 0.7, statUp: 0.65, statDown: 0.65, switchIn: 0.7, run: 0.7,
};
const polyphony: Partial<Record<SoundId, number>> = { tap: 3, hit: 2, hitSuper: 2, back: 2 };
const musicGain: Record<MusicId, number> = { hub: 0.7, battle: 0.8 };

const state = { sfx: true, sfxVolume: 0.8, music: true, musicVolume: 0.45, currentMusic: null as MusicId | null, active: true, modeSet: false };
const pools = new Map<SoundId, AudioPlayer[]>();
const musicPlayers: Partial<Record<MusicId, AudioPlayer>> = {};
const fades = new Map<AudioPlayer, ReturnType<typeof setInterval>>();
const clamp = (value: number) => Math.max(0, Math.min(1, value));

const ensureMode = () => {
  if (state.modeSet) return;
  state.modeSet = true;
  void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => undefined);
};

const playerFor = (id: SoundId) => {
  let pool = pools.get(id);
  if (!pool) { pool = []; pools.set(id, pool); }
  const idle = pool.find((player) => !player.playing);
  if (idle) return idle;
  if (pool.length < (polyphony[id] ?? 1)) {
    const player = createAudioPlayer(soundSources[id]);
    pool.push(player);
    return player;
  }
  return pool[0];
};

export const preloadSounds = (ids: SoundId[]) => {
  ids.forEach((id) => {
    try {
      if (!pools.get(id)?.length) playerFor(id);
    } catch {
      // Preloading is optional.
    }
  });
};

export const playSound = (id: SoundId, gain = 1) => {
  if (!state.sfx || state.sfxVolume <= 0) return;
  ensureMode();
  try {
    const player = playerFor(id);
    player.volume = clamp(state.sfxVolume * (soundGain[id] ?? 1) * gain);
    void player.seekTo(0).then(() => player.play()).catch(() => player.play());
  } catch {
    // Audio is best effort.
  }
};

export const stopSound = (id: SoundId) => {
  pools.get(id)?.forEach((player) => { try { player.pause(); } catch { /* ignore */ } });
};

const fadeTo = (player: AudioPlayer, target: number, duration: number, onDone?: () => void) => {
  const existing = fades.get(player);
  if (existing) clearInterval(existing);
  const start = player.volume;
  const steps = Math.max(1, Math.round(duration / 50));
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    try { player.volume = clamp(start + (target - start) * (step / steps)); } catch { /* ignore */ }
    if (step >= steps) {
      clearInterval(timer);
      fades.delete(player);
      onDone?.();
    }
  }, 50);
  fades.set(player, timer);
};

const applyMusic = () => {
  (Object.keys(musicSources) as MusicId[]).forEach((id) => {
    const wanted = state.active && state.music && state.musicVolume > 0 && state.currentMusic === id;
    let player = musicPlayers[id];
    if (!player && !wanted) return;
    try {
      if (!player) {
        ensureMode();
        player = createAudioPlayer(musicSources[id]);
        player.loop = true;
        player.volume = 0;
        musicPlayers[id] = player;
      }
      const target = clamp(state.musicVolume * musicGain[id]);
      if (wanted) {
        if (!player.playing) player.play();
        fadeTo(player, target, 900);
      } else if (player.playing) {
        const current = player;
        fadeTo(current, 0, 600, () => { try { current.pause(); } catch { /* ignore */ } });
      }
    } catch {
      // Music is best effort.
    }
  });
};

export const playMusic = (id: MusicId | null) => {
  if (state.currentMusic === id) return;
  state.currentMusic = id;
  applyMusic();
};

export const configureAudio = (settings: { sfx: boolean; sfxVolume: number; music: boolean; musicVolume: number }) => {
  state.sfx = settings.sfx;
  state.sfxVolume = settings.sfxVolume;
  state.music = settings.music;
  state.musicVolume = settings.musicVolume;
  applyMusic();
};

AppState.addEventListener('change', (status) => {
  state.active = status === 'active';
  applyMusic();
});

export const attackSound = (type: string): SoundId => {
  switch (type) {
    case 'Flame': return 'attackFlame';
    case 'Nature': return 'attackNature';
    case 'Tide': return 'attackTide';
    case 'Crystal': return 'attackCrystal';
    case 'Lunar': return 'attackLunar';
    case 'Stellar': return 'attackStellar';
    default: return 'attackNeutral';
  }
};
