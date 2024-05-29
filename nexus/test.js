process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const packageLock = require('./package-lock.json')

 

 
// 收集依赖的下载路径
const tgz = []

for (const pkg in packageLock.packages) {
  if (!packageLock.packages[pkg].resolved) continue
  const tgzUrl = packageLock.packages[pkg].resolved.split('?')[0]
  const directory = tgzUrl.split('/').slice(3,-2).join('/');
  tgz.push(directory)
}


let arrayColors = [];
for (const pkg in packageLock.packages) {
  if (!packageLock.packages[pkg].peerDependencies) continue
  const tgzUrl = packageLock.packages[pkg].peerDependencies

  for (let key in tgzUrl) {
    if(arrayColors.indexOf(key) === -1 && tgz.indexOf(key) === -1) {
      arrayColors.push(key);
    }
  }
  // tgz.push(tgzUrl)
}
// 下载依赖
console.log(arrayColors);

var fs = require('fs');

var file = fs.createWriteStream('array.txt');
file.on('error', function(err) { /* error handling */ });
arrayColors.forEach(function(v) { file.write(v + '\n'); });
file.end();
