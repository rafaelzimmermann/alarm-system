var moment = require('moment');
var speedTest = require('speedtest-net');
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

const brazil_tz_diff = 3 * 60 * 60 * 1000;

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
    var diff = executAt.diff(new moment()) + brazil_tz_diff;

    if (diff <= 0) {
      reject("Data invalida");
      return;
    }

    var timeout = setTimeout(() => {
      rtm.sendMessage("Executando commando agendado: " + command, alarmStatusChannel);
      executeCommand(command, alarmStatusChannel);
    }, diff);
    var item = {
      "command": command,
      "date": date,
      "timeout": timeout
    };
    scheduledCommands.push(item);
    setTimeout(function() {
      var index = scheduledCommands.indexOf(item);
      if (index >= 0) {
        scheduledCommands.splice(index, 1);
      }
    }, diff)
    resolve("Commando agendado");
  });
}

var listScheduledCommands = function() {
  return new Promise((resolve, reject) => {
    if (scheduledCommands.length == 0) {
      resolve("Nada agendado");
      return;
    }
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

var execSpeedTest = function() {
  return new Promise((resolve, reject) => {
    var test = speedTest({maxTime: 5000});

    test.on('data', data => {
      var msg = "Resultado do teste de velocidade:\n"
      Object.keys(data.speeds).forEach(key => {
        if (key === 'download' || key === 'upload') {
          msg += key + ": "+ (data.speeds[key] * 125).toFixed(2) + "KB/s\n";
        }
      })
      resolve(msg);
    });

    test.on('error', err => {
      reject(err);
    });
  });
}

var showHelp = function() {
  return new Promise((resolve, reject) => {
    var msg = "Comandos:";
    msg += "liga alarme\n"
    msg += "desliga alarme\n"
    msg += "liga luz\n"
    msg += "desliga luz\n"
    msg += "?\n"
    msg += "exit\n"
    msg += "liga porta X\n"
    msg += "desliga porta X\n"
    msg += "verifica 192.168.0.1 80\n"
    msg += "agenda YYYYMMDDThhmm COMANDO\n"
    msg += "agenda ls\n"
    msg += "agenda rm X\n"
    msg += "speedtest\n"
    msg += "help\n"
    resolve(msg);
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
  '^\\s*agenda\\s+rm\\s+(\\d+)\\s*': cancelScheduledCommand,
  '^\\s*speedtest\\s*': execSpeedTest,
  '^\\s*help\\s*': showHelp
};

var executeCommand = function(text, channel) {
  var command = text.toLowerCase();
  var commandFound = false;
  Object.keys(commands).forEach(key => {
    matches = command.match(RegExp(key, 'i'));
    if (matches !== null) {
      commandFound = true;
      matches.shift();
      commands[key].apply(null, matches)
        .then((msg) => {
          if (msg) {
            rtm.sendMessage(msg || "Commando executado com sucesso.", channel);
          }
        })
        .catch((err) => {
          rtm.sendMessage(err || "Erro ao processar comando.", channel);
        });
    }
  });
  if (!commandFound) {
    rtm.sendMessage("Commando desconhecido:" + command, channel);
  }
};

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  if (message.type === 'message') {
    executeCommand(message.text, message.channel);
  }
});
