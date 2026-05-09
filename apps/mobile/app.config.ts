import type { ConfigContext, ExpoConfig } from 'expo/config'

import { APP_VERSION } from './src/constants/app'

const projectId = process.env.EAS_PROJECT_ID

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TD POS',
  slug: 'tdpos',
  version: APP_VERSION,
  orientation: 'portrait',
  scheme: 'tdpos',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tomytatestudios.tdpos',
    infoPlist: {
      NSBluetoothAlwaysUsageDescription: 'TD POS uses Bluetooth to connect to receipt printers.',
      NSBluetoothPeripheralUsageDescription:
        'TD POS uses Bluetooth to connect to receipt printers.',
      NSCameraUsageDescription: 'TD POS uses the camera to scan product barcodes.',
      UIBackgroundModes: ['processing'],
      BGTaskSchedulerPermittedIdentifiers: ['com.expo.modules.backgroundtask.processing'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.tomytatestudios.tdpos',
    adaptiveIcon: {
      backgroundColor: '#0f766e',
    },
    permissions: [
      'BLUETOOTH',
      'BLUETOOTH_ADMIN',
      'BLUETOOTH_CONNECT',
      'BLUETOOTH_SCAN',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-background-task',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 35,
          targetSdkVersion: 35,
        },
        ios: {
          deploymentTarget: '16.0',
        },
      },
    ],
  ],
  extra: {
    appEnv: process.env.APP_ENV ?? 'development',
    eas: projectId ? { projectId } : undefined,
  },
})
