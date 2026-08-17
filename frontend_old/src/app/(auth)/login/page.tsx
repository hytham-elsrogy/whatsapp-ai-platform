'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

interface LoginForm {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password, data.twoFactorCode);
      if (result?.requires2FA) {
        setRequires2FA(true);
        toast('يرجى إدخال رمز المصادقة الثنائية', { icon: '🔐' });
      } else if (result?.success) {
        toast.success('تم تسجيل الدخول بنجاح');
        router.replace('/dashboard');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'خطأ في تسجيل الدخول');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] p-4">
      <div className="bg-white dark:bg-[#1f2c33] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#075E54] dark:bg-[#0b141a] p-8 text-center">
          <div className="w-20 h-20 bg-[#25D366] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <MessageCircle className="w-11 h-11 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">WhatsApp CRM</h1>
          <p className="text-[#a0c3bb] text-sm">نظام إدارة محادثات المؤسسات</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6 text-center">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                البريد الإلكتروني
              </label>
              <input
                {...register('email', {
                  required: 'البريد الإلكتروني مطلوب',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'بريد إلكتروني غير صحيح' },
                })}
                type="email"
                autoComplete="email"
                placeholder="example@company.com"
                dir="ltr"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111b21] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition placeholder:text-gray-400 text-left"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'كلمة المرور مطلوبة',
                    minLength: { value: 6, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111b21] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {requires2FA && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رمز المصادقة الثنائية (2FA)
                </label>
                <input
                  {...register('twoFactorCode', { required: requires2FA ? 'الرمز مطلوب' : false })}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#111b21] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition text-center tracking-widest text-xl"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 bg-[#25D366] hover:bg-[#20ba5a] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  جاري تسجيل الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6">
            WhatsApp CRM v1.0 &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
