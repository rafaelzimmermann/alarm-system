var gpio = require("pi-gpio");

var alarmOn = false;
const CONTROL_PIN = 11;
const INPUT_PIN = 26;
const PULSE_DURATION = 1000;
const LOW = 0;
const HIGH = 1;

gpio.open(CONTROL_PIN, "output");
gpio.open(INPUT_PIN, "input");

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

var onStateChange = function(callback) {
  var status = 0;
  setInterval(() => {
    gpio.read(INPUT_PIN, function(err, value) {
      if (!err && status != value) {
        status = value;
        callback(status == 1 ? 'HIGH', 'LOW');
      }
    });
  }, 100);

}

module.exports = {
  turnOn: turnOn,
  turnOff: turnOff,
  isOn: isOn,
  onStateChange: onStateChange
}
