import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type DragEvent,
} from "react";
import {
  Upload,
  FileText,
  Timer,
  Sparkles,
  LogIn,
  Loader2,
  Link2,
  Type,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import FeatureCard from "./FeatureCard";
import { SUBJECTS, subjectLabelKey } from "../lib/subjects";

interface LandingPageProps {
  onUpload: (file: File, subject: string, grade?: string) => Promise<void>;
  onProcessText: (
    text: string,
    subject: string,
    grade?: string,
  ) => Promise<void>;
  isParsing: boolean;
  currentUser: any;
  onGuestMode: () => void;
  key?: string;
}

export default function LandingPage({
  onUpload,
  onProcessText,
  isParsing,
  currentUser,
  onGuestMode,
}: LandingPageProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { login, signup, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("General");
  const [inputMethod, setInputMethod] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");

  const subjects = SUBJECTS;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!selectedSubject) {
        setError("Please select a subject first.");
        return;
      }
      onUpload(file, selectedSubject);
    }
  };

  const handlePastedTextSubmit = () => {
    if (!selectedSubject) {
      setError("Please select a subject first.");
      return;
    }
    if (!pastedText.trim()) {
      setError("Please paste some text.");
      return;
    }
    onProcessText(pastedText, selectedSubject);
  };

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
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!selectedSubject) {
        setError("Please select a subject first.");
        return;
      }
      onUpload(file, selectedSubject);
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
            {!currentUser ? (
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

                {error && (
                  <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-xs p-3 rounded-xl mb-4 text-center">
                    <p>{error}</p>
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
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm text-[var(--text-secondary)] hover:text-[#8AB4F8] transition-colors"
                  >
                    {isSignUp
                      ? t('alreadyHaveAccount')
                      : t('dontHaveAccount')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.2 }}
                className="max-w-2xl mx-auto"
              >
                <div className="mb-8">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 text-center">
                    Input Method
                  </label>
                  <div className="flex justify-center mb-8">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-1 inline-flex">
                      <button
                        onClick={() => {
                          setInputMethod("file");
                          setError("");
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          inputMethod === "file"
                            ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        Upload File
                      </button>
                      <button
                        onClick={() => {
                          setInputMethod("paste");
                          setError("");
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                          inputMethod === "paste"
                            ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <Type className="w-4 h-4" />
                        Paste Text
                      </button>
                    </div>
                  </div>

                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 text-center">
                    Select Subject
                  </label>
                  <div className="flex flex-wrap justify-center gap-3">
                    {subjects.map((subject) => (
                      <button
                        key={subject}
                        onClick={() => {
                          setSelectedSubject(subject);
                          setError("");
                        }}
                        className={`px-6 py-2 rounded-full text-sm font-medium transition-all border ${
                          selectedSubject === subject
                            ? "bg-[#8AB4F8] text-gray-900 border-[#8AB4F8]"
                            : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-gray-500"
                        }`}
                      >
                        {t(subjectLabelKey(subject) as any)}
                      </button>
                    ))}
                  </div>
                </div>

                {inputMethod === "file" ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (selectedSubject && fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    className={`relative min-h-[160px] sm:min-h-[200px] h-48 sm:h-56 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 ${
                      isParsing
                        ? "border-[#8AB4F8] bg-[#8AB4F8]/5"
                        : "border-[var(--border-color)] hover:border-gray-500 bg-[var(--bg-secondary)]/50"
                    } ${!selectedSubject ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.md,.txt"
                      disabled={!selectedSubject}
                    />

                    <div className="bg-white/5 p-3 sm:p-4 rounded-full mb-3 sm:mb-4">
                      <Upload
                        className={`w-6 h-6 sm:w-8 sm:h-8 ${isParsing ? "text-[#8AB4F8] animate-bounce" : "text-[var(--text-secondary)]"}`}
                      />
                    </div>

                    <h3 className="text-lg sm:text-xl font-medium text-[var(--text-primary)] mb-1 sm:mb-2">
                      {isParsing
                        ? "Analyzing Document..."
                        : "Drag and drop your exam file here"}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-4 sm:mb-6 text-center px-4">
                      {!selectedSubject
                        ? "Please select a subject above first"
                        : "Supports PDF, Markdown (.md), or Plain Text (.txt)"}
                    </p>

                    {!isParsing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedSubject && fileInputRef.current) {
                            fileInputRef.current.value = '';
                            fileInputRef.current.click();
                          }
                        }}
                        disabled={!selectedSubject}
                        className={`bg-[#8AB4F8] text-gray-900 font-medium rounded-full px-6 sm:px-8 py-2 sm:py-2.5 text-xs sm:text-sm transition-all shadow-lg shadow-[#8AB4F8]/10 ${
                          !selectedSubject
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[#AECBFA]"
                        }`}
                      >
                        Browse Files
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      disabled={isParsing || !selectedSubject}
                      placeholder={
                        !selectedSubject
                          ? "Please select a subject above first"
                          : "Paste your exam text or Markdown here..."
                      }
                      className={`w-full min-h-[160px] sm:min-h-[200px] h-48 sm:h-56 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-3xl p-5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] resize-none focus:outline-none focus:border-[#8AB4F8] transition-colors ${
                        !selectedSubject ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                    {!isParsing && (
                      <button
                        onClick={handlePastedTextSubmit}
                        disabled={!selectedSubject || !pastedText.trim()}
                        className={`absolute bottom-4 right-4 sm:bottom-6 sm:right-6 bg-[#8AB4F8] text-gray-900 font-bold rounded-xl px-5 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm transition-all shadow-lg shadow-[#8AB4F8]/10 flex items-center gap-2 ${
                          !selectedSubject || !pastedText.trim()
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-[#AECBFA]"
                        }`}
                      >
                        Generate Exam
                        <Sparkles className="w-4 h-4" />
                      </button>
                    )}
                    {isParsing && (
                      <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-[#8AB4F8] animate-spin mb-4" />
                        <h3 className="text-xl font-medium text-[var(--text-primary)]">
                          Analyzing Text...
                        </h3>
                      </div>
                    )}
                  </div>
                )}
                {error && (
                  <p className="text-red-400 text-sm mt-4 text-center">
                    {error}
                  </p>
                )}
              </motion.div>
            )}
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
