'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { ApiClientError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu')
      return
    }

    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
      } else {
        setError('Đăng nhập thất bại. Vui lòng thử lại.')
      }
    }
  }

  return (
    <Card className="w-full max-w-md bg-[#0f1318] border border-[#1e2a35] rounded-none p-6 shadow-xl relative corner-bracket corner-bracket-b">
      <CardHeader className="text-center pb-4 pt-2">
        <div 
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-[#00e5a0] text-black font-extrabold text-lg transition-transform hover:scale-105 duration-300"
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        >
          ST
        </div>
        <CardTitle className="text-2xl font-title font-extrabold tracking-widest bg-clip-text text-white">SECURE ACCESS</CardTitle>
        <CardDescription className="mt-1 font-mono text-[11px] text-[#00e5a0]/70 uppercase tracking-wider">
          // AUTHENTICATE TO PROCEED
        </CardDescription>
      </CardHeader>
      <CardContent className="px-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-none bg-destructive/15 border border-destructive/30 p-3 text-xs font-mono text-destructive uppercase tracking-wider" role="alert">
              // ERROR: {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-mono font-bold text-[#00e5a0] uppercase tracking-wider">AGENT EMAIL</Label>
            <Input
              id="login-email"
              type="email"
              placeholder="agent@secureteam.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              className="h-10 rounded-none border-[#1e2a35] bg-[#0a0c0f] font-mono text-xs text-white focus-visible:ring-[#00e5a0]/30 focus-visible:border-[#00e5a0] placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs font-mono font-bold text-[#00e5a0] uppercase tracking-wider">SECURE PASSWORD</Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="h-10 rounded-none border-[#1e2a35] bg-[#0a0c0f] font-mono text-xs text-white pr-10 focus-visible:ring-[#00e5a0]/30 focus-visible:border-[#00e5a0]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4 text-[#00e5a0]" /> : <Eye className="h-4 w-4 text-[#00e5a0]" />}
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2 py-1">
            <Checkbox
              id="login-remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="border-[#1e2a35] rounded-none data-[state=checked]:bg-[#00e5a0] data-[state=checked]:border-[#00e5a0] data-[state=checked]:text-black"
            />
            <Label htmlFor="login-remember" className="cursor-pointer text-xs font-mono text-muted-foreground/80 hover:text-white transition-colors">
              REMEMBER SESSION
            </Label>
          </div>
          
          <Button type="submit" className="w-full h-10 rounded-none font-title font-bold text-sm tracking-wider bg-[#00e5a0] text-black hover:bg-[#00c78b] active:scale-[0.98] shadow-md transition-all duration-150 cursor-pointer uppercase" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                VERIFYING PROTOCOLS...
              </>
            ) : (
              'AUTHENTICATE →'
            )}
          </Button>

          {/* 2FA Divider */}
          <div className="relative flex items-center justify-center my-4.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1e2a35]"></div>
            </div>
            <span className="relative z-10 bg-[#0f1318] px-3 font-mono text-[9px] text-muted-foreground tracking-[3px] uppercase font-bold">2FA VERIFICATION</span>
          </div>

          {/* 6-box OTP row */}
          <div className="flex justify-between gap-1.5 py-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Input
                key={i}
                type="text"
                maxLength={1}
                className="h-10 w-10 text-center font-mono text-sm font-extrabold bg-[#0a0c0f] border-[#1e2a35] rounded-none text-white focus-visible:border-[#00e5a0] focus-visible:ring-[#00e5a0]/30"
                placeholder="-"
                onChange={(e) => {
                  const val = e.target.value
                  if (val && e.target.nextElementSibling) {
                    (e.target.nextElementSibling as HTMLInputElement).focus()
                  }
                }}
              />
            ))}
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-center pb-2 pt-4">
        <p className="text-xs font-mono text-muted-foreground">
          NEW AGENT?{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-bold text-[#00e5a0] hover:underline cursor-pointer tracking-wider"
          >
            CREATE ACCOUNT
          </button>
        </p>
      </CardFooter>
    </Card>
  )
}
