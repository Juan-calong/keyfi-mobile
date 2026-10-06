import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';

let consumers = 0;
let removeListeners: (() => void) | undefined;
export function bindQueryLifecycle() {
  consumers += 1;
  if (consumers === 1) {
    if (AppState.currentState != null) { focusManager.setFocused(AppState.currentState === 'active'); }
    const app = AppState.addEventListener('change', (status) => { focusManager.setFocused(status === 'active'); });
    const network = NetInfo.addEventListener((state) => {
      if (state.isConnected != null) { onlineManager.setOnline(state.isConnected && state.isInternetReachable !== false); }
    });
    removeListeners = () => { app.remove(); network(); };
  }
  let disposed = false;
  return () => {
    if (disposed) { return; }
    disposed = true;
    consumers -= 1;
    if (!consumers) { removeListeners?.(); removeListeners = undefined; }
  };
}
