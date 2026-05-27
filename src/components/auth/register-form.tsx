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
import { Shield, Eye, EyeOff, Loader2, Check, X } from 'lucide-react'

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

  if (score <= 1) return { score, label: 'Yếu', color: 'bg-red-500' }
  if (score === 2) return { score, label: 'Trung bình', color: 'bg-amber-500' }
  if (score === 3) return { score, label: 'Khá', color: 'bg-emerald-400' }
  return { score, label: 'Mạnh', color: 'bg-emerald-500' }
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
    { label: 'Ít nhất 8 ký tự', met: password.length >= 8 },
    { label: 'Chữ hoa', met: /[A-Z]/.test(password) },
    { label: 'Chữ số', met: /[0-9]/.test(password) },
    { label: 'Ký tự đặc biệt', met: /[^A-Za-z0-9]/.test(password) },
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
    <Card className="w-full max-w-md border border-border/50 shadow-xl sm:shadow-lg sm:border bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
          <Shield className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Tạo tài khoản</CardTitle>
        <CardDescription className="mt-1.5">
          Đăng ký để tham gia SecureTeam
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reg-name" className="text-sm font-medium">Họ và tên</Label>
            <Input
              id="reg-name"
              type="text"
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoComplete="name"
              className="h-11 rounded-xl border-border/60 bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email" className="text-sm font-medium">Email công ty</Label>
            <Input
              id="reg-email"
              type="email"
              placeholder="email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              className="h-11 rounded-xl border-border/60 bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password" className="text-sm font-medium">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                className="h-11 rounded-xl border-border/60 bg-background/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${strength.color}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{strength.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {rules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1.5 text-xs">
                      {rule.met ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className={rule.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-confirm-password" className="text-sm font-medium">Xác nhận mật khẩu</Label>
            <Input
              id="reg-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              className="h-11 rounded-xl border-border/60 bg-background/50"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Mật khẩu không khớp</p>
            )}
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo tài khoản...
              </>
            ) : (
              'Đăng ký'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center pb-6">
        <p className="text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-semibold text-primary hover:underline underline-offset-2"
          >
            Đăng nhập
          </button>
        </p>
      </CardFooter>
    </Card>
  )
}
