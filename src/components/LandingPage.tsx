import { useState, type FormEvent } from "react";
import { FileText, Timer, Sparkles, Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import FeatureCard from "./FeatureCard";
import GoogleIcon from "./GoogleIcon";

interface LandingPageProps {
  onGuestMode: () => void;
  key?: string;
}

/**
 * Sign-in screen for visitors who are not signed in.
 *
 * It intentionally has no upload UI: uploading lives in the dashboard's upload
 * dialog, which understands formats, samples and custom subjects. Signed-in
 * students never reach this screen, so a second upload path here was dead code.
 */
export default function LandingPage({ onGuestMode }: LandingPageProps) {
  const { t } = useLanguage();
  const { login, signup, loginWithGoogle, isLoading, authError, clearAuthError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isSignUp) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };
  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isLoading) return;
    setError("");
    clearAuthError();
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      // On success the auth listener swaps this card for the upload view.
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 md:py-16">
      <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16 mb-12 lg:mb-16">
        {/* Hero Text (Left Side) */}
        <div className="flex-1 text-center lg:text-left mb-8 lg:mb-0">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-[var(--text-primary)] mb-6 tracking-tight leading-tight"
          >
            {t('heroTitlePart1')} <br className="hidden lg:block" />
            <span className="text-[#8AB4F8]">{t('heroTitlePart2')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto lg:mx-0"
          >
            {t('heroSubtitle')}
          </motion.p>
        </div>

        {/* Auth or Upload Section (Right Side) */}
        <div className="w-full max-w-sm shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
                key="signin"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-sm mx-auto bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-3xl shadow-2xl"
              >
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    {isSignUp ? t('createAccount') : t('welcomeBack')}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {isSignUp ? t('signUpDesc') : t('signInDesc')}
                  </p>
                </div>

                {(error || authError) && (
                  <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-xs p-3 rounded-xl mb-4 text-center">
                    <p>{error || authError}</p>
                    {typeof window !== 'undefined' && window.self !== window.top && (
                      <div className="mt-2 pt-2 border-t border-red-400/20">
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8AB4F8] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{t('openInNewTabToSignIn')}</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading || isGoogleLoading}
                  aria-busy={isGoogleLoading}
                  className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-xs cursor-pointer"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  ) : (
                    <GoogleIcon className="w-5 h-5" />
                  )}
                  <span>{t('googleSignIn')}</span>
                </button>

                <div className="flex items-center gap-3 my-4" aria-hidden="true">
                  <span className="h-px flex-1 bg-[var(--border-color)]" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                    {t('orUseEmail')}
                  </span>
                  <span className="h-px flex-1 bg-[var(--border-color)]" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {isSignUp && (
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 ml-1">
                        {t('fullName')}
                      </label>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 ml-1">
                      {t('emailAddress')}
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 ml-1">
                      {t('password')}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[var(--bg-accent)] border border-[var(--border-color)] rounded-xl pl-4 pr-11 py-2.5 text-[var(--text-primary)] placeholder:text-gray-600 focus:outline-none focus:border-[#8AB4F8] transition-colors text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#8AB4F8] text-gray-900 font-bold py-3 rounded-xl hover:bg-[#AECBFA] transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-2 cursor-pointer shadow-xs"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isSignUp ? (
                      t('signUp')
                    ) : (
                      t('signIn')
                    )}
                  </button>
                </form>

                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={onGuestMode}
                    className="w-full bg-[var(--bg-accent)] text-[var(--text-primary)] font-bold py-2.5 rounded-xl hover:bg-[var(--card-hover)] transition-all flex items-center justify-center gap-3 border border-[var(--border-color)] text-xs cursor-pointer shadow-xs"
                  >
                    {t('guestMode')}
                  </button>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                      clearAuthError();
                    }}
                    className="text-sm text-[var(--text-secondary)] hover:text-[#8AB4F8] transition-colors"
                  >
                    {isSignUp
                      ? t('alreadyHaveAccount')
                      : t('dontHaveAccount')}
                  </button>
                </div>
              </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mt-12 md:mt-16">
        <FeatureCard
          icon={<FileText className="w-5 h-5 text-[#8AB4F8]" />}
          title={t('feature1Title')}
          description={t('feature1Desc')}
        />
        <FeatureCard
          icon={<Timer className="w-5 h-5 text-[#8AB4F8]" />}
          title={t('feature2Title')}
          description={t('feature2Desc')}
        />
        <FeatureCard
          icon={<Sparkles className="w-5 h-5 text-[#8AB4F8]" />}
          title={t('feature3Title')}
          description={t('feature3Desc')}
        />
      </div>
    </div>
  );
}
