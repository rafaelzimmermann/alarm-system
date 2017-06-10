const credentials = require('./credentials')

var RtmClient = require('@slack/client').RtmClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var bot_token = process.env.SLACK_BOT_TOKEN || credentials.clients.alarm;
var rtm = new RtmClient(bot_token, {
  logLevel: 'error',
  dataStore: new MemoryDataStore()
});

var alarmStatus = 'Alarm is off';
var alarmStatusChannel = credentials.channels.alarmStatus;
var gpio = require("pi-gpio");

rtm.start();

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
  var user = rtm.dataStore.getUserById(rtm.activeUserId);

  var team = rtm.dataStore.getTeamById(rtm.activeTeamId);

  console.log('Connected to ' + team.name + ' as ' + user.name);
  rtm.sendMessage('Hello! I just wake up.', alarmStatusChannel);
});

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (message.type === 'message') {
    rtm.sendMessage(alarmStatus, message.channel);

    if (message.text && message.text.toLowerCase() === 'liga') {
      gpio.open(11, "output", function(err) {		// Open pin 11 for output
          gpio.write(11, 0, function() {			// Set pin 11 high (1)
              setTimeout(function() { gpio.close(11); }, 1000);						// Close pin 16
          });
      });
    }
  }
});
