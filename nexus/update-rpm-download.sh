#!/bin/bash
mkdir -p /data/mirrors/update/
cd /data/mirrors/
yum update --downloadonly --downloaddir=./update/
tar -zcvf update.tar.gz ./update
