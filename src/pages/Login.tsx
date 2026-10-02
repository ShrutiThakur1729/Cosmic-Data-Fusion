import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StarField } from '@/components/cosmic/StarField';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const { signIn, signInAsDemo, user, loading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    const { error } = await signInAsDemo();
    setIsDemoLoading(false);
    if (!error) {
      navigate('/dashboard');
    }
  };

  const fillJudgeCredentials = () => {
    setEmail('judge@cosmicfusion.space');
    setPassword('CosmicJudge2025!');
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (!error) {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="orbital-loader" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <StarField />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.6 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center"
          >
            <Rocket className="w-6 h-6 text-primary-foreground" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl gradient-text-cosmic">
              COSMIC
            </span>
            <span className="text-xs text-muted-foreground tracking-wider">
              DATA FUSION
            </span>
          </div>
        </Link>

        {/* Form Card */}
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to continue your research
            </p>
          </div>

          {/* Judge & Jury Quick Access Box */}
          <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5 backdrop-blur-md relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-gradient-to-r from-primary to-accent text-white rounded-bl-lg shadow-sm">
              Hackathon / Jury
            </div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  Judge & Evaluator Demo
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  1-click access preloaded with JWST, Chandra, Gaia & Hubble datasets.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="cosmic"
              className="w-full font-medium shadow-md shadow-primary/25"
              onClick={handleDemoLogin}
              disabled={isDemoLoading || isLoading}
            >
              {isDemoLoading ? (
                <div className="orbital-loader scale-50" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Instant Judge Demo Login
                </>
              )}
            </Button>

            <div className="mt-2.5 pt-2 border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-mono truncate max-w-[200px]">judge@cosmicfusion.space</span>
              <button
                type="button"
                onClick={fillJudgeCredentials}
                className="text-primary hover:underline font-medium hover:text-primary/90 transition-colors"
              >
                Autofill form
              </button>
            </div>
          </div>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/30" />
            </div>
            <span className="relative bg-card/90 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              Or sign in with account
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="researcher@institution.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 bg-muted/30 border-border/50 ${errors.email ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 bg-muted/30 border-border/50 ${errors.password ? 'border-destructive' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="cosmic"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="orbital-loader scale-50" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/30 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
