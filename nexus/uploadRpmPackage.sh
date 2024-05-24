#!/bin/bash
 
# 获取命令行参数
while getopts ":r:u:p:" opt; do
    case $opt in
        r) REPO_URL="$OPTARG"
        ;;
        u) USERNAME="$OPTARG"
        ;;
        p) PASSWORD="$OPTARG"
        ;;
    esac
done
 
# find 并批量上传
find . -type f -name '*.rpm'  | sed "s|^\./||" | xargs -I '{}' \
curl -u "$USERNAME:$PASSWORD" -X 'POST' -v \
  ${REPO_URL} \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'rpm.asset=@{}' \
  -F 'rpm.asset.firename={}' ;
