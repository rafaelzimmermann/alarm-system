#!/bin/bash

# wget http://node-arm.herokuapp.com/node_latest_armhf.deb -O /tmp/node_latest_armhf.deb
# dpkg -i /tmp/node_latest_armhf.deb

# cp alarm.service /etc/systemd/system/alarm.service
# cp alarm-ssh.service /etc/systemd/system/alarm-ssh.service

chmod u+x update-alarm-system.sh
cp update-alarm-system.sh /usr/bin
