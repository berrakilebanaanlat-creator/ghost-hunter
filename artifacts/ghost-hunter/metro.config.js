const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Workspace kökündeki node_modules'u module resolution'a ekle
// ama watchFolders'a EKLEME — tüm workspace'i izlemek Metro'yu çökürtüyor
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Geçici ve sık değişen klasörleri izlemeden hariç tut
config.resolver.blockList = [
  // Firebase geçici klasörleri
  /node_modules\/\.pnpm\/@firebase\+[^/]+\/node_modules\/@firebase\/[^/]+_tmp_\d+\/.*/,
  // Replit .local klasörü (skills, temp files)
  /\/\.local\/.*/,
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
