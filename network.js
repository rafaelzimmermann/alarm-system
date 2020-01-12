var os = require('os');

const isPortReachable = require('is-port-reachable');

var checkPort = function(host, port) {
  return isPortReachable(port, {host: host});
};

var describeNetworkInterfaces = function() {
  var result = {};
  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        return;
      }
      if (!result.hasOwnProperty(ifname)) {
        result[ifname] = [];
      }
      result[ifname].push(iface.address)
    });
  });
  return result
}

module.exports = {
  checkPort: checkPort,
  describeNetworkInterfaces: describeNetworkInterfaces
};
