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

## 3.外网准备

在所有步骤开始前，需要在外网下载好所有需要的软件包

层级如下

package

--nexus

----CentOS-7-x86_64-Everything-2009.iso

----docker.tar.gz

----gitlab.tar.gz

----UploadRpmPackage.sh

----UploadMavenPackage.sh

----npm-dependencies-tgz.rar

----UploadNpmPackage.sh

----startup.sh

----nginx-1.25.5.zip

--harbor

----harbor-offline-installer-v2.9.4.tgz

----harbor.yml

----harbor.tar.gz

----harbor.service

----uninstall.sh

--jenkins

----nodejs

--------node-v14.21.3-linux-x64.tar.xz





sh脚本 放仓库

CentOS镜像everything版 	http://mirror-hk.koddos.net/centos/

例如：http://mirror-hk.koddos.net/centos/7/isos/x86_64/CentOS-7-x86_64-Everything-2009.iso



nginx win https://nginx.org/en/download.html

例如：https://nginx.org/download/nginx-1.25.5.zip



harbor安装包 https://github.com/goharbor/harbor/releases

例如：https://github.com/goharbor/harbor/releases/download/v2.11.0-rc1/harbor-offline-installer-v2.11.0-rc1.tgz



node安装包 https://nodejs.org/en/download/prebuilt-binaries

例如：https://nodejs.org/dist/v14.21.3/node-v14.21.3-linux-x64.tar.xz



**下面需要再外网虚拟机上下载**

docker安装包 

```sh
./docker-rpm-download.sh
```

```sh
cat docker-rpm-download.sh
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
mkdir -p /data/mirrors/docker/
yum install --downloadonly --downloaddir=/data/mirrors/docker/ docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
tar -zcvf docker.tar.gz /data/mirrors/docker
```

`yumdownloader`

docker 安装

harbor安装（下载修改后的harbor.yml）

docker镜像

在docker-images.txt添加需要的docker镜像，名称和版本号可以在dockerhub获取，这里以  (kafka、nexus3、openjdk8 & 11, elasticsearch、centos、mongo & kibana、seata-server、rabbitmq、mysql、nacos-server、redis、nginx、hello-world、gitlab、jenkins、sonarsqube) 为例

```sh
cat docker-images.txt
zookeeper
kafka
nexus3
openjdk8 
openjdk11
elasticsearch
centos7
mongo
kibana
seata-server
rabbitmq
mysql
nacos-server
redis
nginx
hello-world
gitlab
jenkins
sonarsqube
```



登录harbor仓库 拉取镜像(镜像仓库以192.168.1.1:85为例)

```sh
docker login http://192.168.1.1:85
```

```sh
./pull-docker-images.sh  192.168.1.1:85
```

```sh
cat pull-docker-images.sh
imageFile="./docker-images.txt"
if[!-f"$imagesFile];then
    images=$(cat docker-images.txt)
    for i in ${images}
    do
      docker pull $i
      docker tag $i $1/$i
      docker push $1/$i
      docker rmi $1/$i
      docker rmi $i
    done
else 
  echo "docker-images.txt文件不存在"
fi

```



data_volume打包

```sh
tar -zcvf harbor.tar.gz /data/harbor
```



前端依赖包(脚手架)

本地前端vue新建工程(可以考虑vue2、vue3、和vite构建)执行npm i

```sh
npm i vue
npm i vue-cli
npm i @vue/cli
npm i webpack
npm i webpack-cli
npm i vite
npm i create-vue
```

打包npm-dependencies-tgz



gitlab安装包(可选)

gitlab-rpm-download.sh

```sh
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
```



jenkins安装包(推荐，docker测试比较慢，可能docker兼容性不好)

jenkins-rpm-download.sh

```sh
mkdir -p /data/mirrors/jenkins/
yum-config-manager --add-repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
yum install --downloadonly --downloaddir=/data/mirrors/jenkins/ jenkins
tar -zcvf jenkins.tar.gz /data/mirrors/jenkins
```

安装jenkins

下载插件

workingDiretory打包



k8s镜像



## 内外部署

### 仓库服务器

连接服务器(finalshell)

启动nginx win

更新内核

