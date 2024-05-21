cat > /etc/yum.repos.d/gitlab-ce.repo <<EOF
[gitlab-ce]
name=gitlab-ce
baseurl=https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el7/
gpgcheck=0
enabled=1
EOF
yum clean all && yum makecache
mkdir -p /data/mirrors/gitlab/
yum install --downloadonly --downloaddir=/data/mirrors/gitlab/ gitlab-ce
tar -zcvf gitlab.tar.gz /data/mirrors/gitlab
