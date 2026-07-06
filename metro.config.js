const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

//
config.resolver.assetExts.push('wasm');

// 2. Si tu avais ajouté 'wasm' dans sourceExts à l'étape précédente, ENLÈVE-LE.
// config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'wasm');

module.exports = config;