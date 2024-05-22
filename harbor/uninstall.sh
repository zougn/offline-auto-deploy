#!/bin/bash
# 将运行的容器全部停止
systemctl stop harbor
# 将容器全部删除
docker rm `docker ps | grep goharbor | awk '{ print $1 }'`
# 将镜像全部删除
docker rmi `docker images | grep goharbor | awk '{ print $3 }'`
# 将harbor文件全部删除
rm -rf `find / -name harbor`
