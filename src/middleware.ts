import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self)')
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  // Block common attack paths
  const url = request.nextUrl.pathname
  const blockedPaths = ['/.env', '/.git', '/wp-admin', '/wp-login', '/xmlrpc.php', '/admin.php']
  if (blockedPaths.some(path => url.toLowerCase().includes(path))) {
    return new NextResponse(null, { status: 404 })
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt|uploads).*)',
  ],
}