安装docker
安装harbor(报错需要修改data_volume下的权限所有者)

安装 jdk8 jdk11 

搭建nexus 上传rpm 
yum update -y

yum install vim lrzsz -y
安装 maven nodejs
搭建nexus上传maven npm 

### 项目服务器

搭建jenkins
测试自动化前段后端部署
搭建k8s集群
自动化部署
搭建rancher

(github
offline-auto-deploy， 内容，脚本本来)



## 安装

#### 1.docker 安装

```sh
./docker-install.sh
```

```sh
cat docker-install.sh
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

#### 2.harbor安装

```sh
tar -zxvf harbor-offline-installer-v2.3.3.tgz
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



卸载

```sh
./uninstall.sh
```

```sh
$ rm -rf `find / -name harbor`
# 将运行的容器全部停止
$ docker stop `docker ps - q`
# 将容器全部删除
$ docker rm `docker ps -qa`
# 将镜像全部删除
$ docker rmi `docker images -q`
```

自启动

```sh
cat /etc/systemd/system/harbor.service
[Unit]
Description=Harbor
After=docker.service systemd-networkd.service systemd-resolved.service
Requires=docker.service
Documentation=http://github.com/vmware/harbor
[Service]
Type=simple
Restart=on-failure
RestartSec=5
#需要注意harbor的安装位置
ExecStart=/usr/local/bin/docker-compose --file /data/server/harbor/docker-compose.yml up
ExecStop=/usr/local/bin/docker-compose --file /data/server/harbor/docker-compose.yml down
[Install]
WantedBy=multi-user.target

# 重启
systemctl daemon-reload
systemctl enable harbor.service
systemctl restart harbor
```



### 前端依赖包(脚手架)原始依赖包下载

1. 本地前端工程已执行npm install且已生成package-lock.json
2. 依赖下载脚本。下述的NodeJS脚本可以根据前端源码工程下的package-lock.json文件中的每个依赖信息的resolved字段下载该依赖对应的原始tgz压缩包，只有tgz格式的原始依赖包才能被Nexus作为npm依赖管理。将该脚本保存到一个名为downloadNpmPackage.js的文件中：

downloadNpmPackage.js

```js
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')
const request = require('request')
// 指定根据package-lock.json中记录的信息下载依赖
const packageLock = require('./package-lock.json')
// 指定将依赖下载到当前目录下的npm-dependencies-tgz目录
const downUrl = './npm-dependencies-tgz'
 
if (!fs.existsSync(downUrl)) {
  fs.mkdirSync(downUrl)
}
 
// 收集依赖的下载路径
const tgz = []
// 当前下载索引
let currentDownIndex = 0
// 下载失败时，重试次数
const retryTimes = 3
// 当前重试计数
let currentTryTime = 0
 
// 重试次数内仍旧下载失败的链接
const downloadFailTgz = []
 
for (const pkg in packageLock.packages) {
  if (!packageLock.packages[pkg].resolved) continue
  const tgzUrl = packageLock.packages[pkg].resolved.split('?')[0]
  tgz.push(tgzUrl)
}
// 下载依赖
function doDownload (url) {
  const outUrl = url.split('/').pop()
  let outUrl2 = [outUrl]
  if (outUrl.indexOf('?') !== -1) {
    outUrl2 = outUrl.split('?')
  }
  const outputDir = path.join(downUrl, outUrl2[0])
  let receivedBytes = 0
  let totalBytes = 0
  const req = request({
    method: 'GET',
    uri: url,
    timeout: 60000
  })
  req.on('response', function (data) {
    totalBytes = parseInt(data.headers['content-length'])
  })
  req.on('data', function (chunk) {
    receivedBytes += chunk.length
    showProgress(receivedBytes, totalBytes, outUrl2[0])
    // 当前文件下载完成
    if (receivedBytes >= totalBytes) {
      currentDownIndex++
      currentTryTime = 0
      if (currentDownIndex < tgz.length) {
        doDownload(tgz[currentDownIndex])
      } else {
        if (downloadFailTgz.length === 0) {
          console.log('【完成】所有依赖均下载成功！')
        } else {
          console.warn('【完成】初步处理完成，但部分依赖多次重试后仍旧下载失败，请手动下载：', downloadFailTgz)
        }
      }
    }
  })
  req.on('error', e => {
    console.log(`第${currentDownIndex + 1}/${tgz.length}个依赖${outUrl2[0]}下载失败：`, JSON.stringify(e))
    if (currentTryTime < retryTimes) {
      currentTryTime++
      console.log(`【第${currentTryTime}次】尝试重新下载第${currentDownIndex + 1}/${tgz.length}个依赖${outUrl2[0]}`)
      doDownload(tgz[currentDownIndex])
    } else {
      // 存入下载失败数组中
      downloadFailTgz.push(tgz[currentDownIndex])
      currentDownIndex++
      currentTryTime = 0
      if (currentDownIndex < tgz.length) {
        doDownload(tgz[currentDownIndex])
      }
    }
  })
  req.pipe(fs.createWriteStream(outputDir))
}
 
// 依赖下载进度显示
function showProgress (received, total, filePath) {
  const percentage = ((received * 100) / total).toFixed(2)
  process.stdout.write(`${filePath} 下载进度：${percentage}% (${received}/${total} 字节)\r`)
  if (received === total) {
    console.log(`\n第${currentDownIndex + 1}/${tgz.length}个依赖${filePath} 下载完成！`)
  }
}
 
// 串行下载
doDownload(tgz[currentDownIndex])
```

