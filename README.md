# Offline Auto Deploy

## 概述

[toc]

## 解决问题

本项目记录内网java开发自动化部署的服务器配置步骤，主要缓解内网java开发和部署过程中遇到需要使用一些依赖、中间件、软件包，需要频繁地去外网下载导入的麻烦

## 步骤

外网准备

内网实现

​	仓库服务器搭建（内网docker仓库、开发依赖仓库yum源、maven、npm部署）

​	项目服务器搭建（gitlab、jenkins安装配置、k8s集群搭建、rancher搭建）

​	后端springboot自动化部署

​	前端vue自动化部署

​	k8s自动化部署

## 外网准备

在所有步骤开始前，需要在外网下载好所有需要的软件包

*前提：内网已有包含git在内的java前后端基础开发环境，如无请添加进下面的软件包*

层级如下

```
package
├── nexus    
├──────CentOS-7-x86_64-Everything-2009.iso  	 --	 centos-yum源
├──────update.tar.gz							 --  update-yum源
├──────extras.tar.gz							 --  extras-yum源
├──────npm-dependencies-tgz.rar					 --  npm包
├──────downloadNpmPackage.js 					 --  npm包下载脚本
├──────UploadNpmPackage.sh						 --  npm包上传脚本
├──────UploadRpmPackage.sh						 --  rpm包上传脚本
├──────UploadMavenPackage.sh					 --  maven包上传脚本
├──────startup.sh 								 --  上传脚本启动器
├──────nginx-1.25.5.zip							 --  nginx-win版
├──────node-v14.21.3-linux-x64.tar.xz			 --  node安装包
├──────harbor-offline-installer-v2.11.0-rc1.tgz  --	 harbor安装包
├── harbor        
├──────harbor.yml								 --  harbor配置文件
├──────docker-images.txt						 --  docker镜像信息
├──────pull-docker-images.sh					 --  docker镜像脚本
├──────harbor.tar.gz							 --  harbor数据卷
├──────harbor.service							 --  harbor启动项
├──────uninstall.sh								 --  harbor卸载脚本
├── jenkins        
├──────jenkins_home.tar.gz					 	--  jenkins数据卷
├── k8s      
```



CentOS镜像everything版 	http://mirror-hk.koddos.net/centos/

例如：http://mirror-hk.koddos.net/centos/7/isos/x86_64/CentOS-7-x86_64-Everything-2009.iso



nginx win https://nginx.org/en/download.html

例如：https://nginx.org/download/nginx-1.25.5.zip



harbor安装包 https://github.com/goharbor/harbor/releases

例如：https://github.com/goharbor/harbor/releases/download/v2.11.0-rc1/harbor-offline-installer-v2.11.0-rc1.tgz



node安装包 https://nodejs.org/en/download/prebuilt-binaries

例如：https://nodejs.org/dist/v14.21.3/node-v14.21.3-linux-x64.tar.xz



前端依赖包(脚手架)

本地前端vue工程(可以考虑vue2、vue3、和vite构建)执行

```sh
npm i vue vue-cli @vue/cli webpack webpack-cli vite create-vue
```

