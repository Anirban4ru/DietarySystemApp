const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withDisableLint(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents += `
allprojects {
    tasks.configureEach { task ->
        if (task.name.toLowerCase().contains('lint')) {
            task.enabled = false
        }
    }
}
`;
    }
    return config;
  });
};
