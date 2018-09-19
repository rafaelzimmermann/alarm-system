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
    rtm.sendMessage('@channel :rotating_light: Alarme está tocando!', alarmStatusChannel);
  } else {
    rtm.sendMessage('@channel :warning: Alarme não está mais tocando!', alarmStatusChannel);
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
  '\\s*liga\\s+alarme\\s*': alarm.turnOn,
  '\\s*desliga/s+alarme\\s*': alarm.turnOff,
  '\\s*liga\\s+luz\\s*': alarm.turnOnLight,
  '\\s*desliga\\s+luz\\s*': alarm.turnOffLight,
  '\\s*?\\s*': alarm.isOn,
  '\\s*exit\\s*': process.exit,
  '\\s*liga\\s+porta\\+(\\d+)\\s*': alarm.turnOnPin,
  '\\s*desliga\\s+porta\\+(\\d+)\\s*': alarm.turnOffPin
};

var executeCommand = function(command) {
  Object.keys(commands).forEach(key => {
    matches = command.match(RegExp(key, 'i'));
    if (matches !== null) {
      matches.shift();
      commands[key].apply(null, matches)
        .then((msg) => {
          if (msg) {
            rtm.sendMessage(msg || "Commando executado com sucesso.", message.channel);
          }
        })
        .catch((err) => {
          rtm.sendMessage(err || "Erro ao processar comando.", message.channel);
        });
    }
  });
};

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (message.type === 'message') {
    var command = message.text.toLowerCase();
    executeCommand(command);
  }
});
