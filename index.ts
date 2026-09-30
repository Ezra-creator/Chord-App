import { NativeModules } from 'react-native';

// Guard against onnxruntime-react-native crash in environments without compiled native C++ binary (Expo Go)
if (!NativeModules.Onnxruntime && typeof (globalThis as any).OrtApi === 'undefined') {
  (globalThis as any).OrtApi = null;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
