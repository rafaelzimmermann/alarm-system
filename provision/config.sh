#!/bin/bash

apt-get install -y upstart monit

cp alarm-upstart /etc/init/alarm.conf
cp alarm-monit
