const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withDisableLint(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents += `
android {
    lintOptions {
        checkReleaseBuilds false
        abortOnError false
    }
    lint {
        checkReleaseBuilds false
        abortOnError false
    }
}
`;
    }
    return config;
  });
};
