#!/bin/bash
rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
yum install -y https://www.elrepo.org/elrepo-release-7.el7.elrepo.noarch.rpm
yum --disablerepo='*' --enablerepo=elrepo-kernel --downloadonly --downloaddir=/data/mirrors/update/ install -y kernel-lt 
yum --disablerepo='*' --enablerepo=elrepo-kernel install kernel-lt -y
