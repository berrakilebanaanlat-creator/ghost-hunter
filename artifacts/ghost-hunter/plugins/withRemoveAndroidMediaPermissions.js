const { withAndroidManifest } = require("expo/config-plugins");

const PERMISSIONS_TO_REMOVE = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_MEDIA_AUDIO",
  "android.permission.READ_MEDIA_VISUAL_USER_SELECTED",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.ACCESS_MEDIA_LOCATION",
];

module.exports = function withRemoveAndroidMediaPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    const filter = (key) => {
      if (Array.isArray(manifest[key])) {
        manifest[key] = manifest[key].filter(
          (perm) =>
            !PERMISSIONS_TO_REMOVE.includes(perm?.$?.["android:name"])
        );
      }
    };

    filter("uses-permission");
    filter("uses-permission-sdk-23");

    return cfg;
  });
};
