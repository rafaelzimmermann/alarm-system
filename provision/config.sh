#!/bin/bash

wget http://node-arm.herokuapp.com/node_latest_armhf.deb -O /tmp/node_latest_armhf.deb
dpkg -i /tmp/node_latest_armhf.deb
