const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Workspace kökündeki node_modules'u Metro'ya tanıt
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Firebase geçici klasörlerini izlemeden hariç tut
// Bu klasörler build sırasında silinip ENOENT hatasına yol açıyor
config.resolver.blockList = [
  /node_modules\/.pnpm\/@firebase\+[^/]+\/node_modules\/@firebase\/[^/]+_tmp_\d+\/.*/,
];

module.exports = withNativeWind(config, {
  input: "./global.css",
  forceWriteFileSystem: true,
});
