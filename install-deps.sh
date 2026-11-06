#!/bin/bash

# Script for installing Gambas Basic on distros that can use Ubuntu .deb packages, for example Linux Mint.
#
# Gambas Website: http://gambas.sourceforge.net
# Daily PPA: https://launchpad.net/~gambas-team/+archive/ubuntu/gambas-daily
# Not used here, Stable PPA: https://launchpad.net/~gambas-team/+archive/ubuntu/gambas3
# Gambas source code: https://gitlab.com/gambas/gambas
# Gambas bugtracker: https://gambaswiki.org/bugtracker

sudo add-apt-repository -y ppa:gambas-team/gambas-daily
sudo apt update
sudo apt -y install gambas3
