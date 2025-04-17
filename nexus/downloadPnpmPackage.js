process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const fs = require('fs')
const path = require('path')
const request = require('request')
// 指定将依赖下载到当前目录下的npm-dependencies-tgz目录
const downUrl = './pnpm-dependencies-tgz'
 const { promisify } = require('util');
 const stream = require('stream');
 const pipeline = promisify(stream.pipeline);
 const yaml = require('js-yaml');
 
// 收集依赖的下载路径
const tgz = []
// 当前下载索引
let currentDownIndex = 0
// 下载失败时，重试次数
const retryTimes = 3
// 当前重试计数
let currentTryTime = 0

const lockContent = fs.readFileSync('pnpm-lock.yaml', 'utf8');
const lockData = yaml.load(lockContent);
const packages = lockData.packages || {};


function parsePnpmPackageKey(pkgKey) {
    // 统一路径分隔符并去除首尾斜杠
    const normalizedKey = pkgKey.replace(/\\/g, '/').replace(/^\/|\/$/g, '');
    
    const regex = /^(@[^/]+\/[^@]+|([^@/]+))@([^/]+)$/;
    const match = normalizedKey.match(regex);
  
    if (!match) {
      throw new Error(`Invalid package key format: ${pkgKey}`);
    }
  
    return {
      name: match[1].startsWith('@') ? match[1] : match[2],
      version: match[3]
    };
  }
 
// 重试次数内仍旧下载失败的链接
const downloadFailTgz = []
function mkdirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}
for (const [pkgKey, pkgInfo] of Object.entries(packages)) {
    if(pkgInfo.resolution.type == 'directory')continue

    const match = parsePnpmPackageKey(pkgKey) 
    const version = match.version;
    let name = match.name; 
    let tgzUrl;
    if (pkgInfo.resolution && pkgInfo.resolution.tarball) {
    // 优先使用显式的tarball地址
    tgzUrl = pkgInfo.resolution.tarball;
    } else {
    // 默认NPM Registry地址
    const scopedName = name.replace(/\//g, '%2f'); // 替换作用域包的斜杠
    const tgzName = `${name.split('/').pop()}-${version}.tgz`;
    tgzUrl = `https://registry.npmmirror.com/${scopedName}/-/${tgzName}`;
    }
    tgz.push(tgzUrl)
}

// 下载依赖
function doDownload (url) {

  const directory = url.split('/').slice(3,-2).join('/');
  const downPath = path.join(downUrl, directory)
  if (!fs.existsSync(downPath)) {
    mkdirsSync(downPath)
  }
  const outUrl = url.split('/').pop()
  let outUrl2 = [outUrl]
  if (outUrl.indexOf('?') !== -1) {
    outUrl2 = outUrl.split('?')
  }
  const outputDir = path.join(downPath, outUrl2[0])
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