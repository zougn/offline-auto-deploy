const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const { mkdirp } = require("mkdirp");
const semver = require("semver");
const { rimraf } = require("rimraf");
const axios = require("axios");
const PQueue = require("p-queue");
const { downloadByDeps } = require('./npmdownloader');
const { collectPeerDependenciesBefore } = require('./perr');

// 配置参数
const CONFIG = {
  concurrency: 6,
  registry: "https://registry.npmmirror.com",
  cacheDir1: path.join("./", "npm_cache"),
  cacheDir: path.join("./", "depTree_cache"),
  depDownloadPath: path.join("./", "npm_download"),
  cache1: new Set(), // name+versionRange 缓存
  cache2: new Set(), // name@version 缓存
  tarballs: new Map(),
};

function initDirectories() {
  mkdirp.sync(CONFIG.cacheDir1);
  rimraf.sync(CONFIG.cacheDir);
  mkdirp.sync(CONFIG.cacheDir);
}

// 初始化队列（并发数设置为5）
const queue = new PQueue.default({ concurrency: CONFIG.concurrency });

async function addTask(deps) {
  if (!deps) return;
  queue.add(async () => retrieveAndDeepTree(deps));
}

// 获取包信息（带重试机制）
async function fetchPackageInfo(name, retries = 3) {
  const encodedName = encodeURIComponent(name);
  const cachePath = path.join(CONFIG.cacheDir1, `${encodedName}.json`);

  try {
    await fs.access(cachePath);
    return JSON.parse(await fs.readFile(cachePath, "utf8"));
  } catch (cacheError) {
    try {
      const registryUrl = `${CONFIG.registry}/${encodeURIComponent(name)}`;
      const response = await axios.get(registryUrl, { timeout: 5000 });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      await fs.writeFile(cachePath, JSON.stringify(response.data));
      return response.data;
    } catch (fetchError) {
      if (retries > 0) {
        console.log(`重试获取 ${name} (剩余尝试 ${retries})`);
        return fetchPackageInfo(name, retries - 1);
      }
      throw new Error(`获取失败: ${name} - ${fetchError.message}`);
    }
  }
}

// 递归处理依赖树
async function retrieveAndDeepTree(dep) {
  if (!dep) return;

  await Promise.all(
    Object.entries(dep).map(async ([name, versionRange]) => {
      console.log(name,versionRange);
      if (versionRange.startsWith("npm:")) {
        const trimmed = versionRange.slice(4).trim();
        const atIndex = trimmed.lastIndexOf("@");
        (name = trimmed.substring(0, atIndex)),
          (versionRange = trimmed.substring(atIndex + 1));
      }
      if (versionRange.startsWith("github:")) {
        const atIndex = versionRange.lastIndexOf("#");
        if (atIndex != -1) {
          versionRange = versionRange.substring(atIndex + 1);
        } else {
          versionRange = "*";
        }
      }

      const cacheKey = `${name}${versionRange}`;
      if (CONFIG.cache1.has(cacheKey)) return;

      try {
        const pkgInfo = await fetchPackageInfo(name);
        const version = getMaxSatisfyingVersion(pkgInfo, versionRange);
        const versionKey = `${name}@${version}`;

        if (CONFIG.cache2.has(versionKey)) return;
        CONFIG.cache1.add(cacheKey);
        CONFIG.cache2.add(versionKey);

        const details = await retrievePackageVersion(pkgInfo, version);
        const key = `${details.name}@${details.version}`;
        const url = details.dist.tarball;
        const split = url.split("/");
        let filename = split[split.length - 1];
        filename = path.join(details.name, filename);
        // console.log(filename);
        
        if (!CONFIG.tarballs.has(key)) {
          CONFIG.tarballs.set(key, {
            name: key,
            url: url,
            integrity: details.dist.integrity,
            filePath: path.join(CONFIG.depDownloadPath, filename),
          });
        }
        // if (details?.dist?.tarball) {
        //   CONFIG.urls.add(details.dist.tarball);
        // }

        await saveToYAML(details);
        await addTask({
          ...details.dependencies,
          ...details.peerDependencies,
        });
      } catch (error) {
        console.error(`处理失败: ${name}@${versionRange}`, error.message);
      }
    })
  );
}

// 其他工具函数保持不变
function getMaxSatisfyingVersion(pkgInfo, versionRange) {
  if (!versionRange) return pkgInfo["dist-tags"]?.latest;
  return semver.maxSatisfying(Object.keys(pkgInfo.versions), versionRange);
}

async function retrievePackageVersion(pkgInfo, version) {
  return pkgInfo.versions[version] || null;
}

async function saveToYAML(pkgData) {
  if (!pkgData) return;
  try {
    const simplified = {
      name: pkgData.name,
      version: pkgData.version,
      url: pkgData.dist.tarball,
      dependencies: pkgData.dependencies,
      devDependencies: pkgData.devDependencies,
      peerDependencies: pkgData.peerDependencies
    };
    const yamlContent = yaml.dump(simplified, { lineWidth: -1 });
    const fileName = `${encodeURIComponent(pkgData.name)}-${
      pkgData.version
    }.yml`;
    await fs.writeFile(path.join(CONFIG.cacheDir, fileName), yamlContent);
  } catch (error) {
    console.error(
      `保存失败: ${pkgData.name}@${pkgData.version}`,
      error.message
    );
  }
}

async function main() {
  try {
    console.time("\n✅ 全部任务完成，耗时");
    console.log("🚀 初始化目录...");
    initDirectories();

    console.log("⏱️ 开始依赖分析...");

    //  await addTask({ "@antv/g6": "^5.0.45" });
    const  deps = await collectPeerDependenciesBefore()
    for (const { peerName, version } of deps) {
      // console.log({[peerName]: version});
      await addTask({[peerName]: version});
    }


    // 监听队列空闲（所有任务完成）
    await queue.onIdle().then(() => {
      console.timeEnd("\n✅ 全部任务完成，耗时");
      console.log(`📦 共处理 ${CONFIG.cache2.size} 个包`);
      console.log(`🌐 唯一下载地址 ${CONFIG.tarballs.size} 个`);
    });

    await downloadByDeps(CONFIG.tarballs)
  } catch (error) {
    console.error("🔥 主流程错误:", error.message);
    process.exit(1);
  }
}

// 启动程序
main();
