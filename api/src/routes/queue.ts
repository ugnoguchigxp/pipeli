import { Hono } from 'hono';
import type { SqliteQueue } from '../lib/queue';

export function createQueueRouter(queue: SqliteQueue) {
    const router = new Hono();

    /**
     * GET /stats
     * キューの統計情報を取得
     */
    router.get('/stats', (c) => {
        const stats = queue.getStats();
        return c.json(stats);
    });

    /**
     * GET /failed
     * 失敗したジョブ（DLQ）の一覧を取得
     */
    router.get('/failed', (c) => {
        const jobs = queue.getFailedJobs();
        const sanitized = jobs.map((job) => ({
            id: job.id,
            name: job.name,
            status: job.status,
            retryCount: job.retryCount,
            maxRetries: job.maxRetries,
            error: job.error,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        }));
        return c.json(sanitized);
    });

    /**
     * POST /retry-all
     * 失敗したすべてのジョブをリトライ
     */
    router.post('/retry-all', (c) => {
        const count = queue.retryFailed();
        return c.json({ success: true, retriedCount: count });
    });

    /**
     * POST /retry/:id
     * 特定の失敗ジョブをリトライ
     */
    router.post('/retry/:id', (c) => {
        const id = Number(c.req.param('id'));
        if (Number.isNaN(id)) return c.json({ error: 'Invalid ID' }, 400);

        const success = queue.retryJob(id);
        return c.json({ success });
    });

    /**
     * 簡易ダッシュボード (HTML)
     */
    router.get('/dashboard', (c) => {
        const stats = queue.getStats();
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Queue Dashboard</title>
                <meta charset="utf-8">
                <style>
                    body { font-family: sans-serif; padding: 20px; background: #f4f4f9; color: #333; }
                    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
                    .stats { display: flex; gap: 20px; }
                    .stat-item { flex: 1; text-align: center; border-right: 1px solid #eee; }
                    .stat-item:last-child { border-right: none; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
                    .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
                    button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
                    button:hover { background: #1d4ed8; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
                    tr:hover { background: #fafafa; }
                    .error-text { color: #dc2626; font-size: 12px; }
                </style>
                <script>
                    async function retryAll() {
                        if(!confirm('すべての失敗したジョブをリトライしますか？')) return;
                        await fetch('/queue/retry-all', { method: 'POST' });
                        location.reload();
                    }
                    async function retryJob(id) {
                        await fetch('/queue/retry/' + id, { method: 'POST' });
                        location.reload();
                    }
                </script>
            </head>
            <body>
                <h1>Queue Dashboard</h1>
                
                <div class="card">
                    <div class="stats">
                        <div class="stat-item">
                            <div class="stat-value">${stats.total}</div>
                            <div class="stat-label">Total Jobs</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" style="color: #059669;">${stats.completed}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" style="color: #dc2626;">${stats.failed}</div>
                            <div class="stat-label">Failed</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" style="color: #d97706;">${stats.pending}</div>
                            <div class="stat-label">Pending</div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2>Recent Failures (DLQ)</h2>
                        <button onclick="retryAll()">Retry All</button>
                    </div>
                    ${
                        stats.failed === 0
                            ? '<p>No failed jobs.</p>'
                            : `
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Error</th>
                                    <th>Updated At</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="failed-list">
                                <!-- Loaded via server side or API -->
                            </tbody>
                        </table>
                    `
                    }
                </div>

                <script>
                    function appendCell(row, text, className) {
                        const cell = document.createElement('td');
                        if (className) cell.className = className;
                        cell.textContent = text;
                        row.appendChild(cell);
                    }

                    async function loadFailed() {
                        const res = await fetch('/queue/failed');
                        const jobs = await res.json();
                        const tbody = document.getElementById('failed-list');
                        if(!tbody) return;
                        tbody.innerHTML = '';
                        for (const job of jobs) {
                            const row = document.createElement('tr');
                            appendCell(row, String(job.id));
                            appendCell(row, String(job.name));
                            appendCell(row, String(job.error ?? ''), 'error-text');
                            appendCell(row, new Date(job.updatedAt).toLocaleString());
                            const actionCell = document.createElement('td');
                            const button = document.createElement('button');
                            button.textContent = 'Retry';
                            button.addEventListener('click', () => retryJob(job.id));
                            actionCell.appendChild(button);
                            row.appendChild(actionCell);
                            tbody.appendChild(row);
                        }
                    }
                    loadFailed();
                    setInterval(loadFailed, 5000); // 5秒ごとに更新
                </script>
            </body>
            </html>
        `;
        return c.html(html);
    });

    return router;
}
