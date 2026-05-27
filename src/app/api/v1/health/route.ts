// GET /api/v1/health — Health check
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  
  // Check database connectivity
  let dbStatus = 'ok'
  try {
    const { db } = await import('@/lib/db')
    await db.$queryRaw`SELECT 1`
  } catch {
    dbStatus = 'error'
  }

  const uptime = process.uptime()
  const memoryUsage = process.memoryUsage()
  const responseTime = Date.now() - startTime

  return NextResponse.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    responseTime: `${responseTime}ms`,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
    },
    services: {
      database: dbStatus,
      redis: 'not_configured', // Will be connected when Redis is added
    },
  }, {
    status: dbStatus === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
