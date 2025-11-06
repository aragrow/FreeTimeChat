#!/usr/bin/env node
/**
 * Run All Performance Benchmarks
 *
 * Executes all benchmark scripts and generates a summary report
 */

const { spawn } = require('child_process');
const path = require('path');

const benchmarks = [
  { name: 'Health Check', file: 'health-check.js', critical: true },
  { name: 'Auth Login', file: 'auth-login.js', critical: true },
];

const results = [];
let currentIndex = 0;

console.log('🚀 FreeTimeChat API Performance Benchmark Suite');
console.log('='.repeat(60));
console.log(`Running ${benchmarks.length} benchmark(s)...\n`);

function runBenchmark(benchmark) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Running: ${benchmark.name}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();
    const child = spawn('node', [path.join(__dirname, benchmark.file)], {
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const passed = code === 0;

      results.push({
        name: benchmark.name,
        passed,
        duration,
        critical: benchmark.critical,
      });

      resolve();
    });
  });
}

async function runAll() {
  for (const benchmark of benchmarks) {
    await runBenchmark(benchmark);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Cool down between tests
  }

  // Print summary
  console.log('\n\n');
  console.log('='.repeat(60));
  console.log('📊 BENCHMARK SUMMARY');
  console.log('='.repeat(60));

  results.forEach((result) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const critical = result.critical ? '[CRITICAL]' : '';
    console.log(`${status} ${critical} ${result.name} (${result.duration}s)`);
  });

  const totalPassed = results.filter((r) => r.passed).length;
  const criticalFailed = results.filter((r) => !r.passed && r.critical).length;

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${totalPassed}/${results.length} passed`);

  if (criticalFailed > 0) {
    console.log(`\n⚠️  ${criticalFailed} CRITICAL benchmark(s) failed!`);
    console.log('Performance issues detected. Review logs above for details.\n');
    process.exit(1);
  } else if (totalPassed === results.length) {
    console.log('\n✅ ALL BENCHMARKS PASSED!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some non-critical benchmarks failed.\n');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('❌ Benchmark suite failed:', err);
  process.exit(1);
});
