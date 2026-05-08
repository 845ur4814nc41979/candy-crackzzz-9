import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock } from 'lucide-react';
import logoPath from "@assets/candy_crackzzz_2_1776628492110.png";
import { useAppContext } from '@/context/AppContext';

export default function AdminLoginBackend() {
  const { login, loginError, isLoaded } = useAuth();
  const { settings } = useAppContext();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) navigate('/admin');
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {settings.showLogo && settings.logoBase64 ? (
            <img src={settings.logoBase64} alt={settings.businessName} className="h-16 mx-auto mb-4 object-contain" />
          ) : (
            <img src={logoPath} alt="Candy Crackzzz" className="h-16 mx-auto mb-4 object-contain" />
          )}
          <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground font-bold mt-1">Owner and employee sign-in</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="font-bold">Username</Label>
              <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" autoComplete="username" className="bg-background h-12 font-bold" required />
            </div>

            <div className="space-y-2">
              <Label className="font-bold">Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="********" autoComplete="current-password" className="bg-background h-12 font-bold pr-12" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {loginError && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm font-bold px-4 py-3 rounded-lg">{loginError}</div>}

            <Button type="submit" size="lg" disabled={loading} className="w-full font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,0,255,0.3)] h-12">
              <Lock className="w-4 h-4 mr-2" />
              {loading ? 'Signing in...' : 'Sign In'}
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
