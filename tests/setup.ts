// Test setup - mock environment variables
process.env.DATABASE_URL = 'file:./db/test.db'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-testing-only'
