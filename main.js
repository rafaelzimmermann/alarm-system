var RtmClient = require('@slack/client').RtmClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const credentials = require('./credentials');
var alarm = require('./alarm');
var started = false;

var bot_token = process.env.SLACK_BOT_TOKEN || credentials.clients.alarm;
var rtm = new RtmClient(bot_token, {
  logLevel: 'error',
  dataStore: new MemoryDataStore()
});

var alarmStatusChannel = credentials.channels.alarmStatus;

rtm.start();

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
  if (!started) {
    rtm.sendMessage('Olá! Estou de volta.', alarmStatusChannel);
    started = true;
  }
});

alarm.onSirenStateChange(function(isSirenOn) {
  if (isSirenOn) {
    rtm.sendMessage(':rotating_light: Alarme está tocando!', alarmStatusChannel);
  } else {
    rtm.sendMessage(':warning: Alarme não está mais tocando!', alarmStatusChannel);
  }
});

alarm.onAlarmChange(function(isAlarmOn) {
  if (isAlarmOn) {
    rtm.sendMessage('O Alarme foi ligado.', alarmStatusChannel);
  } else {
    rtm.sendMessage('O Alarme foi desligado.', alarmStatusChannel);
  }
});

const commands = {
  'liga alarme': alarm.turnOn,
  'desliga alarme': alarm.turnOff,
  'liga luz': alarm.turnOnLight,
  'desliga luz': alarm.turnOffLight,
  '?': alarm.isOn,
  'exit': process.exit,
  'help': function() {return new Promise(resolve, reject) => { reolve(Object.keys(commands).join('\n'))}},
  'reboot': function() { return new Promise((resolve, reject) => { exec('sudo shutdown -r now'); resolve('Reiniciando...')}},
  'halt': function() { return new Promise((resolve, reject) => { exec('sudo shutdown -r now'); resolve('Desligando...')}}
};

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (message.type === 'message') {
    var command = message.text.toLowerCase();
    if (commands.hasOwnProperty(command)) {
      commands[command]()
        .then((msg) => {
          if (msg) {
            rtm.sendMessage(msg, message.channel);
          }
        })
        .catch((err) => {
          rtm.sendMessage(err, message.channel);
        });
    } else if (command.startsWith('liga porta ')) {
      var rele = command.replace('liga porta ', '');
      alarm.turnOnPin(rele);
    } else if (command.startsWith('desliga porta ')) {
      var rele = command.replace('desliga porta ', '');
      alarm.turnOffPin(rele);
    }
  }
});
