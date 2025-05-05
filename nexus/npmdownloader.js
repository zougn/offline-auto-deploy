import fs from "fs";
import path from "path";
import semver from "semver";
import ssri from "ssri";
import axios from "axios";
import PQueue from "p-queue";
import mkdirp from "mkdirp";

// 配置参数
const CONFIG = {
  registry: "https://registry.npmmirror.com",
  concurrency: 6,
  retries: 3,
  timeout: 15000,
  cacheDir: path.join("./", "npm_cache"),
};


// 初始化环境
mkdirp.sync(CONFIG.cacheDir);

async function _retrievePackageVersion(name, version) {
  const allPackageVersionsDetails = await fetchPackageInfo(name);
  const maxSatisfyingVersion = _getMaxSatisfyingVersion(allPackageVersionsDetails,version);
  return allPackageVersionsDetails.versions[maxSatisfyingVersion];
}

function _getMaxSatisfyingVersion(allPackageVersionsDetails, version) {
  if (version === undefined || version === null) {
    return allPackageVersionsDetails["dist-tags"].latest;
  }
  const versions = Object.keys(allPackageVersionsDetails.versions);
  return semver.maxSatisfying(versions, version);
}

async function fetchPackageInfo(name) {
  const registryUrl = `${CONFIG.registry}/${name.replace("/", "%2F")}`;
  try {
    const response = await axios.get(registryUrl, { timeout: CONFIG.timeout });
    if (response.status != 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = response.data;
    return data; // 返回数据以便进一步处理
  } catch (error) {
    console.error("Error fetching package info:", error);
    throw error; // 重新抛出错误以便调用者处理
  }
}

/**
 * 递归收集所有依赖（新增 peerDependencies 处理）
 */
async function collectDependencies(packages) {
  const tarballs = new Map();
  const peerDependency = new Map();

  for (const [pkgname, pkg] of Object.entries(packages)) {
    let name = pkgname;
    if (name.startsWith("node_modules")) {
      name = name.substring(13);
    }
    if (pkg.resolved && pkg.integrity) {
      const key = `${name}@${pkg.version}`;
      const url = pkg.resolved
      const split = url.split("/");
      let filename = split[split.length - 1];
      filename = path.join(name, filename);
      if (!tarballs.has(key)) {
        tarballs.set(key, {
          name:key,
          url: url,
          integrity: pkg.integrity,
          filePath: path.join(
            CONFIG.cacheDir,
            filename
          ),
        });
      }
    } else {
      continue;
    }
    if (pkg.peerDependencies) {
      for (const [name, version] of Object.entries(pkg.peerDependencies)) {
        if (peerDependency.has(name)) {
          const versions = peerDependency.get(name);
          if (!versions.has(version)) {
            versions.add(version);
          }
        }
        const versions = new Set();
        versions.add(version);
        peerDependency.set(name, versions);
      }
    }
  }
  console.log(peerDependency);

  for (const [peerName, value] of peerDependency.entries()) {
    for (let version of value) {
      let packageJson = await _retrievePackageVersion(peerName, version);
      const key = `${packageJson.name}@${packageJson.version}`;
      const url = packageJson.dist.tarball
      const split = url.split("/");
      let filename = split[split.length - 1];
      filename = path.join(peerName, filename);
      if (!tarballs.has(key)) {
        tarballs.set(key, {
          name:key,
          url: url,
          integrity: packageJson.dist.integrity,
          filePath: path.join(
            CONFIG.cacheDir,
            filename
          ),
        });
      }
    }
  }

  return tarballs;
}

/**
 * 带进度显示的下载函数
 */
async function downloadWithRetry(task, retries = CONFIG.retries) {
  let currentUrl = task.url;

  try {
    // 检查缓存
    if (fs.existsSync(task.filePath)) {
      const fileData = await fs.promises.readFile(task.filePath);
      if (ssri.checkData(fileData, task.integrity)) {
        console.log(`Using cached: ${path.basename(task.filePath)}`.padEnd(50));
        return task.filePath;
      }
    }

    // 创建目录
    await mkdirp(path.dirname(task.filePath));

    // 初始化下载状态
    let downloadedBytes = 0;
    let totalBytes = 0;
    let redirectChain = [];

    const response = await axios({
      url: currentUrl,
      method: "GET",
      responseType: "stream",
      timeout: CONFIG.timeout,
      maxRedirects: CONFIG.maxRedirects,
      // 重定向处理器
      onRedirect: (response) => {
        redirectChain.push(response.headers.location);
        currentUrl = response.headers.location;
      },
    });

    // 获取最终响应信息
    totalBytes = parseInt(response.headers["content-length"], 10) || 0;
    const finalUrl = response.request.res.responseUrl || currentUrl;

    // 显示重定向信息
    if (redirectChain.length > 0) {
      console.log(`[${task.name}] Redirect path: ${redirectChain.join(" → ")}`);
    }

    // 创建写入流
    const writer = fs.createWriteStream(task.filePath);
    response.data.pipe(writer);

    // 进度更新处理器
    response.data.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      const progress =
        totalBytes > 0
          ? ((downloadedBytes / totalBytes) * 100).toFixed(1)
          : downloadedBytes;
      process.stdout.write(
        `[${task.name}] Downloading: ${progress}% (${downloadedBytes}/${
          totalBytes || "?"
        } bytes)\r`
      );
    });

    // 等待写入完成
    await new Promise((resolve, reject) => {
      writer.on("finish", () => {
        process.stdout.write("\n");
        resolve();
      });
      writer.on("error", reject);
    });

    // 完整性校验
    const fileData = await fs.promises.readFile(task.filePath);
    if (!ssri.checkData(fileData, task.integrity)) {
      throw new Error(`Integrity check failed for ${finalUrl}`);
    }

    return task.filePath;
  } catch (error) {
    if (retries > 0) {
      console.log(
        `Retrying ${task.name} (${CONFIG.retries - retries + 1}/${
          CONFIG.retries
        })`
      );
      return downloadWithRetry({ ...task, url: currentUrl }, retries - 1);
    }
    throw new Error(`Failed to download ${task.name}: ${error.message}`);
  }
}

