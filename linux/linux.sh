[Name]
sudo netstat -tulnp | grep svnserve
sudo ss -tulnp | grep svnserve
ps aux | grep svnserve
sudo lsof -i -nP | grep svnserve

[PID]


sudo apt-get install net-tools
sudo netstat -tulnp | grep [PID]
sudo ss -tulnp | grep [PID]
sudo lsof -i -nP | grep [PID]

