# Alarm System

Small raspberry pi project to control house alarm using slack bot.


## Configuration

You need to configure you credentials before using it.

### credential.js
```
module.exports = {
  'clients': {
    'alarm': 'Alarm Bot token here',
    'ssh': 'SSH Bot toker here'
  },
  'channels': {
    'alarmStatus': 'Channel id here'
  }
};
```
