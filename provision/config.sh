#!/bin/bash

apt-get install -y upstart monit

cp alarm-upstart /etc/init/alarm.conf
cp alarm-monit /etc/monit/conf.d/alarm

cp ssh-upstart /etc/init/alarm-ssh.conf
cp ssh-monit /etc/monit/conf.d/alarm-ssh
