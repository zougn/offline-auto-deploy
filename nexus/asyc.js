const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const mkdirp = require('mkdirp');
const semver = require('semver');
const request = require('sync-request');
const { isAbsolute, join } = require('path');


// 配置参数
const CONFIG = {
  registry: "https://registry.npmmirror.com",
  cacheDir1: path.join("./", "npm_cache"),
  cacheDir: path.join("./", "depTree_cache"),
  processedPackages: new Map(),
};

// 初始化目录
mkdirp.sync(CONFIG.cacheDir1);
mkdirp.sync(CONFIG.cacheDir);

function fetchPackageInfo(name) {
  const encodedName = encodeURIComponent(name);
  const cachePath = path.join(CONFIG.cacheDir1, `${encodedName}.json`);

  // 优先使用缓存
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }

  // 同步请求注册表
  const registryUrl = `${CONFIG.registry}/${name.replace("/", "%2F")}`;
  const response = request('GET', registryUrl, {
    timeout: 15000,
    retry: true,
    headers: { 'content-type': 'application/json' }
  });

  if (response.statusCode >= 400) {
    throw new Error(`Package ${name} request failed: ${response.statusCode}`);
  }

  const data = JSON.parse(response.getBody('utf8'));
  fs.writeFileSync(cachePath, JSON.stringify(data));
  return data;
}

function getMaxSatisfyingVersion(pkgInfo, versionRange) {
  if (!versionRange) return pkgInfo['dist-tags'].latest;
  
  const versions = Object.keys(pkgInfo.versions);
  const result = semver.maxSatisfying(versions, versionRange);
  
  if (!result) {
    throw new Error(`No version satisfying ${versionRange} for ${pkgInfo.name}`);
  }
  return result;
}

function retrievePackageVersion(pkgInfo, version) {


  try {
    // const pkgInfo = fetchPackageInfo(name);
    // const version = getMaxSatisfyingVersion(pkgInfo, versionRange);
    const details = pkgInfo.versions[version];

    // 构造精简后的包信息
    const simplified = {
      name: details.name,
      version: details.version,
      url: details.dist.tarball,
      dependencies: details.dependencies,
      devDependencies: details.devDependencies,
      peerDependencies: details.peerDependencies
    };

    return simplified;
  } catch (err) {
    console.error(`[ERROR] Failed to process ${name}@${versionRange}:`, err.message);
    return null;
  }
}

function saveToYAML(pkgData) {
  if (!pkgData) return;

  try {
    const yamlContent = yaml.dump(pkgData, { lineWidth: -1 });
    const fileName = `${encodeURIComponent(pkgData.name)}-${pkgData.version}.yml`;
    const filePath = path.join(CONFIG.cacheDir, fileName);
    
    fs.writeFileSync(filePath, yamlContent, 'utf8');
    console.log(`Saved ${pkgData.name}@${pkgData.version}`);
  } catch (err) {
    console.error(`[ERROR] Failed to save ${pkgData.name}:`, err.message);
  }
}




function retrieveAndDeepTree(dep) {
  if (dep) {
    for ([name, version] of Object.entries(dep)) {
      console.log(name, version);
      if (version.startsWith("npm:")) {
        const trimmed = version.slice(4).trim();
        const atIndex = trimmed.lastIndexOf("@");
        (name = trimmed.substring(0, atIndex)),
          (version = trimmed.substring(atIndex + 1));
      }
      if (version.startsWith("github:")) {
        const atIndex = version.lastIndexOf("#");
        if (atIndex != -1) {
          version = version.substring(atIndex + 1);
        } else {
          version = "*";
        }
      }
      const pkgInfo = fetchPackageInfo(name);
      version = getMaxSatisfyingVersion(pkgInfo, version);
      if (existsSync(name, version)) {
        console.log('continue');
        continue;
      }else{
        console.log('no - continue', name, version);
      }
      let retrieve = retrievePackageVersion(pkgInfo, version);
      deepTree(retrieve);
    }
  }
}
function deepTree(package) {
  try {
    saveToYAML(package);
    // 检查缓存
    retrieveAndDeepTree(package.dependencies);
    // retrieveAndDeepTree(package.devDependencies);
    retrieveAndDeepTree(package.peerDependencies);
  } catch (err) {
    console.error("Fail deepTree. ", package,err.message);
  }
}



function retrieveFile(uri) {
  uri = uri.startsWith('http') || isAbsolute(uri) ? uri : join(process.cwd(), uri);
  if (fs.existsSync(uri)) {
    return uri.endsWith('json') ? require(uri) : fs.readFileSync(uri).toString();
  }
  try {
    const response = request('GET', uri, {
      timeout: 15000,
      retry: true,
      headers: { 'content-type': 'application/json' }
    });
  
    if (response.statusCode >= 400) {
      throw new Error(`Package ${name} request failed: ${response.statusCode}`);
    }
  
    const data = JSON.parse(response.getBody('utf8'));
    return data;
  } catch (error) {
    console.error(`failed to download the file from ${uri}`);
    process.exit(1);
  }
}

function existsSync(name,version) {
  const fileName = `${encodeURIComponent(name)}-${version}.yml`;
  const filePath = path.join(CONFIG.cacheDir, fileName);
  console.log(filePath)

  // 检查缓存
  return fs.existsSync(filePath);
}

// 使用示例
function main() {
  // const packages = [
  //   { name: 'lodash', version: '^4.17.0' },
  //   { name: 'axios', version: '^1.0.0' }
  // ];

  // packages.forEach(pkg => {
  //   const data = retrievePackageVersion(pkg.name, pkg.version);
  //   saveToYAML(data);
  // });
   // 解析 package.json
  //  const package = retrieveFile('/home/zougn/frontEnd/depTree/package.json');
  const pkgInfo = fetchPackageInfo('axios');
  let version = getMaxSatisfyingVersion(pkgInfo, '^1.9.0');

   const package = retrievePackageVersion(pkgInfo,version);

   deepTree(package)


  
    

   // modifyPackageByKeyValue(package.name,['dependencies','form-data'],'3.0.0')

 
   // save(package)
   console.log(package);
}

// 执行主函数
main();
