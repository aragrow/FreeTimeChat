# FreeTimeChat API Performance Benchmarks

## Overview

This directory contains load testing scripts and performance benchmarks for the
FreeTimeChat API. These tests help identify performance bottlenecks and ensure
the application can handle production loads.

## Prerequisites

- API server running on `http://localhost:5000`
- Database with test data seeded
- Node.js installed

## Quick Start

```bash
# Run all benchmarks
pnpm benchmark

# Run individual benchmarks
pnpm benchmark:health      # Health check endpoint
pnpm benchmark:auth        # Authentication endpoint
```

## Benchmark Scripts

### 1. Health Check (`health-check.js`)

Tests the simplest endpoint to establish baseline performance.

**Thresholds:**

- Average latency < 100ms
- P95 latency < 200ms
- Requests/sec > 1000
- Zero errors

### 2. Auth Login (`auth-login.js`)

Tests authentication performance under load (includes bcrypt hashing).

**Thresholds:**

- Average latency < 500ms (bcrypt is intentionally slow)
- P95 latency < 1000ms
- Requests/sec > 50
- Error rate < 1%

## Performance Targets

### API Response Times

- **Health Check**: < 10ms (p50), < 50ms (p95)
- **Database Reads**: < 100ms (p50), < 200ms (p95)
- **Database Writes**: < 150ms (p50), < 300ms (p95)
- **Authentication**: < 300ms (p50), < 500ms (p95)

### Throughput

- **Health Check**: 2000+ req/s
- **Simple Reads**: 500+ req/s
- **Complex Queries**: 100+ req/s
- **Authentication**: 100+ req/s

## Running Benchmarks

### Before Running

1. Ensure API server is running
2. Seed test data if needed
3. Warm up the server (run once, discard results)

### During Benchmarks

- Close other applications to reduce noise
- Run multiple times and average results
- Monitor system resources (CPU, memory, disk I/O)

### After Benchmarks

- Review results for anomalies
- Compare with baseline metrics
- Document any performance regressions

## Interpreting Results

### Key Metrics

**Latency:**

- `mean`: Average response time
- `p50`: 50% of requests faster than this
- `p95`: 95% of requests faster than this (important for user experience)
- `p99`: 99% of requests faster than this (worst case)

**Throughput:**

- `requests/sec`: Number of requests handled per second
- `throughput`: Data transferred per second

**Errors:**

- `errors`: Number of failed requests
- `timeouts`: Number of requests that timed out

### What to Look For

🟢 **Good Performance:**

- Latency under thresholds
- Error rate < 0.1%
- Consistent p95/p99 latency

🟡 **Warning Signs:**

- P95 > 2x average latency
- Error rate 0.1% - 1%
- Degrading performance over time

🔴 **Performance Issues:**

- Latency exceeds thresholds
- Error rate > 1%
- Timeouts occurring
- Memory leaks (increasing latency over time)

## Common Bottlenecks

### 1. Database Queries

**Symptoms:** High latency, low throughput **Solutions:**

- Add indexes
- Optimize queries
- Implement caching
- Use connection pooling

### 2. Authentication (bcrypt)

**Symptoms:** Slow login/registration **Solutions:**

- Reduce `BCRYPT_ROUNDS` (10 in production, 4 in tests)
- Implement rate limiting
- Use Redis for session storage

### 3. Memory Leaks

**Symptoms:** Performance degrades over time **Solutions:**

- Check for unclosed database connections
- Review event listener cleanup
- Use memory profiling tools

### 4. N+1 Queries

**Symptoms:** Many database queries per request **Solutions:**

- Use Prisma `include` for relations
- Implement DataLoader pattern
- Add query result caching

## Performance Optimization Checklist

### Application Level

- [ ] Enable gzip compression
- [ ] Implement response caching
- [ ] Use connection pooling
- [ ] Optimize serialization
- [ ] Add rate limiting

### Database Level

- [ ] Create indexes on foreign keys
- [ ] Create indexes on frequently queried fields
- [ ] Analyze slow query logs
- [ ] Optimize complex queries
- [ ] Implement read replicas (if needed)

### Caching Strategy

- [ ] Cache user permissions (5 min TTL)
- [ ] Cache static configuration
- [ ] Implement query result caching
- [ ] Use CDN for static assets

### Monitoring

- [ ] Set up APM (Application Performance Monitoring)
- [ ] Track response times
- [ ] Monitor error rates
- [ ] Alert on performance degradation

## Tools

### Load Testing

- **autocannon**: HTTP/HTTPS benchmarking tool
- **k6**: Modern load testing tool (alternative)
- **Artillery**: Scriptable load testing (alternative)

### Profiling

- **node --inspect**: Built-in Node.js debugger
- **clinic.js**: Node.js performance profiling
- **0x**: Flamegraph profiling

### Monitoring

- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Sentry**: Error tracking
- **DataDog**: Full APM solution

## Continuous Performance Testing

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Performance Tests
  run: |
    pnpm dev &
    sleep 5
    pnpm benchmark
    kill %1
```

### Performance Budget

Set a "performance budget" and fail builds if exceeded:

- Health check p95 > 100ms = FAIL
- Auth login p95 > 600ms = FAIL
- Error rate > 0.5% = FAIL

## Troubleshooting

### High Latency

1. Check database connection
2. Review slow query logs
3. Profile with `clinic doctor`
4. Check for synchronous operations

### Low Throughput

1. Increase connection pool size
2. Optimize middleware stack
3. Enable clustering
4. Check network bandwidth

### Memory Issues

1. Profile with `clinic heapprofiler`
2. Check for connection leaks
3. Review caching implementation
4. Monitor garbage collection

## Resources

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Prisma Performance Guide](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Express Performance Tips](https://expressjs.com/en/advanced/best-practice-performance.html)

## Notes

- Benchmarks are sensitive to system load
- Run on dedicated hardware for consistent results
- Compare results over time, not against absolutes
- Profile in production-like environments
