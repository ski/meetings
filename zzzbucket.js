import stopcock from "stopcock";

function request(i) {
  return Promise.resolve(`${i} - ${new Date().toISOString()}`);
}

function log(data) {
  console.log(data);
}

const get = stopcock(request, { bucketSize: 1,limit: 1, interval:2000  });

for (let i = 0; i < 10; i++) {
  get(i).then(log);
}
