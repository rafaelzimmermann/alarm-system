#!/bin/sh

cd /home/pi/workspace/alarm-system

git fetch

UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")

if [ $LOCAL = $REMOTE ]; then
    echo "Up-to-date"
else
    git pull
    service alarm-ssh restart
    service alarm restart
fi
