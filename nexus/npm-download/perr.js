const fs = require("fs");


/**
 * 递归收集所有依赖（新增 peerDependencies 处理）
 */
async function collectPeerDependencies(packages) {
  const peerDependency = new Map();

  for (const [pkgname, pkg] of Object.entries(packages)) {
    let name = pkgname;
    if (name.startsWith("node_modules")) {
      name = name.substring(13);
    }

    if (pkg.peerDependencies) {
      for (const [name, version] of Object.entries(pkg.peerDependencies)) {
        let versions;
        if (peerDependency.has(name)) {
          versions = peerDependency.get(name);
          if (!versions.has(version)) {
            versions.add(version);
          }
        } else {
          versions = new Set()
        }

        versions.add(version);
        peerDependency.set(name, versions);
      }
    }

  }
  // console.log(peerDependency);


  return peerDependency;
}
/**
 * 主下载流程
 */
async function collectPeerDependenciesBefore() {
  // 解析 package-lock.json

  const lockfile = JSON.parse(fs.readFileSync("D:/zg/test/down/package-lock/package-lock.json"));

  //   // 收集所有依赖项
  const peerDependencies = await collectPeerDependencies(lockfile.packages ?? lockfile.dependencies);
  console.log(`Found ${peerDependencies.size} packages to download\n`);

  let deps = [];
  for (const [peerName, versions] of peerDependencies.entries()) {
    for (const version of versions) {
      deps.push({ peerName, version });
    }
  }

  

  
  // console.log(deps);
  return deps;
}

// 执行主程序
// main().catch(console.error);





module.exports = {
  collectPeerDependenciesBefore
};