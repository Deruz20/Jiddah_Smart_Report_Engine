import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const baseOrigin = new URL(baseUrl);
if (baseOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseOrigin.hostname)) {
  throw new Error('Refusing to run R0 tests against a non-local application server.');
}

test('unsafe development and test API routes are absent', async () => {
  for (const path of ['/api/dev/seed', '/api/test_error']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 404, `${path} must not be routable`);
  }
});
