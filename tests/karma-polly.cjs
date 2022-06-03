const path = require('path');
const { Server } = require('@pollyjs/node-server');
function createFramework(config) {
  const server = new Server({
    quiet: false,
    recordingsDir: path.join(config.basePath, config.pollyConfig.recordings),
    port: config.pollyConfig.port,
    apiNamespace: '/polly',
  });
  server.listen().on('error', (err) => {
    console.log(err);
  });
}
createFramework.$inject = ['config'];
module.exports = {
  'framework:polly': ['factory', createFramework],
};
