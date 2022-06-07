const commonConf = require('./karma.config.cjs');
module.exports = function (config) {
  commonConf(config);
  config.set({
    singleRun: true,
    webpack: {
      watch: false,
    },
  });
};
