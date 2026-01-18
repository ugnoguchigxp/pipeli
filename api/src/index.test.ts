import { beforeEach, describe, expect, it } from 'bun:test';
import { app, queue } from './index';

describe('Anonymizer API', () => {
    beforeEach(() => {
        queue.clear();
    });

    it('GET /health should return ok', async () => {
        const res = await app.request('/health');
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: 'ok' });
    });

    it('POST /anonymize should anonymize data', async () => {
        const payload = {
            data: {
                id: '123',
                name: 'John Doe',
                age: 25,
            },
            config: {
                hash: ['id'],
                generalizeAge: { field: 'age' },
            },
        };

        const res = await app.request('/anonymize', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(200);
        const result = await res.json();
        expect(result.id).toHaveLength(64);
        expect(result.age).toBe('20-29');
        expect(result.name).toBe('John Doe');
    });

    it('POST /anonymize/batch should anonymize multiple records', async () => {
        const payload = {
            data: [
                { id: '1', age: 20 },
                { id: '2', age: 30 },
            ],
            config: {
                generalizeAge: { field: 'age' },
            },
        };

        const res = await app.request('/anonymize/batch', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(200);
        const results = await res.json();
        expect(results).toHaveLength(2);
        expect(results[0].age).toBe('20-29');
        expect(results[1].age).toBe('30-39');
    });

    it('should return 400 for invalid request body', async () => {
        const res = await app.request('/anonymize', {
            method: 'POST',
            body: JSON.stringify({ data: { id: '123' }, config: { invalid: true } }),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
    });

    it('POST /enqueue/anonymize should return 400 for invalid body', async () => {
        const res = await app.request('/enqueue/anonymize', {
            method: 'POST',
            body: JSON.stringify({ data: { id: '123' } }),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
    });

    it('POST /enqueue/anonymize/batch should enqueue jobs', async () => {
        const payload = {
            data: [
                { id: '1', age: 20 },
                { id: '2', age: 30 },
            ],
            config: {
                generalizeAge: { field: 'age' },
            },
        };

        const res = await app.request('/enqueue/anonymize/batch', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.jobCount).toBe(1);
        const stats = queue.getStats();
        expect(stats.pending).toBe(1);
    });

    it('POST /anonymize should reject invalid generalizePostalCode config', async () => {
        const payload = {
            data: { zip: '100-0001' },
            config: {
                generalizePostalCode: { field: 'zip', keepDigits: 0 },
            },
        };

        const res = await app.request('/anonymize', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(400);
    });

    it('POST /queue/retry/:id should return 400 for invalid id', async () => {
        const res = await app.request('/queue/retry/abc', {
            method: 'POST',
        });

        expect(res.status).toBe(400);
    });

    it('POST /queue/retry/:id should return success false for non-failed job', async () => {
        const job = queue.enqueue('anonymize', {
            data: { id: '1' },
            config: { hash: ['id'] },
        });

        const res = await app.request(`/queue/retry/${job.id}`, {
            method: 'POST',
        });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ success: false });
    });

    it('GET /queue/stats should return current counts', async () => {
        queue.enqueue('anonymize', {
            data: { id: '1' },
            config: { hash: ['id'] },
        });

        const res = await app.request('/queue/stats');
        expect(res.status).toBe(200);
        const stats = await res.json();
        expect(stats.total).toBe(1);
        expect(stats.pending).toBe(1);
    });

    it('POST /queue/retry-all should retry failed jobs', async () => {
        const job1 = queue.enqueue('anonymize', {
            data: { id: '1' },
            config: { hash: ['id'] },
        });
        const job2 = queue.enqueue('anonymize', {
            data: { id: '2' },
            config: { hash: ['id'] },
        });

        queue.fail(job1.id, 'err', true);
        queue.fail(job2.id, 'err', true);

        const res = await app.request('/queue/retry-all', { method: 'POST' });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ success: true, retriedCount: 2 });
    });

    it('GET /queue/dashboard should return HTML', async () => {
        const res = await app.request('/queue/dashboard');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        const html = await res.text();
        expect(html).toContain('Queue Dashboard');
    });

    it('GET /queue/failed should not include payload data', async () => {
        const job = queue.enqueue('anonymize', {
            data: { ssn: '123-45-6789' },
            config: { redact: ['ssn'] },
        });
        queue.fail(job.id, 'test-error', true);

        const res = await app.request('/queue/failed');
        expect(res.status).toBe(200);
        const jobs = await res.json();
        expect(Array.isArray(jobs)).toBe(true);
        expect(jobs[0].payload).toBeUndefined();
        expect(jobs[0].name).toBe('anonymize');
        expect(jobs[0].error).toBe('test-error');
    });
});
