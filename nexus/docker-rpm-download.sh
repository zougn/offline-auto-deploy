yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
mkdir -p /data/mirrors/docker/
yum install --downloadonly --downloaddir=/data/mirrors/docker/ docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
tar -zcvf docker.tar.gz /data/mirrors/docker
