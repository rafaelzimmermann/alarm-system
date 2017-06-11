var RtmClient = require('@slack/client').RtmClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const credentials = require('./credentials');
var alarm = require('./alarm');

var bot_token = process.env.SLACK_BOT_TOKEN || credentials.clients.alarm;
var rtm = new RtmClient(bot_token, {
  logLevel: 'error',
  dataStore: new MemoryDataStore()
});

var alarmStatus = 'Alarm is off';
var alarmStatusChannel = credentials.channels.alarmStatus;

rtm.start();

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
  var user = rtm.dataStore.getUserById(rtm.activeUserId);

  var team = rtm.dataStore.getTeamById(rtm.activeTeamId);

  console.log('Connected to ' + team.name + ' as ' + user.name);
  rtm.sendMessage('Hello! I just wake up.', alarmStatusChannel);
});

const commands = {
  'liga': alarm.turnOn,
  'desliga': alarm.turnOff,
  '?': alarm.isOn
}

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (message.type === 'message') {
    if (commands.hasOwnProperty(message.text)) {
      commands[message.text]()
        .then((message) => {
          rtm.sendMessage(message, message.channel);
        })
        .catch((err) => {
          rtm.sendMessage(err, message.channel);
        });
    }
  }
});
