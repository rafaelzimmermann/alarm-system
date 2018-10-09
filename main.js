var RtmClient = require('@slack/client').RtmClient;
var MemoryDataStore = require('@slack/client').MemoryDataStore;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const credentials = require('./credentials');
var alarm = require('./alarm');
var network = require('./network');
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

var checkPort = function(host, port) {
  return new Promise((resolve, reject) => {
    network.checkPort(host, port).then((isOpen) => {
      if (isOpen) {
        resolve("Porta está aberta");
      } else {
        resolve("Porta está fechada");
      }
    })
  });
}

var scheduledCommands = [];
var scheduleCommand = function(date, command) {
  return new Promise((resolve, reject) => {
    var executAt = moment(date, "YYYYMMDDThhmm");
    var diff = executAt.diff(new moment());
    var timeout = setTimeout(executeCommand, diff, command);
    scheduledCommands.push({
      "command": command,
      "date": date,
      "timeout": timeout
    });
    resolve("Commando agendado");
  });
}

var listScheduledCommands = function() {
  return new Promise((resolve, reject) => {
    var msg = "Commandos agendados:\n";
    var index = 0;
    scheduledCommands.forEach(item => {
      msg +=  index + ":" + item.date + ":" + item.command + "\n";
      index++;
    });
    resolve(msg);
  });
}

var cancelScheduledCommand = function(index) {
  return new Promise((resolve, reject) => {
    var item = scheduledCommands[parseInt(index)];
    clearTimeout(item.timeout);
    scheduledCommands.splice(index, 1);
    resolve("Agendamento cancelado")
  });
}

var shutdown = function() {
  rtm.sendMessage(":wave: Tchau!", alarmStatusChannel);
  process.exit();
}

const commands = {
  '^\\s*liga\\s+alarme\\s*': alarm.turnOn,
  '^\\s*desliga\\s+alarme\\s*': alarm.turnOff,
  '^\\s*liga\\s+luz\\s*': alarm.turnOnLight,
  '^\\s*desliga\\s+luz\\s*': alarm.turnOffLight,
  '^\\s*\\?\\s*': alarm.isOn,
  '^\\s*exit\\s*': shutdown,
  '^\\s*liga\\s+porta\\s+(\\d+)\\s*': alarm.turnOnPin,
  '^\\s*desliga\\s+porta\\s+(\\d+)\\s*': alarm.turnOffPin,
  '^\\s*verifica\\s+([^\\s]+)\\s+(\\d+)\\s*': checkPort,
  '^\\s*agenda\\s+(\\d\\d\\d\\d\\d\\d\\d\\dT\\d\\d\\d\\d)\\s+(.*)': scheduleCommand,
  '^\\s*agenda\\s+ls\\s*': listScheduledCommands,
  '^\\s*agenda\\s+rm\\s+(\\d+)\\s*': cancelScheduledCommand
};

var executeCommand = function(message) {
  var command = message.text.toLowerCase();
  var commandFound = false;
  Object.keys(commands).forEach(key => {
    matches = command.match(RegExp(key, 'i'));
    if (matches !== null) {
      commandFound = true;
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
  if (!commandFound) {
    rtm.sendMessage("Commando desconhecido:" + command, message.channel);
  }
};

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (message.type === 'message') {
    executeCommand(message);
  }
});
