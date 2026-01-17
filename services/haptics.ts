
/**
 * Haptic Engine for PWA
 * Triggers physical vibration on Android devices
 */
export const haptics = {
  // Light tap for generic interactions
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  
  // Medium feedback for button clicks
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },
  
  // Strong feedback for success/task completion
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20]);
    }
  },
  
  // Double bump for errors
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  // Game specific feedback
  gameWin: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 30, 10, 30, 50]);
    }
  }
};
