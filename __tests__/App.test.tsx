/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { useAuthStore } from '../src/stores/auth.store';
import { queryClient } from '../src/core/queries/queryClient';
import { LoginScreen } from '../src/screens/auth/LoginScreen';

// Use the library-provided animation double: Node cannot execute native JSI worklets.
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Supply only native bridges absent from Jest; app services and navigation stay real.
jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.NativeModules.RNCConfigModule = {
    getConfig: () => ({
      config: {
        API_BASE_URL: 'https://keyfi.test.invalid',
        API_DEBUG: 'false',
      },
    }),
  };
  rn.NativeModules.RNFBAppModule = {
    NATIVE_FIREBASE_APPS: [
      {
        appConfig: { name: '[DEFAULT]' },
        options: { appId: 'test', projectId: 'keyfi-test' },
      },
    ],
    FIREBASE_RAW_JSON: '{}',
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    eventsNotifyReady: jest.fn(),
    eventsAddListener: jest.fn(),
    eventsRemoveListener: jest.fn(),
  };
  rn.NativeModules.RNFBMessagingModule = {
    getInitialNotification: jest.fn().mockResolvedValue(null),
  };
  rn.NativeModules.RNKeychainManager = {
    getGenericPasswordForOptions: jest.fn().mockResolvedValue(false),
    getSupportedBiometryType: jest.fn().mockResolvedValue(null),
  };
  rn.NativeModules.NotifeeApiModule = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  };
  rn.NativeModules.RNGoogleSignin = {
    getConstants: () => ({
      BUTTON_SIZE_STANDARD: 0,
      BUTTON_SIZE_WIDE: 1,
      BUTTON_SIZE_ICON: 2,
      SIGN_IN_CANCELLED: 'cancelled',
      IN_PROGRESS: 'in_progress',
      PLAY_SERVICES_NOT_AVAILABLE: 'unavailable',
    }),
  };
  rn.NativeModules.RNCClipboard = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  rn.NativeModules.RNCWebViewModule = {};
  rn.NativeModules.RNGestureHandlerModule = require('react-native-gesture-handler/lib/commonjs/mocks/mocks');
  rn.NativeModules.RNCNetInfo = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getCurrentState: jest
      .fn()
      .mockResolvedValue({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
        details: {},
      }),
  };
  return rn;
});

test('hydrates an empty native session and renders the real login screen', async () => {
  let root!: ReturnType<typeof ReactTestRenderer.create>;
  try {
    await ReactTestRenderer.act(async () => {
      root = ReactTestRenderer.create(<App />);
    });
    // Simulate the native safe-area layout event; keep the actual provider and navigation.
    await ReactTestRenderer.act(async () => {
      root.root
        .findAll(node => typeof node.props.onInsetsChange === 'function')
        .forEach(node => {
          node.props.onInsetsChange({
            nativeEvent: {
              insets: { top: 0, bottom: 0, left: 0, right: 0 },
              frame: { x: 0, y: 0, width: 320, height: 640 },
            },
          });
        });
    });
    expect(useAuthStore.getState().hydrated).toBe(true);
    expect(useAuthStore.getState().token).toBeNull();
    expect(root.root.findAllByType(LoginScreen)).toHaveLength(1);
  } finally {
    if (root) {
      await ReactTestRenderer.act(async () => {
        root.unmount();
      });
    }
    queryClient.clear();
  }
});
