"use client"
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useNotification } from '@/contexts/notification-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import logo from '@public/logo/logo.png'
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage(){
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const { login } = useAuth();
  const { showSuccess, showError } = useNotification();
  const router = useRouter()

  const handlePasswordKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const capsLockOn = event.getModifierState && event.getModifierState('CapsLock');
    setIsCapsLockOn(!!capsLockOn);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await login(username, password);
      if (user) {
        showSuccess('Connexion réussie !');
        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError('Erreur de connexion');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-80 w-80 rounded-full bg-primary/40 blur-3xl dark:bg-primary/30" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-border/60 bg-card/90 shadow-xl backdrop-blur-xl animate-scale-in">
          <CardHeader className="pb-4 text-center space-y-3">
            <div className="mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
              <Image src={logo} alt="Elite Time Logo" width={72} height={72} />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Bienvenue sur Elite Time
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Connectez-vous pour gérer les pointages, les équipes et les rapports en temps réel.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Nom d&apos;utilisateur</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Votre nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handlePasswordKey}
                    onKeyUp={handlePasswordKey}
                    onBlur={() => setIsCapsLockOn(false)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {isCapsLockOn && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    La touche majuscule (Caps Lock) est activée.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Identifiants fournis par votre administrateur.</span>
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-medium shadow-md shadow-primary/30 hover:shadow-lg hover:-translate-y-1px transition-all cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion en cours...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

