#!/usr/bin/env node
/**
 * Load Test: Authentication Login Endpoint
 *
 * Tests login performance under load
 */

const autocannon = require('autocannon');

const url = 'http://localhost:5000/api/v1/auth/login';

console.log('🚀 Starting load test for Auth Login endpoint');
console.log(`URL: ${url}`);
console.log('---');

// Test credentials (should exist in database)
const requestBody = JSON.stringify({
  email: 'test@example.com',
  password: 'TestPassword123!',
});

autocannon(
  {
    url,
    connections: 50, // Lower for auth endpoints (database-heavy)
    duration: 20, // Test duration in seconds
    pipelining: 1,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: requestBody,
  },
  (err, result) => {
    if (err) {
      console.error('❌ Load test failed:', err);
      process.exit(1);
    }

    console.log('\n📊 Load Test Results:');
    console.log('='.repeat(50));
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latency (avg): ${result.latency.mean}ms`);
    console.log(`Latency (p50): ${result.latency.p50}ms`);
    console.log(`Latency (p95): ${result.latency.p95}ms`);
    console.log(`Latency (p99): ${result.latency.p99}ms`);
    console.log(`Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log('='.repeat(50));

    // Status code breakdown
    console.log('\n📈 Status Codes:');
    Object.entries(result['2xx'] || {}).forEach(([code, count]) => {
      console.log(`  ${code}: ${count}`);
    });
    if (result['4xx']) {
      Object.entries(result['4xx']).forEach(([code, count]) => {
        console.log(`  ${code}: ${count}`);
      });
    }

    // Performance thresholds for auth (more lenient due to bcrypt)
    const passedThresholds = {
      avgLatency: result.latency.mean < 500, // Should be under 500ms (bcrypt is slow)
      p95Latency: result.latency.p95 < 1000, // Should be under 1s
      requestsPerSec: result.requests.average > 50, // Should handle 50+ req/s
      errorRate: result.errors / result.requests.total < 0.01, // Less than 1% errors
    };

    console.log('\n✅ Performance Thresholds:');
    console.log(`  Average Latency < 500ms: ${passedThresholds.avgLatency ? '✓' : '✗'}`);
    console.log(`  P95 Latency < 1000ms: ${passedThresholds.p95Latency ? '✓' : '✗'}`);
    console.log(`  Requests/sec > 50: ${passedThresholds.requestsPerSec ? '✓' : '✗'}`);
    console.log(`  Error Rate < 1%: ${passedThresholds.errorRate ? '✓' : '✗'}`);

    const allPassed = Object.values(passedThresholds).every((v) => v);
    console.log(`\n${allPassed ? '✅ ALL THRESHOLDS PASSED' : '⚠️  SOME THRESHOLDS FAILED'}\n`);

    if (!allPassed) {
      console.log('💡 Tips for improvement:');
      if (!passedThresholds.avgLatency || !passedThresholds.p95Latency) {
        console.log('  - Consider reducing BCRYPT_ROUNDS in production');
        console.log('  - Add database query optimization');
        console.log('  - Check for N+1 queries');
      }
      if (!passedThresholds.requestsPerSec) {
        console.log('  - Consider adding connection pooling');
        console.log('  - Add caching for user lookups');
      }
    }

    process.exit(allPassed ? 0 : 1);
  }
);
