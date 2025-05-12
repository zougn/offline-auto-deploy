const { downloadLock } = require("./npmdownloader");

async function main() {

  downloadLock("package-lock.json");
//   downloadLock("/home/zougn/frontEnd/depTree/packageuri/package.json");
}

// 执行主程序
main().catch(console.error);
