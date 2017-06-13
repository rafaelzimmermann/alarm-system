var gpio = require('rpi-gpio');

var alarmOn = false;
const CONTROL_PIN = 11;
const LIGHT_PIN = 12;
const SIREN_STATE_PIN = 26;
const ALARM_STATE_PIN = 24;
const PULSE_DURATION = 1000;
const LOW = false;
const HIGH = true;
const OTHER_PINS = [13, 15, 16, 18, 22, 7];
const RELE_POSITION = ['3', '4', '5', '6', '7', '8'];

var pinChangeHandlers = {};
pinChangeHandlers[ALARM_STATE_PIN]= [];
pinChangeHandlers[SIREN_STATE_PIN]= [];

gpio.setup(CONTROL_PIN, gpio.DIR_HIGH);
gpio.setup(LIGHT_PIN, gpio.DIR_HIGH);

gpio.on('change', function(pin, value) {
  console.log(pin);
  console.log(pinChangeHandlers[pin])  
  pinChangeHandlers.forEach((handler) => {
    handler(value);
  });
});

gpio.setup(SIREN_STATE_PIN, gpio.DIR_IN, gpio.EDGE_BOTH);
gpio.setup(ALARM_STATE_PIN, gpio.DIR_IN, gpio.EDGE_BOTH);

OTHER_PINS.forEach(function(pin) {
  gpio.setup(pin, gpio.DIR_HIGH);
});

var registerChangeHandler = function(pin, callback) {
  pinChangeHandlers[pin].push(callback);
};

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

var turnOnLight = function() {
  return new Promise((resolve, reject) => {
    gpio.write(LIGHT_PIN, LOW, resolve);
  });
};

var turnOffLight = function() {
  return new Promise((resolve, reject) => {
    gpio.write(LIGHT_PIN, HIGH, resolve);
  });
};

var turnOnPin = function(rele) {
  return new Promise((resolve, reject) => {
    if (RELE_POSITION.indexOf(rele) >= 0) {
      gpio.write(OTHER_PINS[RELE_POSITION.indexOf(rele)], LOW, resolve);
    }
  });
};

var turnOffPin = function(rele) {
  return new Promise((resolve, reject) => {
    if (RELE_POSITION.indexOf(rele) >= 0) {
      gpio.write(OTHER_PINS[RELE_POSITION.indexOf(rele)], HIGH, resolve);
    }
  });
};

registerChangeHandler(ALARM_STATE_PIN, function(val) {
  alarmOn = val;
});

module.exports = {
  turnOn: turnOn,
  turnOff: turnOff,
  turnOnLight: turnOnLight,
  turnOffLight: turnOffLight,
  turnOnPin: turnOnPin,
  turnOffPin: turnOffPin,
  isOn: isOn,
  onSirenStateChange: function(callback) { registerChangeHandler(SIREN_STATE_PIN, callback); },
  onAlarmChange: function(callback) { registerChangeHandler(ALARM_STATE_PIN, callback); }
}
