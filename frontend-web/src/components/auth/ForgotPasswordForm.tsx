'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { ThemedText } from '@/components/ui/ThemedText';
import { buildForgotPasswordRequest, requestPasswordReset } from '@/lib/auth';
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
          Account support
        </ThemedText>
        <ThemedText as="h2" className="mt-4 text-[26px] font-bold leading-8 text-slate-900 md:text-5xl md:leading-[56px]">
          Recover your account quickly and securely.
        </ThemedText>
        <ThemedText as="p" className="mt-3 max-w-[460px] text-sm leading-6 text-slate-600 md:text-lg md:leading-8">
          Enter your email to receive a reset link and create a new password in a few steps.
        </ThemedText>
      </div>

      <div className="relative z-10 mt-5 gap-3 md:mt-16 md:h-[280px]">
        <div className="rounded-[24px] border border-[#C9DCFB] bg-white/85 px-4 py-4 md:hidden">
          <ThemedText as="p" className="text-xs font-semibold uppercase tracking-[1.6px] text-[#1877F2]">
            Recover access
          </ThemedText>
          <ThemedText as="p" className="mt-1 text-xl font-bold text-slate-900">
            Reset in 2 simple steps
          </ThemedText>
          <ThemedText as="p" className="mt-2 text-sm text-slate-600">
            Enter email, then follow the link sent to your inbox.
          </ThemedText>
        </div>

        <div className="hidden md:block">
          <div className="absolute left-0 top-8 w-[240px] -rotate-6 rounded-[28px] border border-white/70 bg-white px-5 py-4 shadow-sm shadow-sky-200">
            <ThemedText type="defaultSemiBold">Secure reset</ThemedText>
            <ThemedText as="p" className="mt-2 text-slate-600">
              Each reset link is time-limited to keep your account safe.
            </ThemedText>
          </div>

          <div className="absolute right-8 top-0 w-[250px] rotate-6 rounded-[28px] border border-slate-200 bg-slate-900 px-5 py-4 shadow-sm shadow-slate-300">
            <ThemedText as="p" className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-400">
              Step 1
            </ThemedText>
            <ThemedText as="p" className="mt-3 text-2xl font-bold text-white">
              Enter email
            </ThemedText>
            <ThemedText as="p" className="mt-2 text-slate-300">
              We will send a secure reset link to your inbox.
            </ThemedText>
          </div>

          <div className="absolute bottom-0 left-24 w-[280px] rounded-[28px] border border-[#C9DCFB] bg-[#DCEAFF] px-5 py-4">
            <ThemedText type="defaultSemiBold" className="text-slate-900">
              Step 2: Open the email and set a new password.
            </ThemedText>
          </div>
        </div>
      </div>
    </>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const payload = buildForgotPasswordRequest(email);
      const response = await requestPasswordReset(payload);
      setSuccessMessage(response.message);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send reset link right now');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      promo={<PromoPanel />}
      card={
        <section className="w-full rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200 md:min-h-[736px] md:max-w-[420px] md:px-8 md:py-9">
          <ThemedText type="eyebrow">Forgot password</ThemedText>
          <ThemedText as="h1" className="mt-2 text-[28px] font-bold leading-8 text-slate-900 md:mt-3 md:text-[30px] md:leading-9">
            Find your account
          </ThemedText>
          <ThemedText as="p" className="mt-2 text-sm leading-6 text-slate-600 md:mt-3 md:text-base md:leading-6">
            Enter your email address and we will send you a link to reset your password.
          </ThemedText>

          <div className="mt-5 grid gap-4 md:mt-6">
            <input
              autoCapitalize="none"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChange={(event) => {
                setEmail(event.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              placeholder="Email address"
              value={email}
            />
          </div>

          <button
            className={`mt-4 w-full rounded-2xl bg-[#1877F2] px-4 py-4 text-base font-semibold text-white md:mt-5 ${isSubmitting ? 'opacity-70' : ''}`}
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? 'Sending link...' : 'Send reset link'}
          </button>

          {errorMessage ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <ThemedText as="p" className="text-sm font-semibold text-rose-700">
                {errorMessage}
              </ThemedText>
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <ThemedText as="p" className="text-sm font-semibold text-emerald-700">
                {successMessage}
              </ThemedText>
            </div>
          ) : null}

          <div className="mt-4 text-center">
            <Link className="text-sm font-semibold text-[#1877F2]" href={ROUTES.login}>
              Back to login
            </Link>
          </div>
        </section>
      }
    />
  );
}
