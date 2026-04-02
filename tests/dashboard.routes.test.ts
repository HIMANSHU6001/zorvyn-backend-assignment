import request from 'supertest';
import { createApp } from '../src/app';

describe('Dashboard and docs routes', () => {
  const app = createApp();

  it('returns dashboard health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toMatch(/Finance Dashboard API/i);
  });

  it('serves OpenAPI JSON docs route', async () => {
    const response = await request(app).get('/api/docs/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('openapi');
    expect(response.body).toHaveProperty('paths');
  });

  it('redirects /docs to /api/docs', async () => {
    const response = await request(app).get('/docs');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/api/docs');
  });
});
