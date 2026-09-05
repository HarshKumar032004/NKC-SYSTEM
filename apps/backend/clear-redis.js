const { Redis } = require('ioredis');
const url = 'rediss://default:gQAAAAAAAc-iAAIgcDJlZmQxZjA5ZTI5ODE0ZGQxOTQ3NTY1M2I1NDc1MTNmMQ@stable-skunk-118690.upstash.io:6379';
const redis = new Redis(url, { tls: {} });

redis.flushall().then(() => {
  console.log('✅ Redis cleared successfully!');
  redis.quit();
}).catch(e => {
  console.error('❌ Failed to clear Redis:', e.message);
  redis.quit();
});
