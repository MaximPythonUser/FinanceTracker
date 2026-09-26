import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';

const TABS = [
  { id: 'login', label: 'Вход' },
  { id: 'register', label: 'Регистрация' },
];

// Небольшая демо-задержка, чтобы состояние загрузки (спиннер) было видно,
// когда колбэки onLogin / onRegister не переданы.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Форма входа и регистрации для Finance Tracker.
 *
 * @param {Object} props
 * @param {(values: {email: string, password: string}) => Promise<void>|void} [props.onLogin]
 * @param {(values: {email: string, password: string}) => Promise<void>|void} [props.onRegister]
 */
export default function AuthForm({ onLogin, onRegister }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // При смене таба сбрасываем ошибку, состояние загрузки и видимость пароля.
  useEffect(() => {
    setError('');
    setIsSubmitting(false);
    setShowPassword(false);
  }, [mode]);

  const isLogin = mode === 'login';
  const title = isLogin ? 'Вход по паролю' : 'Регистрация по email';
  const submitLabel = isLogin ? 'Войти' : 'Создать аккаунт';
  const note = isLogin
    ? 'Используйте email и пароль, заданный при регистрации.'
    : 'Для регистрации потребуется одно подтверждение по email.';

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (onLogin && isLogin) {
        await onLogin({ email, password });
      } else if (onRegister && !isLogin) {
        await onRegister({ email, password });
      } else {
        // Демо-режим: имитация сетевого запроса.
        await wait(1200);
      }
    } catch (err) {
      setError(err?.message || 'Произошла ошибка. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClasses = [
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-3',
    'text-[15px] text-[#333] outline-none transition-all duration-200',
    'placeholder:text-gray-400',
    'focus:border-[#1A2B23] focus:ring-4 focus:ring-[#1A2B23]/10',
  ].join(' ');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6F5] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-xl sm:p-8"
      >
        {/* Логотип */}
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <span className="font-bold tracking-[0.15em] text-[#1A2B23]">
            FT<span className="text-gray-400">/</span>01
          </span>
        </div>

        {/* Заголовок */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-7 text-2xl font-semibold tracking-tight text-[#333]"
          >
            {title}
          </motion.h2>
        </AnimatePresence>

        {/* Сегментированный контрол вкладок */}
        <div className="mt-6 flex rounded-full bg-gray-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`relative flex-1 overflow-hidden rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === tab.id ? 'text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {mode === tab.id && (
                <motion.span
                  layoutId="auth-tab-pill"
                  className="absolute inset-0 rounded-full bg-[#1A2B23]"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-gray-500">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1.5 block text-sm font-medium text-gray-500">
              Пароль
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                className={`${inputClasses} pr-12`}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                aria-pressed={showPassword}
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#1A2B23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A2B23]/30"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={showPassword ? 'hide' : 'show'}
                    initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.5, rotate: 30, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Ошибка */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-sm text-red-500"
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Кнопка отправки */}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A2B23] py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#253a2e] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isSubmitting ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 size={18} className="animate-spin" />
                  Отправка…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  {submitLabel}
                  <ArrowRight size={18} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>

        {/* Подвал формы */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-6 text-center text-xs text-gray-500"
          >
            {note}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}