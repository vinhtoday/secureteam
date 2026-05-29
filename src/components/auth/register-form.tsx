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
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'LOW SECURITY', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'MODERATE SECURITY', color: 'bg-amber-500' }
  if (score === 3) return { score, label: 'HIGH SECURITY', color: 'bg-[#00e5a0]' }
  return { score, label: 'TACTICAL ENCRYPTED', color: 'bg-[#00e5a0]' }
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const register = useAuthStore((s) => s.register)
  const isLoading = useAuthStore((s) => s.isLoading)

  const strength = getPasswordStrength(password)

  const rules = [
    { label: 'MINIMUM 8 CHARACTERS', met: password.length >= 8 },
    { label: 'UPPERCASE LETTER', met: /[A-Z]/.test(password) },
    { label: 'NUMERIC DIGIT', met: /[0-9]/.test(password) },
    { label: 'SPECIAL SYMBOL', met: /[^A-Za-z0-9]/.test(password) },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    if (strength.score < 3) {
      setError('Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.')
      return
    }

    try {
      await register(email, password, name)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
      } else {
        setError('Đăng ký thất bại. Vui lòng thử lại.')
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
        <CardTitle className="text-2xl font-title font-extrabold tracking-widest bg-clip-text text-white">AGENT REGISTER</CardTitle>
        <CardDescription className="mt-1 font-mono text-[11px] text-[#00e5a0]/70 uppercase tracking-wider">
          // CREATE NEW IDENTIFICATION PROTOCOL
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
            <Label htmlFor="reg-name" className="text-xs font-mono font-bold text-[#00e5a0] uppercase tracking-wider">AGENT NAME</Label>
            <Input
              id="reg-name"
              type="text"
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoComplete="name"
              className="h-10 rounded-none border-[#1e2a35] bg-[#0a0c0f] font-mono text-xs text-white focus-visible:ring-[#00e5a0]/30 focus-visible:border-[#00e5a0] placeholder:text-muted-foreground/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-email" className="text-xs font-mono font-bold text-[#00e5a0] uppercase tracking-wider">AGENT EMAIL</Label>
            <Input
              id="reg-email"
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
            <Label htmlFor="reg-password" className="text-xs font-mono font-bold text-[#00e5a0] uppercase tracking-wider">SECURE PASSWORD</Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
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
            {password && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 bg-[#0a0c0f] border border-[#1e2a35] rounded-none">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#00e5a0] font-bold">{strength.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-[#0a0c0f] p-2 border border-[#1e2a35] rounded-none">
                  {rules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1 text-[9px] font-mono">
                      {rule.met ? (
                        <Check className="h-3 w-3 text-[#00e5a0]" />
                      ) : (
                        <X className="h-3 w-3 text-destructive" />
                      )}
                      <span className={rule.met ? 'text-[#00e5a0] font-bold' : 'text-muted-foreground/60'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm-password" className="text-xs font-mono font-bold text-[#00e5a0] uppercase tracking-wider">CONFIRM PASSWORD</Label>
            <Input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              className="h-10 rounded-none border-[#1e2a35] bg-[#0a0c0f] font-mono text-xs text-white focus-visible:ring-[#00e5a0]/30 focus-visible:border-[#00e5a0]"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] font-mono text-destructive uppercase tracking-wider mt-1">// PASSWORD MISMATCH</p>
            )}
          </div>
          <Button type="submit" className="w-full h-10 rounded-none font-title font-bold text-sm tracking-wider bg-[#00e5a0] text-black hover:bg-[#00c78b] active:scale-[0.98] shadow-md transition-all duration-150 cursor-pointer uppercase mt-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ENROLLING AGENT...
              </>
            ) : (
              'REGISTER PROTOCOL'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center pb-2 pt-4">
        <p className="text-xs font-mono text-muted-foreground">
          ALREADY REGISTERED?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-bold text-[#00e5a0] hover:underline cursor-pointer tracking-wider"
          >
            LOGIN TO SYSTEM
          </button>
        </p>
      </CardFooter>
    </Card>
  )
}

