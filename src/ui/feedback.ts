import * as Haptics from 'expo-haptics';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'select' | 'success' | 'warning' | 'error';

let hapticsEnabled = true;
export const setHapticsEnabled = (enabled: boolean) => { hapticsEnabled = enabled; };

export const haptic = (kind: HapticKind) => {
  if (!hapticsEnabled) return;
  try {
    const promise = kind === 'select' ? Haptics.selectionAsync()
      : kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : kind === 'warning' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          : kind === 'error' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
            : Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    void promise.catch(() => undefined);
  } catch {
    // Haptics are optional.
  }
};
