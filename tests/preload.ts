// tests/preload.ts — sets env before any src/ module loads
process.env.NODE_ENV = 'test';
process.env.GITHUB_TOKEN = 'ghp_test_token_placeholder';
process.env.GITHUB_USERNAME = 'testuser';
process.env.PORTFOLIO_TOPIC = 'portfolio';
process.env.CACHE_TTL_MS = '60000';
process.env.CRON_SECRET = 'test-secret';
process.env.ALLOWED_ORIGINS = '*';
