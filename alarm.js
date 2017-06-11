var gpio = require("pi-gpio");

var alarmOn = false;
const CONTROL_PIN = 11;
const PULSE_DURATION = 1000;

var writePulse = function(pin, duration) {
  return new Promise((resolve, reject) => {
    gpio.open(11, "output", function(err) {		// Open pin 11 for output
        if (err) {
          reject(err);
          return;
        }
        gpio.write(11, 0, function() {			// Set pin 11 high (1)
            setTimeout(function() {
              gpio.close(11);
              resolve();
            }, 1000);						// Close pin 16
        });
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
      reject(err);
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
      reject(err);
    });
  });
};

var isOn = function() {
  return new Promise((resolve, reject) => {
    resolve(alarmOn ? 'Alarme ligado' : 'Alarme desligado');
  });
}

module.exports = {
  turnOn: turnOn,
  turnOff: turnOff,
  isOn: isOn
}
