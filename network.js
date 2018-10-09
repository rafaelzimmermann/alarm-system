const isPortReachable = require('is-port-reachable');

var checkPort = function(host, port) {
  return isPortReachable(port, {host: host});
};

module.exports = {
  checkPort: checkPort
};
