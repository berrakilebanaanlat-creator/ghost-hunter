const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

module.exports = function withoutApsEnvironment(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const appName = config.modRequest.projectName ?? config.name;
      const entitlementsPath = path.join(
        projectRoot,
        "ios",
        appName,
        `${appName}.entitlements`
      );

      if (fs.existsSync(entitlementsPath)) {
        let content = fs.readFileSync(entitlementsPath, "utf8");
        content = content.replace(
          /\s*<key>aps-environment<\/key>\s*<string>[^<]*<\/string>/g,
          ""
        );
        fs.writeFileSync(entitlementsPath, content, "utf8");
      }

      return config;
    },
  ]);
};
