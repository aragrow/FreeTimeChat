#!/usr/bin/env node
/**
 * Load Test: Health Check Endpoint
 *
 * Baseline performance test for the simplest endpoint
 */

const autocannon = require('autocannon');

const url = 'http://localhost:5000/health';

console.log('🚀 Starting load test for Health Check endpoint');
console.log(`URL: ${url}`);
console.log('---');

autocannon(
  {
    url,
    connections: 100, // Number of concurrent connections
    duration: 30, // Test duration in seconds
    pipelining: 1, // Number of pipelined requests
    method: 'GET',
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

    // Performance thresholds
    const passedThresholds = {
      avgLatency: result.latency.mean < 100, // Should be under 100ms
      p95Latency: result.latency.p95 < 200, // Should be under 200ms
      requestsPerSec: result.requests.average > 1000, // Should handle 1000+ req/s
      errorRate: result.errors === 0, // No errors
    };

    console.log('\n✅ Performance Thresholds:');
    console.log(`  Average Latency < 100ms: ${passedThresholds.avgLatency ? '✓' : '✗'}`);
    console.log(`  P95 Latency < 200ms: ${passedThresholds.p95Latency ? '✓' : '✗'}`);
    console.log(`  Requests/sec > 1000: ${passedThresholds.requestsPerSec ? '✓' : '✗'}`);
    console.log(`  No Errors: ${passedThresholds.errorRate ? '✓' : '✗'}`);

    const allPassed = Object.values(passedThresholds).every((v) => v);
    console.log(`\n${allPassed ? '✅ ALL THRESHOLDS PASSED' : '⚠️  SOME THRESHOLDS FAILED'}\n`);

    process.exit(allPassed ? 0 : 1);
  }
);
