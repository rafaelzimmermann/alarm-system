var gpio = require('rpi-gpio');

const CONTROL_PIN = 11;
const LIGHT_PIN = 12;
const SIREN_STATE_PIN = 26;
const ALARM_STATE_PIN = 24;
const PULSE_DURATION = 1000;
const PIN_CHECK_INTERVAL = 5000;
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

var triggerChange = function(pin) {
  pinChangeHandlers[pin].forEach((handler) => {
    handler.apply(null, [pinState[pin]]);
  });
};

var readPinState = function(pin) {
  return new Promise((resolve, reject) => {
    gpio.read(pin, function(err, value) {
      if (err) {
        reject(err);
      } else {
        resolve(value);
      }
    });
  });
}

var logReadPinError = function(err, pin) {
  console.log("Error trying to read pin", pin, err);
}

var initializePinState = function(pin) {
  return new Promise((resolve, reject) => {
    readPinState(pin)
      .then(value => { pinState[pin] = value; resolve(value);})
      .catch(reject);
  });
}

var updatePinState = function(pin) {
  return new Promise((resolve, reject) => {
    readPinState(pin)
      .then(value => {
        var valueChanged = pinState[pin] !== value;
        if (valueChanged) {
          setTimeout(() => {
            readPinState(pin)
              .then(secondValue => {
                valueChanged = pinState[pin] !== secondValue;
                if (valueChanged) {
                  pinState[pin] = secondValue;
                }
                resolve(valueChanged);
              })
              .catch(logReadPinError);
          }, PIN_CHECK_INTERVAL / 2);
        } else {
          resolve(valueChanged);
        }
      })
      .catch(reject);
  });
}

gpio.setup(SIREN_STATE_PIN, gpio.DIR_IN, function() {
  initializePinState(SIREN_STATE_PIN).then(() => {
    setInterval(() => {
      updatePinState(SIREN_STATE_PIN)
        .then(changed => { if (changed) { triggerChange(SIREN_STATE_PIN); }})
        .catch((err) => { logReadPinError(err, SIREN_STATE_PIN)});
    }, PIN_CHECK_INTERVAL);
  });
});

gpio.setup(ALARM_STATE_PIN, gpio.DIR_IN, function() {
  initializePinState(ALARM_STATE_PIN).then(() => {
    setInterval(() => {
      updatePinState(ALARM_STATE_PIN)
        .then(changed => { if (changed) { triggerChange(ALARM_STATE_PIN); }})
        .catch((err) => { logReadPinError(err, ALARM_STATE_PIN)});
    }, PIN_CHECK_INTERVAL);
  });
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
