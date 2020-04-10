const credentials = require('./credentials')

var exec = require('child_process').exec;
var RtmClient = require('@slack/client').RtmClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var bot_token = process.env.SLACK_BOT_TOKEN || credentials.clients.ssh;
var currentDirectory = '/tmp';
var alarmStatusChannel = credentials.channels.alarmStatus;
var dns = require('dns');

var rtm = new RtmClient(bot_token, {
  logLevel: 'error',
  dataStore: new MemoryDataStore()
});

rtm.start();

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
  var user = rtm.dataStore.getUserById(rtm.activeUserId);
  var team = rtm.dataStore.getTeamById(rtm.activeTeamId);
  console.log('Connected to ' + team.name + ' as ' + user.name);
});

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (message.type === 'message' && message.user !== rtm.activeUserId) {
    exec(message.text, function(error, stdout, stderr) {
      if (stdout) {
        rtm.sendMessage(stdout, message.channel);
      }
      if (stderr) {
        rtm.sendMessage(stderr, message.channel);
      }
    });
  }
});

var isThereInternetConnection = function() {
  dns.resolve('www.google.com', function(err) {
    if (err) {
      exec('reboot', function(error, stdout, stderr) {
        console.log(error, stdout, stderr);
      });
    }
  });
};

TWO_HOURS = 2 * 60 * 60 * 1000;
setInterval(isThereInternetConnection, TWO_HOURS);
