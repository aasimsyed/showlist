// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add react-native-fs to the resolver
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-fs': path.resolve(__dirname, 'node_modules/react-native-fs'),
};

module.exports = config;
