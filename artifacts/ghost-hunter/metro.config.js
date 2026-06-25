const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const workspaceNodeModules = path.resolve(workspaceRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

// Workspace kökündeki node_modules'u yalnızca varsa ekle
// EAS build'de (monorepo dışında) bu yol mevcut değil, eklenmemeli
const nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];
if (fs.existsSync(workspaceNodeModules)) {
  nodeModulesPaths.push(workspaceNodeModules);
}
config.resolver.nodeModulesPaths = nodeModulesPaths;

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
