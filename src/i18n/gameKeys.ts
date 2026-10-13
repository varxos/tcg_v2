import type { Move } from '../game/creatures';
import { tk } from './index';

export const moveDescKey = (move: Move) => tk(move.id === 'struggle' ? 'move.struggle' : move.id.startsWith('sig-') ? `move.sig.${move.type}` : `move.${move.id}`);
