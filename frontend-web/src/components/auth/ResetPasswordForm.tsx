'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { ThemedText } from '@/components/ui/ThemedText';
import { buildResetPasswordRequest, resetPassword } from '@/lib/auth';
import { useToast } from '@/hooks/useToast';
import { ROUTES } from '@/lib/routes';

function PromoPanel() {
  return (
    <>
      <div className="relative z-10 max-w-[520px]">
        <div className="inline-flex rounded-full bg-[#1877F2] px-4 py-2">
          <ThemedText as="span" className="text-sm font-bold lowercase tracking-[1px] text-white">
            f
          </ThemedText>
        </div>
        <ThemedText as="p" className="mt-6 text-sm font-semibold uppercase tracking-[2px] text-[#1877F2]">
          Password reset
        </ThemedText>
        <ThemedText as="h2" className="mt-4 text-[26px] font-bold leading-8 text-slate-900 md:text-5xl md:leading-[56px]">
          Set a new password and get back in.
        </ThemedText>
        <ThemedText as="p" className="mt-3 max-w-[460px] text-sm leading-6 text-slate-600 md:text-lg md:leading-8">
          Choose a strong password with at least 8 characters to protect your account.
        </ThemedText>
      </div>

      <div className="relative z-10 mt-5 gap-3 md:mt-16 md:h-[280px]">
        <div className="rounded-[24px] border border-[#C9DCFB] bg-white/85 px-4 py-4 md:hidden">
          <ThemedText as="p" className="text-xs font-semibold uppercase tracking-[1.6px] text-[#1877F2]">
            Secure account
          </ThemedText>
          <ThemedText as="p" className="mt-1 text-xl font-bold text-slate-900">
            Set a strong new password
          </ThemedText>
          <ThemedText as="p" className="mt-2 text-sm text-slate-600">
            Use at least 8 characters and avoid common words.
          </ThemedText>
        </div>

        <div className="hidden md:block">
          <div className="absolute left-0 top-8 w-[240px] -rotate-6 rounded-[28px] border border-white/70 bg-white px-5 py-4 shadow-sm shadow-sky-200">
            <ThemedText type="defaultSemiBold">Security tip</ThemedText>
            <ThemedText as="p" className="mt-2 text-slate-600">
              Use a unique password you do not reuse on other services.
            </ThemedText>
          </div>

          <div className="absolute right-8 top-0 w-[250px] rotate-6 rounded-[28px] border border-slate-200 bg-slate-900 px-5 py-4 shadow-sm shadow-slate-300">
            <ThemedText as="p" className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-400">
              Step 2
            </ThemedText>
            <ThemedText as="p" className="mt-3 text-2xl font-bold text-white">
              Create password
            </ThemedText>
            <ThemedText as="p" className="mt-2 text-slate-300">
              Confirm the same password before submitting.
            </ThemedText>
          </div>

          <div className="absolute bottom-0 left-24 w-[280px] rounded-[28px] border border-[#C9DCFB] bg-[#DCEAFF] px-5 py-4">
            <ThemedText type="defaultSemiBold" className="text-slate-900">
              You can sign in right away after reset succeeds.
            </ThemedText>
          </div>
        </div>
      </div>
    </>
  );
}

type ResetPasswordFormProps = {
  token?: string;
};

export function ResetPasswordForm({ token = '' }: ResetPasswordFormProps) {
  const resolvedToken = token;
  const router = useRouter();
  const toast = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!resolvedToken) {
      setErrorMessage('Missing reset token');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const payload = buildResetPasswordRequest(resolvedToken, newPassword);
      const response = await resetPassword(payload);
      const message = response.message?.trim() || 'Password reset successfully';
      toast.success(message);
      router.replace(ROUTES.home);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reset password right now');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      promo={<PromoPanel />}
      card={
        <section className="w-full rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200 md:min-h-[736px] md:max-w-[420px] md:px-8 md:py-9">
          <ThemedText type="eyebrow">Reset password</ThemedText>
          <ThemedText as="h1" className="mt-2 text-[28px] font-bold leading-8 text-slate-900 md:mt-3 md:text-[30px] md:leading-9">
            Create a new password
          </ThemedText>
          <ThemedText as="p" className="mt-2 text-sm leading-6 text-slate-600 md:mt-3 md:text-base md:leading-6">
            Enter your new password below, then confirm it to finish the reset.
          </ThemedText>

          <div className="mt-5 grid gap-4 md:mt-6">
            <input
              autoCapitalize="none"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChange={(event) => {
                setNewPassword(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              placeholder="New password"
              type="password"
              value={newPassword}
            />
            <input
              autoCapitalize="none"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              placeholder="Confirm new password"
              type="password"
              value={confirmPassword}
            />
          </div>

          <button
            className={`mt-4 w-full rounded-2xl bg-[#1877F2] px-4 py-4 text-base font-semibold text-white md:mt-5 ${isSubmitting ? 'opacity-70' : ''}`}
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? 'Saving password...' : 'Reset password'}
          </button>

          {errorMessage ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <ThemedText as="p" className="text-sm font-semibold text-rose-700">
                {errorMessage}
              </ThemedText>
            </div>
          ) : null}

          {!resolvedToken ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <ThemedText as="p" className="text-sm font-semibold text-amber-700">
                Invalid reset link. Please request a new one.
              </ThemedText>
            </div>
          ) : null}

          <div className="mt-4 text-center">
            <Link className="text-sm font-semibold text-[#1877F2]" href={ROUTES.login}>
              Back to login
            </Link>
          </div>

          <div className="mt-1 text-center">
            <Link className="text-sm font-semibold text-[#1877F2]" href={ROUTES.forgotPassword}>
              Request another reset link
            </Link>
          </div>
        </section>
      }
    />
  );
}
