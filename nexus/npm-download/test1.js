import PQueue from 'p-queue';

// 初始化队列（并发数设置为5）
const queue = new PQueue({ concurrency: 5 });
let count = 0; // 全局计数器
const startTime = Date.now();

// 定义任务函数（模拟异步操作）
const task = async () => {
    // 原子性递增计数器（避免并发冲突）
    const currentCount = ++count;
    console.log(`执行任务，当前计数: ${currentCount}`);
  
    // 如果未达到100，递归添加新任务
    if (currentCount < 100) {
      queue.add(task); // 向队列添加新任务
    }
  // 模拟异步任务（例如请求API）
  await new Promise(resolve => setTimeout(resolve, 100));

};

// 初始添加10个任务（根据需求调整）
for (let i = 0; i < 10; i++) {
  queue.add(task);
}

// 监听队列空闲（所有任务完成）
queue.onIdle().then(() => {
  const endTime = Date.now();
  console.log(`计数终止于: ${count}`);
  console.log(`总耗时: ${endTime - startTime}ms`);
});
