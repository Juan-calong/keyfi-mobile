// Preserve the RN preset exceptions and transform only ESM packages loaded by App.
const transformedPackages = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  '@react-navigation',
  'airbridge-react-native-sdk',
  'react-native-config',
  '@react-native-firebase/messaging',
  '@react-native-firebase/app',
  'react-native-vector-icons',
  '@react-native-google-signin/google-signin',
  'react-native-qrcode-svg',
  'react-native-webview',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-gesture-handler',
  'react-native-linear-gradient',
  'react-native-drawer-layout',
].join('|');

module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [`node_modules/(?!(${transformedPackages})/)`],
};
