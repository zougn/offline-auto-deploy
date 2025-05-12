const PQueue = require('p-queue');

// 初始化队列，设置并发数
const queue = new PQueue.default({ concurrency: 1 });

let i = 0
// 添加队列任务
 async function addTask() {
    return queue.add( async () =>  {
        i++;
        if (i < 100) {
             await addTask()
        }
        // 模拟异步任务（例如API请求）
        new Promise(resolve =>
            setTimeout(() => {
                console.log(`任务 ${i + 1} 完成`);
                resolve();
            }, Math.random() * 1000)
        )
    }
    );
}


async function main() {
    try {
        // 记录开始时间
        console.time("loopTime");

        Array.from({ length: 10 }, (_, i) => 
          addTask()
          );
   
        // 监听队列空闲（所有任务完成）
        queue.onIdle().then(() => {
            console.timeEnd("loopTime");
        });
    } catch (error) {
        console.error('🔥 主流程错误:', error.message);
        process.exit(1);
    }
}

// 启动程序
main();