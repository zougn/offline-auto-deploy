要部署 `svnserve`，我们需要按照以下步骤进行操作。这些步骤基于我搜索到的资料，涵盖了从安装到配置和启动服务的全过程。

### 1. 安装 Subversion

首先，我们需要安装 Subversion 工具。在 Debian 系统上，可以使用以下命令安装：

```bash
sudo apt-get install subversion
```

在 CentOS 系统上，可以使用以下命令安装：

```bash
sudo yum install subversion
```

### 2. 创建 SVN 仓库

安装完成后，我们需要创建一个 SVN 仓库。假设我们要创建一个名为 `myrepo` 的仓库，可以使用以下命令：

```bash
sudo svnadmin create /home/svn/myrepo
```

### 3. 配置访问权限

进入仓库的配置目录，编辑 `svnserve.conf` 文件以设置访问权限：

```bash
cd /home/svn/myrepo/conf
sudo vi svnserve.conf
```

在 `svnserve.conf` 文件中，设置以下内容以禁止匿名访问并允许认证用户写入：

```ini
[general]
anon-access = none
auth-access = write
password-db = passwd
authz-db = authz
```

接下来，编辑 `passwd` 文件以添加用户和密码：

```bash
sudo vi passwd
```

在 `passwd` 文件中，添加用户和密码，例如：

```ini
[users]
username = password
username2 = password2
```

最后，编辑 `authz` 文件以设置用户权限：

```bash
sudo vi authz
```

在 `authz` 文件中，设置权限，例如：

```ini
[groups]
developers = username, username2

[/]
@developers = rw
* =
```

### 4. 启动 SVN 服务

启动 `svnserve` 服务，并指定仓库的根目录：

```bash
sudo svnserve -d -r /home/svn
```

### 5. 检查服务状态

使用以下命令检查 `svnserve` 服务是否正在运行：

```bash
ps -ef | grep svnserve
```

如果服务正在运行，应该会看到类似以下的输出：

```
root      1234     1  0 12:34 ?        00:00:00 svnserve -d -r /home/svn
```

### 6. 设置开机自启动

为了确保在系统重启后 `svnserve` 服务能够自动启动，可以将其添加为系统服务。以下是几种常见的方法：

#### 方法一：使用 init.d 脚本（适用于 Debian/Ubuntu）

创建一个 init.d 脚本：

```bash
sudo cp /etc/init.d/skeleton /etc/init.d/svnserve
sudo chmod 755 /etc/init.d/svnserve
sudo update-rc.d svnserve defaults
```

编辑脚本文件 `/etc/init.d/svnserve`，修改以下内容：

```bash
DESC="subversion server"
NAME=svnserve
DAEMON=/usr/bin/$NAME
DAEMON_ARGS="-d -r /home/svn"
```

启动服务并设置开机自启动：

```bash
sudo /etc/init.d/svnserve start
sudo update-rc.d svnserve enable
```

#### 方法二：使用 systemd 服务（适用于 CentOS/RHEL）

创建一个 systemd 服务文件 `/etc/systemd/system/svnserve.service`，内容如下：

```ini
[Unit]
Description=Subversion Server Daemon
After=network.target

[Service]
Type=forking
ExecStart=/usr/bin/svnserve -d -r /home/svn
ExecStop=/usr/bin/killall svnserve

[Install]
WantedBy=multi-user.target
```

启动服务并设置开机自启动：

```bash
sudo systemctl start svnserve
sudo systemctl enable svnserve
```

通过以上步骤，您可以成功部署 `svnserve` 服务，并确保其正常运行和开机自启动。




初始化导入代码(可选)

//将初始化代码上传到/root/repo, 然后执行：
```bash
svn import /root/repo /opt/svn/repo -m "Initial project"
```
本地检出
```bash
svn co svn://111.11.11.111:8001/repo
```

```bash
echo "Test content" > testfile.txt
svn add testfile.txt
svn commit -m "Initial commit"
```







