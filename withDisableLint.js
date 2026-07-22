const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withDisableLint(config) {
  return withAppBuildGradle(config, config => {
    config.modResults.contents = config.modResults.contents + `

tasks.configureEach { task ->
    if (task.name.toLowerCase().contains("lint")) {
        task.enabled = false
    }
}
`;
    return config;
  });
};
