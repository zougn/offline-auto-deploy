const fs = require('fs/promises');
const path = require('path');
const yaml = require('js-yaml');
const mkdirp = require('mkdirp');
const semver = require('semver');
const rimraf = require('rimraf');
const axios = require('axios'); // 替换同步请求库

// 配置参数
const CONFIG = {
  registry: "https://registry.npmmirror.com",
  cacheDir1: path.join("./", "npm_cache"),
  cacheDir: path.join("./", "depTree_cache"),
  cache1: new Set(),
  cache2: new Set(),
  urls: new Set(),
};

// 异步初始化目录
function initDirectories() {
  mkdirp.sync(CONFIG.cacheDir1);
  rimraf.sync(CONFIG.cacheDir);
  mkdirp.sync(CONFIG.cacheDir);
}

// 异步获取包信息
async function fetchPackageInfo(name) {
  const encodedName = encodeURIComponent(name);
  const cachePath = path.join(CONFIG.cacheDir1, `${encodedName}.json`);

  try {
    await fs.access(cachePath);
    const cachedData = await fs.readFile(cachePath, 'utf8');

    return JSON.parse(cachedData);
  } catch {
    const registryUrl = `${CONFIG.registry}/${name.replace("/", "%2F")}`;

    const response = await axios.get(registryUrl, { timeout: CONFIG.timeout });
    if (response.status != 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = response.data;
    await fs.writeFile(cachePath, JSON.stringify(data));
    return data;
  }
}

// 异步保存到YAML
async function saveToYAML(pkgData) {
  if (!pkgData) return;
  try {
   

    const yamlContent = yaml.dump(pkgData, { lineWidth: -1 });
    const fileName = `${encodeURIComponent(pkgData.name)}-${pkgData.version}.yml`;
    const filePath = path.join(CONFIG.cacheDir, fileName);

    await fs.writeFile(filePath, yamlContent, 'utf8');
    console.log(`Saved ${pkgData.name}@${pkgData.version}`);
  } catch (err) {
    console.error(`[ERROR] Failed to save ${pkgData.name}:`, err.message);
  }
}

// 异步递归处理依赖树
async function retrieveAndDeepTree(dep) {
  if (!dep) return;

  for (const [name, versionRange] of Object.entries(dep)) {
    console.log(name, versionRange);
    if (CONFIG.cache1.has(`${name}${versionRange}`)) continue;
    try {
      const pkgInfo = await fetchPackageInfo(name);
      const version = getMaxSatisfyingVersion(pkgInfo, versionRange);
      if (CONFIG.cache2.has(`${name}@${version}`)) continue;
      const details = await retrievePackageVersion(pkgInfo, version);
      const url = details['url'];
      if (url) CONFIG.urls.add(url);
      await saveToYAML(details);
      CONFIG.cache1.add(`${name}${versionRange}`);
      CONFIG.cache2.add(`${name}@${version}`);

      const deps = {
        ...details.dependencies,
        // ...details.devDependencies,
        ...details.peerDependencies
      };

      await retrieveAndDeepTree(deps);
    } catch (err) {
      console.error(`[ERROR] Processing ${name}:`, err.message);
    }
  }
}

// 辅助函数保持不变
function getMaxSatisfyingVersion(pkgInfo, versionRange) {
  if (!versionRange) return pkgInfo['dist-tags'].latest;

  const versions = Object.keys(pkgInfo.versions);
  const result = semver.maxSatisfying(versions, versionRange);

  if (!result) throw new Error(`No version satisfying ${versionRange} for ${pkgInfo.name}`);
  return result;
}

function retrievePackageVersion(pkgInfo, version) {
  const details = pkgInfo.versions[version];
  return {
    name: details.name,
    version: details.version,
    url: details.dist.tarball,
    dependencies: details.dependencies,
    devDependencies: details.devDependencies,
    peerDependencies: details.peerDependencies
  };
}

// 主执行流程
(async () => {
  console.time("loopTime"); // 开始计时
  initDirectories();
  try {
    // 示例：处理express包及其依赖"": "^7.0.0-0"
    await retrieveAndDeepTree({ '@antv/g6': '^5.0.45' });
    console.log('Dependency tree processed successfully');
  } catch (err) {
    console.error('Main process error:', err);
  }
 
console.timeEnd("loopTime"); // 结束计时，并打印耗时
})();