将npm-dependencies-tgz文件夹打包成rar压缩包



#### 下载原始依赖

将NodeJs脚本downloadNpmPackage.js置于前端工程目录下且与package-lock.json文件同级：

```sh
node downloadNpmPackage.js
```



UploadnpmPackage.sh

```sh
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
find . -type f -name '*.tgz'  | sed "s|^\./||" | xargs -I '{}' \
curl -u "$USERNAME:$PASSWORD" -X 'POST' -v \
  ${REPO_URL} \
  -H 'accept: application/json' \
  -H 'Content-Type: multipart/form-data' \
  -F 'npm.asset=@{};type=application/x-compressed' ;
```

1.解压npm-dependencies-tgz.tar压缩包，得到npm-dependencies-tgz目录，将UploadnpmPackage.sh剪切到npm-dependencies-tgz目录下与所有tgz依赖包同级

2.若是linux操作系统，则需要使用如下命令将脚本中的换行符进行转换：

3.在npm-dependencies-tgz目录下使用如下命令运行脚本UploadnpmPackage.sh将依赖包上传到nexus上，注意红字部分根据Nexus的实际情况填写（建议使用Nexus的admin用户）：

```sh
./UploadnpmPackage.sh -u admin -p 123456 -r http://192.168.1.1:85/repoistory/npm/v1/components?repository=npm-local
```



### Maven上传

```sh
cat mavenimport.sh
#!/bin/bash
# copy and run this script to the root of the repository directory containing files
# this script attempts to exclude uploading itself explicitly so the script name is important
# Get command line params
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
find . -type f -not -path './mavenimport\.sh*' -not -path '*/\.*' -not -path '*/\^archetype\-catalog\.xml*' -not -path '*/\^maven\-metadata\-local*\.xml' -not -path '*/\^maven\-metadata\-deployment*\.xml' | sed "s|^\./||" | xargs -I '{}' curl -u "$USERNAME:$PASSWORD" -X PUT -v -T {} ${REPO_URL}{} ;
 
 
```

### 

```sh
cat mavenStartUp.sh
./mavenimport.sh -u admin -p 123456 -r http://192.168.1.1:85/repository/maven/
```



### 安装jenkins

前提安装好jdk11

```sh
yum install -y jenkins
vi /etc/init.d/jenkins # 修改端口
systemctl start jenkins 

```



### 安装nuexs3

















参考

https://blog.csdn.net/qq_46162321/article/details/115006096

https://blog.csdn.net/qq_42428264/article/details/120641414

https://blog.csdn.net/xlt_jbwkj/article/details/133024694

https://blog.csdn.net/yuyangchenhao/article/details/117573732

https://blog.csdn.net/xlt_jbwkj/article/details/133024694

https://blog.csdn.net/lanwilliam/article/details/127430035