#!/bin/bash

cd /home/pi/workspace/alarm-system; git pull --dry-run | grep -q -v 'Already up-to-date.' && changed=1

if [ "$changed" -eq "1" ]; then
  cd /home/pi/workspace/alarm-system; git pull
  service alarm restart
fi
