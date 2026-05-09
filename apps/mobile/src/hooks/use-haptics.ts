import * as Haptics from 'expo-haptics'

export function useHaptics() {
  return {
    tapLight: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    tapMedium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    selection: () => Haptics.selectionAsync(),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  }
}
