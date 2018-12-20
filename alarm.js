var gpio = require('rpi-gpio');

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

var pinState = {};

gpio.setup(CONTROL_PIN, gpio.DIR_HIGH);
gpio.setup(LIGHT_PIN, gpio.DIR_HIGH);

var onChange = function(pin, value) {
  pinChangeHandlers[pin].forEach((handler) => {
    handler.apply(null, [value]);
  });
};

var readPinState = function(pin) {
  return new Promise((resolve, reject) => {
    gpio.read(SIREN_STATE_PIN, function(err, value) {
      if (err) {
        reject(err);
      } else {
        resolve(value);
      }
    });
  });
}

var checkStateChange = function(pin, pinPreviousState) {
  return new Promise((resolve, reject) => {
    readPinState(SIREN_STATE_PIN)
      .then(value => {
        var valueChanged = pinState.hasOwnProperty(SIREN_STATE_PIN) && pinState[SIREN_STATE_PIN] !== value;
        resolve(valueChanged);
      })
      .catch(reject);
  });
}

var logReadPinError = function(err) {
  console.log("Error trying to read pin", SIREN_STATE_PIN, err);
}

gpio.setup(SIREN_STATE_PIN, gpio.DIR_IN, function() {
  setInterval(function() {
    checkStateChange(SIREN_STATE_PIN)
      .then(changed => {
        if (changed) {
          setTimeout(function() {
            readPinState(SIREN_STATE_PIN)
              .then(value => {
                if (pinState.hasOwnProperty(SIREN_STATE_PIN) && pinState[SIREN_STATE_PIN] != value) {
                  onChange(SIREN_STATE_PIN, value);
                  pinState[SIREN_STATE_PIN] = value;
                }
              })
              .catch(logReadPinError);
          }, 5000);
        }
      })
      .catch(logReadPinError);

  }, 10000);
});

gpio.setup(ALARM_STATE_PIN, gpio.DIR_IN, function() {
  setInterval(function() {
    gpio.read(ALARM_STATE_PIN, function(err, value) {
      if (!err && pinState.hasOwnProperty(ALARM_STATE_PIN) && pinState[ALARM_STATE_PIN] != value) {
        onChange(ALARM_STATE_PIN, value);
      } else if (err) {
        console.log("Error trying to read pin", ALARM_STATE_PIN, err);
      }
      pinState[ALARM_STATE_PIN] = value;
    });
  }, 1000);
});



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
    if (pinState[ALARM_STATE_PIN]) {
      reject('O alarme já está ligado!');
      return;
    }
    writePulse(CONTROL_PIN, PULSE_DURATION).then(() => {
      resolve('Enviado sinal para ligar alarme');
    })
    .catch((err) => {
      reject('Error: ' + err);
    });
  });
};

var turnOff = function() {
  return new Promise((resolve, reject) => {
    if (!pinState[ALARM_STATE_PIN]) {
      reject('O alarme já está desligado!');
      return;
    }
    writePulse(CONTROL_PIN, PULSE_DURATION).then(() => {
      resolve('Enviado sinal para desligar alarme');
    })
    .catch((err) => {
      reject('Error: ' + err);
    });
  });
};

var isOn = function() {
  return new Promise((resolve, reject) => {
    var msg = '';
    msg += pinState[ALARM_STATE_PIN] ? 'Alarme ligado\n' : 'Alarme desligado\n';
    msg += pinState[SIREN_STATE_PIN] ? 'Alarme está tocando\n': 'Alarme não está tocando\n'
    RELE_POSITION.forEach(function(rele) {
      msg += pinState.hasOwnProperty(rele) && pinState[rele] ? 'Relê ' + rele + ' está ligado\n' : '';
    });
    resolve(msg);
  });
};

var turnOnLight = function() {
  return new Promise((resolve, reject) => {
    gpio.write(LIGHT_PIN, LOW, function() { resolve('Luz ligada'); });
  });
};

var turnOffLight = function() {
  return new Promise((resolve, reject) => {
    gpio.write(LIGHT_PIN, HIGH, function() { resolve('Luz desligada'); });
  });
};

var turnOnPin = function(rele) {
  return new Promise((resolve, reject) => {
    if (RELE_POSITION.indexOf(rele) >= 0) {
      gpio.write(OTHER_PINS[RELE_POSITION.indexOf(rele)], LOW, function() {
        pinState[rele] = true;
        resolve("A porta " + rele + " foi ativada");
      });
    }
  });
};

var turnOffPin = function(rele) {
  return new Promise((resolve, reject) => {
    if (RELE_POSITION.indexOf(rele) >= 0) {
      gpio.write(OTHER_PINS[RELE_POSITION.indexOf(rele)], HIGH,  function() {
        pinState[rele] = false;
        resolve("A porta " + rele + " foi desativada");
      });
    }
  });
};

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
