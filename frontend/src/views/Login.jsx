'use client';

import React, { useState, useEffect } from 'react';
import { get, post } from '../api.js';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { useToast } from '@/hooks/useToast';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    get('/public/hotels').then((d) => setBrand(d?.settings || {})).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!username || !password) return setError('Username and password are required');
    setBusy(true);
    setError('');
    try {
      const r = await post('/auth/login', { username, password });
      localStorage.setItem('arynox_token', r.token);
      localStorage.setItem('arynox_user', JSON.stringify(r.user));
      toast.success(`Welcome back, ${r.user.name}!`);
      onLogin(r.user);
    } catch (err) {
      setError(err.message || 'Unable to connect to server');
      toast.error(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  const backHref = brand?.website_url || '#/';
  const backProps = backHref.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {};

  return (
    <div className="erp-login-wrap min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md erp-login-card shadow-2xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <img src="/logo.svg" alt="" className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl">{brand?.hotel_name || 'Hotel Lakshmi Elite'}</CardTitle>
          <CardDescription>Arynoxtech Hotel Management ERP · Staff sign in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submit} autoComplete="off" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="off"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-input bg-background focus:ring-2 focus:ring-ring"
                />
                Stay signed in
              </Label>
            </div>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <Separator className="my-4" />
          <Button variant="ghost" className="w-full" asChild {...backProps}>
            <a href={backHref}>← Back to website</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}