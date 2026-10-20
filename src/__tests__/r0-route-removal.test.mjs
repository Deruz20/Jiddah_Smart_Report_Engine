import test from 'node:test';
import assert from 'node:assert/strict';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3005';

test('unsafe development and test API routes are absent', async () => {
  for (const path of ['/api/dev/seed', '/api/test_error']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 404, `${path} must not be routable`);
  }
});
