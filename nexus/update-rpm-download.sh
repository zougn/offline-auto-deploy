mkdir -p /data/mirrors/update/
yum update --downloadonly --downloaddir=/data/mirrors/update/
tar -zcvf update.tar.gz /data/mirrors/update
