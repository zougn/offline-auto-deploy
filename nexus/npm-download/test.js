const PQueue = require("p-queue");

const queue = new PQueue.default({ concurrency: 5 });
let i = 0;

async function addTask() {
   queue.add(async () => {
    ++i;
    console.log(`执行任务，当前计数: ${i}`);
    if (i < 100) {
       await addTask();
    }
    await new Promise((resolve) =>
      setTimeout(() => {
        console.log(`执ww: ${i}`);
        resolve();
      }, Math.random() * 1000)
    );
  });
}

console.time("loopTime");
Array.from({ length: 10 }, (_, i) => addTask());
queue.onIdle().then(() => {
  console.timeEnd("loopTime");
});
