import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import logoPath from '@assets/candy_crackzzz_2_1776628492110.png';

export default function AdminSetupForm() {
  const { setupAdmin, isAdminSetup, isLoaded, loginError } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (loginError) setError(loginError);
  }, [loginError]);

  useEffect(() => {
    if (isLoaded && isAdminSetup) {
      navigate('/admin/login');
    }
  }, [isLoaded, isAdminSetup, navigate]);

  if (!isLoaded) return null;
  if (isAdminSetup) return null;

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();

    if (!trimmedUsername) return setError('Username is required.');
    if (trimmedUsername.length < 3) return setError('Username must be at least 3 characters.');
    if (!password) return setError('Password is required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    const ok = await setupAdmin(trimmedUsername, password);
    setLoading(false);

    if (ok) {
      navigate('/admin');
      return;
    }

    setError(prev => prev || 'Could not create the admin account.');
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logoPath} alt="Candy Crackzzz" className="h-16 mx-auto mb-4 object-contain" />
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Admin Setup</h1>
          </div>
          <p className="text-sm text-muted-foreground font-bold">Create your admin account to get started. This only happens once.</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleSetup} className="space-y-5">
            <div className="space-y-2">
              <Label className="font-bold">Choose a Username</Label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. owner"
                autoComplete="username"
                className="bg-background h-12 font-bold"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Choose a Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className="bg-background h-12 font-bold pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Confirm Password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="bg-background h-12 font-bold"
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,0,255,0.3)] h-12">
              <ShieldCheck className="w-4 h-4 mr-2" />
              {loading ? 'Creating Admin Account...' : 'Create Admin Account'}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-muted-foreground font-bold hover:text-foreground transition-colors">← Back to Storefront</a>
        </div>
      </div>
    </div>
  );
}
