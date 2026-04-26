'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth/AuthShell';
import { ThemedText } from '@/components/ui/ThemedText';
import { buildRegisterRequest, fetchCurrentUser, registerUser, type AuthUser } from '@/lib/auth';
import { ROUTES } from '@/lib/routes';
import { getAccessToken } from '@/lib/session';

type GenderOption = 'Female' | 'Male' | 'Custom';

const GENDER_OPTIONS: GenderOption[] = ['Female', 'Male', 'Custom'];

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
          Stay in touch
        </ThemedText>
        <ThemedText as="h2" className="mt-4 text-[26px] font-bold leading-8 text-slate-900 md:text-5xl md:leading-[56px]">
          Connect with the people and moments that matter.
        </ThemedText>
        <ThemedText as="p" className="mt-3 max-w-[460px] text-sm leading-6 text-slate-600 md:text-lg md:leading-8">
          <span className="md:hidden">Catch up fast with the people you care about most.</span>
          <span className="hidden md:inline">A calm place to catch up, share updates, and keep your close circle only one tap away.</span>
        </ThemedText>
      </div>

      <div className="relative z-10 mt-5 gap-3 md:mt-16 md:h-[280px]">
        <div className="rounded-[24px] border border-[#C9DCFB] bg-white/85 px-4 py-4 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <ThemedText as="p" className="text-xs font-semibold uppercase tracking-[1.6px] text-[#1877F2]">
                Shared today
              </ThemedText>
              <ThemedText as="p" className="mt-1 text-xl font-bold text-slate-900">
                24 stories
              </ThemedText>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-full bg-[#D7E7FF]" />
              <div className="h-8 w-8 rounded-full bg-[#9EC5FF]" />
            </div>
          </div>
          <ThemedText as="p" className="mt-2 text-sm text-slate-600">
            Catch up in a lighter, faster feed with your close circle.
          </ThemedText>
        </div>

        <div className="hidden md:block">
          <div className="absolute left-0 top-8 w-[240px] -rotate-6 rounded-[28px] border border-white/70 bg-white px-5 py-4 shadow-sm shadow-sky-200">
            <ThemedText type="defaultSemiBold">Friends online</ThemedText>
            <ThemedText as="p" className="mt-2 text-slate-600">
              See new photos, replies, and quick updates from your favorite people.
            </ThemedText>
          </div>

          <div className="absolute right-8 top-0 w-[250px] rotate-6 rounded-[28px] border border-slate-200 bg-slate-900 px-5 py-4 shadow-sm shadow-slate-300">
            <ThemedText as="p" className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-400">
              Shared today
            </ThemedText>
            <ThemedText as="p" className="mt-3 text-2xl font-bold text-white">
              24 stories
            </ThemedText>
            <ThemedText as="p" className="mt-2 text-slate-300">
              Fresh moments from family, classmates, and your local community.
            </ThemedText>
          </div>

          <div className="absolute bottom-0 left-24 w-[280px] rounded-[28px] border border-[#C9DCFB] bg-[#DCEAFF] px-5 py-4">
            <ThemedText type="defaultSemiBold" className="text-slate-900">
              Message, react, and plan together.
            </ThemedText>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-white/90 px-4 py-3">
                <ThemedText as="p" className="text-sm text-slate-700">
                  Dinner on Friday? I can bring dessert.
                </ThemedText>
              </div>
              <div className="ml-auto w-fit rounded-2xl bg-[#1877F2] px-4 py-3">
                <ThemedText as="p" className="text-sm text-white">
                  Perfect, see you at 7.
                </ThemedText>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<GenderOption>('Female');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace(ROUTES.home);
    }
  }, [router]);

  function clearErrorOnChange() {
    if (errorMessage) {
      setErrorMessage(null);
    }
  }

  async function handleRegister() {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const payload = buildRegisterRequest({
        contact,
        password,
        firstName,
        lastName,
        birthDate,
        gender,
      });
      await registerUser(payload);
      const currentUser = await fetchCurrentUser();
      setSuccessUser(currentUser);
      router.replace(ROUTES.home);
    } catch (error: unknown) {
      setSuccessUser(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account right now');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      promo={<PromoPanel />}
      card={
        <section className="w-full rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200 md:min-h-[736px] md:max-w-[420px] md:px-8 md:py-9">
          <ThemedText type="eyebrow">Get started</ThemedText>
          <ThemedText as="h1" className="mt-2 text-[28px] font-bold leading-8 text-slate-900 md:mt-3 md:text-[30px] md:leading-9">
            Create your account
          </ThemedText>
          <ThemedText as="p" className="mt-2 text-sm leading-6 text-slate-600 md:mt-3 md:text-base md:leading-6">
            Start with the essentials and shape your profile as you go.
          </ThemedText>

          <div className="mt-5 grid gap-4 md:mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                onChange={(event) => {
                  setFirstName(event.target.value);
                  clearErrorOnChange();
                }}
                placeholder="First name"
                value={firstName}
              />
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
                onChange={(event) => {
                  setLastName(event.target.value);
                  clearErrorOnChange();
                }}
                placeholder="Last name"
                value={lastName}
              />
            </div>

            <input
              autoCapitalize="none"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChange={(event) => {
                setContact(event.target.value);
                clearErrorOnChange();
              }}
              placeholder="Email or mobile number"
              value={contact}
            />

            <input
              autoCapitalize="none"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChange={(event) => {
                setPassword(event.target.value);
                clearErrorOnChange();
              }}
              placeholder="Password"
              type="password"
              value={password}
            />

            <input
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChange={(event) => {
                setBirthDate(event.target.value);
                clearErrorOnChange();
              }}
              placeholder="Date of birth (DD/MM/YYYY or YYYY-MM-DD)"
              value={birthDate}
            />

            <div className="space-y-3">
              <ThemedText type="defaultSemiBold">Gender</ThemedText>
              <div className="flex flex-wrap gap-3">
                {GENDER_OPTIONS.map((option) => {
                  const selected = gender === option;

                  return (
                    <button
                      key={option}
                      className={`rounded-2xl border px-4 py-3 font-semibold ${selected ? 'border-[#1877F2] bg-[#EAF2FF] text-[#1877F2]' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                      onClick={() => setGender(option)}
                      type="button"
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            className={`mt-4 w-full rounded-2xl bg-[#1877F2] px-4 py-4 text-base font-semibold text-white md:mt-5 ${isSubmitting ? 'opacity-70' : ''}`}
            disabled={isSubmitting}
            onClick={handleRegister}
            type="button"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>

          {errorMessage ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <ThemedText as="p" className="text-sm font-semibold text-rose-700">
                {errorMessage}
              </ThemedText>
            </div>
          ) : null}

          {successUser ? (
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <ThemedText as="p" className="text-sm font-semibold text-emerald-700">
                Account created for {successUser.first_name} {successUser.last_name}
              </ThemedText>
              <ThemedText as="p" className="mt-1 text-sm text-emerald-700">
                {successUser.email ?? successUser.phone}
              </ThemedText>
            </div>
          ) : null}

          <div className="mt-4 text-center">
            <Link className="text-sm font-semibold text-[#1877F2]" href={ROUTES.login}>
              Already have an account? Log in
            </Link>
          </div>
        </section>
      }
    />
  );
}
