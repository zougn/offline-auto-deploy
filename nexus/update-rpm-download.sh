#!/bin/bash
mkdir -p /data/mirrors/update/
cd /data/mirrors/
yum update --downloadonly --downloaddir=./update/
createrepo -pdo /data/mirrors/update/ /data/mirrors/update/
createrepo --update /data/mirrors/update/
tar -zcvf update.tar.gz ./update
