var gpio = require("pi-gpio");

var alarmOn = false;
const CONTROL_PIN = 11;
const LIGHT_PIN = 12;
const SIREN_INPUT_PIN = 26;
const ALARM_ON_PIN = 24;
const PULSE_DURATION = 1000;
const LOW = 0;
const HIGH = 1;

gpio.open(CONTROL_PIN, "output");
gpio.open(LIGHT_PIN, "output");
gpio.open(SIREN_INPUT_PIN, "input");
gpio.open(ALARM_ON_PIN, "input");

var writePulse = function(pin, duration) {
  return new Promise((resolve, reject) => {
      gpio.write(pin, LOW, function() {
          setTimeout(function() {
            gpio.write(pin, HIGH);
            resolve();
          }, duration);
      });
  });
};

var turnOn = function() {
  return new Promise((resolve, reject) => {
    if (alarmOn) {
      reject('O alarme já está ligado!');
      return;
    }
    writePulse(CONTROL_PIN, PULSE_DURATION).then(() => {
      alarmOn = true;
      resolve('Alarme ligado');
    })
    .catch((err) => {
      reject('Error: ' + err);
    });
  });
};

var turnOff = function() {
  return new Promise((resolve, reject) => {
    if (!alarmOn) {
      reject('O alarme já está desligado!');
      return;
    }
    writePulse(CONTROL_PIN, PULSE_DURATION).then(() => {
      alarmOn = false;
      resolve('Alarme desligado');
    })
    .catch((err) => {
      reject('Error: ' + err);
    });
  });
};

var isOn = function() {
  return new Promise((resolve, reject) => {
    resolve(alarmOn ? 'Alarme ligado' : 'Alarme desligado');
  });
};

var onStateChange = function(pin) {
  return function(callback) {
    var status = 0;
    setInterval(function() {
      gpio.read(pin, function(err, value) {
        if (!err && status != value) {
          status = value;
          callback(status);
        }
      });
    }, 1000);
  }
};

var turnOnLight = function() {
  return new Promise((resolve, reject) => {
    gpio.write(LIGHT_PIN, HIGH, resolve);
  });
};

var turnOffLight = function() {
  return new Promise((resolve, reject) => {
    gpio.write(LIGHT_PIN, LOW, resolve);
  });
};

onStateChange(ALARM_ON_PIN)(function(val) {
  alarmOn = val == 1;
});

module.exports = {
  turnOn: turnOn,
  turnOff: turnOff,
  turnOnLight: turnOnLight,
  turnOffLight: turnOffLight,
  isOn: isOn,
  onSirenStateChange: onStateChange(SIREN_INPUT_PIN),
  onAlarmChange: onStateChange(ALARM_ON_PIN)
}