[下载原始依赖](#下载原始依赖) 



**下面需要再外网虚拟机上下载**

以下执行脚本前先要添加执行权限chmod + x

以下rpm包下载可替换为`yumdownloader`方式

```sh
mkdir -p /data/mirrors/update/
mkdir -p /data/mirrors/extras/
cd /data/mirrors/
```

下载一些必备软件

```sh
yum install -y --downloadonly --downloaddir=./update/ createrepo yum-utils vim lrzsz wget net-tools lsof tree bash-completion psmisc 
```

[安装一些必备软件](#安装一些必备软件) 

更新安装包

```sh
yum update --downloadonly --downloaddir=./update/
```

[yum更新](#yum更新) 

下载内核更新包并更新内核

```sh
rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
yum install -y https://www.elrepo.org/elrepo-release-7.el7.elrepo.noarch.rpm
yum --disablerepo='*' --enablerepo=elrepo-kernel --downloadonly --downloaddir=./update/ install -y kernel-lt 
yum --disablerepo='*' --enablerepo=elrepo-kernel install kernel-lt -y
```

[启用内核](#启用内核) 

docker安装包 

```sh
cd /data/mirrors/
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install --downloadonly --downloaddir=./extras/ docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

[docker 安装](#docker 安装) 

[harbor安装](#harbor安装) （下载修改后的harbor.yml）

docker镜像

在docker-images.txt添加需要的docker镜像，名称和版本号可以在dockerhub查找获取，这里以  (kafka、nexus3、openjdk8 & 11, elasticsearch、centos、mongo & kibana、seata-server、rabbitmq、mysql、nacos-server、redis、nginx、hello-world、gitlab、jenkins、sonarsqube) 为例

```sh
cat > /etc/docker/daemon.json <<EOF
{
	"insecure-registries": ["192.168.1.1:85"]
}
EOF
systemctl daemon-reload
systemctl restart docker
```



登录harbor仓库 拉取镜像(镜像仓库以192.168.1.1:85为例)

```sh
docker login http://192.168.1.1:85
./pull-docker-images.sh  192.168.1.1:85
# data_volume打包
tar -zcvf harbor.tar.gz /data/harbor
```



gitlab安装包(可选)

```sh
cat > /etc/yum.repos.d/gitlab-ce.repo <<EOF
[gitlab-ce]
name=gitlab-ce
baseurl=https://mirrors.tuna.tsinghua.edu.cn/gitlab-ce/yum/el7/
gpgcheck=0
enabled=1
EOF
yum clean all && yum makecache
yum install --downloadonly --downloaddir=./extras/ gitlab-ce
```



jenkins安装包(推荐，docker测试比较慢，可能docker兼容性不好)

```sh
yum-config-manager --add-repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
yum install --downloadonly --downloaddir=./extras/ jenkins
```

[安装jenkins](#安装jenkins) 

访问jenkins 输入默认登录密码 

安装推荐的插件

出现插件安装不上问题则替换为清华源

```sh
sed –ri 's#<url>https://updates.jenkins.io/update-center.json</url>#<url>http://mirrors.tuna.tsinghua.edu.cn/jenkins/updates/update-center.json</url>#' /var/jenkins_home/hudson.model.UpdateCenter.xml
```

如果存在依赖问题

在https://updates.jenkins.io/download/plugins/源中选择合适的hpi文件，手动添加

额外插件下载

Deploy to container（支持自动化将代码部署到tomcat容器）
Maven Integration（jenkins 利用maven编译，打包，所需插件）
Node.js（打包前端vue项目所需插件）
Gitlab（gitee插件-私有代码仓库）
Publish Over SSH（ssh传输到另一台服务器）



workingDiretory打包

```sh
tar -zcvf jenkins.tar.gz /data/jenkins
```



k8s安装包

```sh
cat > /etc/yum.repos.d/kubernetes.repo << EOF
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg 
https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF
yum install --downloadonly --downloaddir=./extras/ kubeadm kubectl kubelet -y
```

k8s镜像

```sh
kubeadm config print init-defaults > init-config.yaml
./pull-k8s-images.sh 192.168.1.1:85
```



下载kube-flannel.yml

```sh
wget -o https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
```



flannel镜像

```sh
./pull-flannel-images.sh
```



```sh
createrepo -pdo ./update/ ./update/
createrepo --update ./update/
createrepo -pdo ./extras/ ./extras/
createrepo --update ./extras/
tar -zcvf update.tar.gz ./update/
tar -zcvf extras.tar.gz ./extras/
```



## 内网部署

### 仓库服务器

连接服务器(xshell)

启动nginx win

```sh
nginx start
```

[yum更新](#yum更新) 

更新内核

```sh
yum install kernel-lt -y
```

[启用内核](#启用内核) 

安装docker
安装harbor(报错需要修改data_volume下的权限所有者)

[搭建nexus3](#搭建nexus3) 

[上传rpm](#上传原始依赖) 

 、[maven](#Maven上传) 、[ npm](#上传原始依赖)  

### 项目服务器

[yum更新](#yum更新) 

更新内核

```sh
yum install kernel-lt -y
```

禁用Swap分区

```sh
sed -i 's/.*swap.*/#&/' /etc/fstab
```

禁用SELinux

```sh
sed -i  '/^SELINUX=/ c  SELINUX=disabled' /etc/selinux/config
```

[启用内核](#启用内核) 

安装docker

搭建gitlab

安装 jdk8 jdk11 

```sh
yum install openjdk8 -y
```



安装 maven 

安装nodejs



搭建jenkins

将jenkins.tar.gz 解压至 /data/jenkins

[安装jenkins](#安装jenkins) 



测试自动化前段后端部署
搭建k8s集群 自动化部署

```sh
kubeadm config print init-defaults > init-config.yaml
vi init-config.yaml # 修改仓库
kubeadm config images pull --config=init-config.yaml
```



搭建rancher 自动化部署



## 安装

#### 安装一些必备软件

```sh
yum install -y  createrepo yum-utils vim lrzsz wget net-tools lsof tree bash-completion psmisc 
```



#### yum更新

```sh
yum update -y
```

#### 安装epel源

```sh
rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
yum install -y https://www.elrepo.org/elrepo-release-7.el7.elrepo.noarch.rpm
```



#### 搭建nexus3启用内核

```sh
grub2-set-default 0
# 重启
reboot
```



#### docker 安装

```sh
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl start docker
```

#### harbor安装

```sh
tar -zxvf harbor-offline-installer-v2.11.0-rc1.tgz
cd harbor/
cp harbor.yml.tmpl harbor.yml
#编辑harbor的配置文件 
vim harbor.yml
```

修改以下内容然后保存退出

```sh
hostname: 192.168.31.169 #修改harbor的启动ip，这里需要依据系统ip设置
http:
  port: 85 #harbor的端口,有两个端口,http协议(80)和https协议(443)
  # https related config
#https: # https注释掉
  # https port for harbor, default is 443
 # port: 443
  # The path of cert and key files for nginx
  #certificate: /your/certificate/path
  #private_key: /your/private/key/path
harbor_admin_password: harbor12345   #修改harbor的admin用户的密码
data_volume: /data/harbor/data #修改harbor存储位置
```

```sh
./install.sh
```

自启动

```sh
mv harbor.service /etc/systemd/system/
systemctl enable harbor
systemctl restart harbor
```



卸载

```sh
./uninstall.sh
```

```sh
#!/bin/bash
# 将运行的容器全部停止
systemctl stop harbor
# 将容器全部删除
docker rm `docker ps | grep goharbor | awk '{ print $1 }'`
# 将镜像全部删除
docker rmi `docker images | grep goharbor | awk '{ print $3 }'`
# 将harbor文件全部删除
rm -rf `find / -name harbor`
```







#### 安装nuexs3

```sh
docker pull sonatype/nexus3
mkdir -p /data/nexus/data
chmod 777 -R /data/nexus/data
docker run -d --name nexus3 -p 85:85 --restart always -v /data/nexus/data:/nexus-data sonatype/nexus3
firewall-cmd --zone=public --add-port=85/tcp --permanent && firewall-cmd --reload
cat /data/nexus/data/admin.password
```



#### npm下载上传

1. 本地前端工程已执行npm install且已生成package-lock.json
2. 依赖下载脚本。下述的NodeJS脚本可以根据前端源码工程下的package-lock.json文件中的每个依赖信息的resolved字段下载该依赖对应的原始tgz压缩包，只有tgz格式的原始依赖包才能被Nexus作为npm依赖管理。

##### 下载原始依赖

将NodeJs脚本downloadNpmPackage.js置于前端工程目录下且与package-lock.json文件同级：

```sh
node downloadNpmPackage.js
```

将npm-dependencies-tgz文件夹打包成rar压缩包

##### 上传原始依赖

1.解压npm-dependencies-tgz.tar压缩包，将UploadnpmPackage.sh剪切到npm-dependencies-tgz目录下与所有tgz依赖包同级

2.若是linux操作系统，则需要使用如下命令将脚本中的换行符进行转换：

3.在npm-dependencies-tgz目录下使用如下命令运行脚本UploadnpmPackage.sh将依赖包上传到nexus上（建议使用Nexus的admin用户）：

```sh
./uploadNpmPackage.sh -u admin -p 123456 -r http://192.168.1.1:85/service/rest/v1/components?repository=npm
```



#### Maven上传

```sh
./uploadMvnPackage.sh -u admin -p 123456 -r http://192.168.1.1:85/repository/maven/
```

#### rpm上传

```sh
./uploadRpmPackage.sh -u admin -p 123456 -r http://192.168.1.1:85/service/rest/v1/components?repository=rpm
```



#### 安装nodejs

解压nodejs

```sh
```





#### 安装jenkins

前提安装好jdk11

```sh
yum install -y jenkins
# 修改端口 以8091为例
vi /etc/init.d/jenkins 
#将JENKINS_USER="jenkins 改为 JENKINS_USER="root" 修改数据卷为/data/jenkins
vim /etc/sysconfig/jenkins
systemctl start jenkins 
firewall-cmd --zone=public --add-port=8091/tcp --permanent && firewall-cmd --reload  

# 查看默认登录密码
cat /var/lib/jenkins/secrets/initialAdminPassword
```





#### 安装k8s

```sh
yum install kubeadm kubectl kubelet -y
```

#### 搭建k8s集群

```sh

systemctl stop firewalld

cat > /etc/yum.repos.d/kubernetes.repo << EOF
[kubernetes]
name=Kubernetes
baseurl=https://mirrors.aliyun.com/kubernetes/yum/repos/kubernetes-el7-x86_64
enabled=1
gpgcheck=0
repo_gpgcheck=0
gpgkey=https://mirrors.aliyun.com/kubernetes/yum/doc/yum-key.gpg
https://mirrors.aliyun.com/kubernetes/yum/doc/rpm-package-key.gpg
EOF

yum install -y  kubelet kubeadm kubectl

systemctl enable kubelet
systemctl restart containerd

kubeadm config print init-defaults > init-config.yaml
kubeadm config images list --config init-config.yaml
imageRepository: registry.aliyuncs.com/google_containers
kubeadm config images pull --config=init-config.yaml

kubeadm init --apiserver-advertise-address=192.168.109.132 --apiserver-bind-port=6443 --pod-network-cidr=10.244.0.0/16  --service-cidr=10.96.0.0/12 --kubernetes-version=1.28.0 --image-repository registry.aliyuncs.com/google_containers

wget https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
kubectl apply -f kube-flannel.yml





journalctl -xefu kubelet
kubectl get ns
kubectl get node



cat <<EOF >> /root/.bashrc

export KUBECONFIG=/etc/kubernetes/admin.conf

EOF

source /root/.bashrc
```





卸载k8s

```sh
yum -y remove kubelet kubeadm kubectl
sudo kubeadm reset -f
sudo rm -rvf $HOME/.kube
sudo rm -rvf ~/.kube/
sudo rm -rvf /etc/kubernetes/
sudo rm -rvf /etc/systemd/system/kubelet.service.d
sudo rm -rvf /etc/systemd/system/kubelet.service
sudo rm -rvf /usr/bin/kube*
sudo rm -rvf /etc/cni
sudo rm -rvf /opt/cni
sudo rm -rvf /var/lib/etcd
sudo rm -rvf /var/etcd
```











参考

https://blog.csdn.net/qq_46162321/article/details/115006096

https://blog.csdn.net/qq_42428264/article/details/120641414

https://blog.csdn.net/xlt_jbwkj/article/details/133024694

https://blog.csdn.net/yuyangchenhao/article/details/117573732

https://blog.csdn.net/xlt_jbwkj/article/details/133024694

https://blog.csdn.net/lanwilliam/article/details/127430035