/**
 * 主下载流程
 */
async function main() {
  // 解析 package-lock.json

  const lockfile = JSON.parse(fs.readFileSync("package-lock.json"));

  //   // 收集所有依赖项
  const dependencies = await collectDependencies(lockfile.packages ?? lockfile.dependencies);
  console.log(`Found ${dependencies.size} packages to download\n`);


    // 创建下载队列
    const queue = new PQueue({ concurrency: CONFIG.concurrency });
    let completed = 0;
    const total = dependencies.size;
    console.log(dependencies)

  //添加下载任务
    const tasks = Array.from(dependencies.values()).map(task =>
      queue.add(async () => {
        const start = Date.now();
        try {
          const filePath = await downloadWithRetry(task);
          completed++;
          console.log(`[${completed.toString().padStart(3, ' ')}/${total}] ` +
            `Downloaded ${path.basename(filePath)} in ${((Date.now() - start)/1000).toFixed(1)}s`);
          return filePath;
        } catch (error) {
          console.error(`\nFailed to download ${task.name}:`, error.message);
          throw error;
        }
      })
    );

    // 显示总体进度
    const progressInterval = setInterval(() => {
      const remaining = queue.size + queue.pending;
      console.log(`Queue status: ${total - remaining}/${total} | ` +
        `Active: ${queue.pending} | Waiting: ${queue.size}`);
    }, 5000);

    // 执行所有任务
    try {
      await Promise.all(tasks);
      clearInterval(progressInterval);
      console.log('\nAll packages downloaded successfully!');
      console.log(`Cache directory: ${CONFIG.cacheDir}`);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('\nDownload failed:', error.message);
      process.exit(1);
    }
}

// 执行主程序
main().catch(console.error);
