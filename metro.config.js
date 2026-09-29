const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable bundling of ONNX model files as assets
config.resolver.assetExts.push('onnx', 'ort');

module.exports = config;
