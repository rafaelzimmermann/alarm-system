#!/bin/bash

# wget http://node-arm.herokuapp.com/node_latest_armhf.deb -O /tmp/node_latest_armhf.deb
# dpkg -i /tmp/node_latest_armhf.deb

cp alarm.service /etc/systemd/system/alarm.service
cp alarm-ssh.service /etc/systemd/system/alarm-ssh.service

# cp update-alarm-system.sh /usr/bin/update-alarm-system
# chmod u+x /usr/bin/update-alarm-system

line="*/10 * * * * /home/pi/workspace/alarm-system/provision/check-for-update.sh"
(crontab -u root -l; echo "$line" ) | crontab -u root -
