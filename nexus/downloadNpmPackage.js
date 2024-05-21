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