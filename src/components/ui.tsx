import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Small set of accessible, AA-contrast UI primitives shared across the app.
 * Interactive targets are >= 44px for comfortable touch use on tablets.
 */

const base =
  'inline-flex items-center justify-center gap-2 min-h-touch rounded-md px-4 py-2 text-base font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed';

const variants = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary:
    'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  danger: 'bg-red-700 text-white hover:bg-red-800',
} as const;

type Variant = keyof typeof variants;

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeading({ children }: { children: ReactNode }) {
  return <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>;
}

/** Accessible status banner. `role` chooses politeness. */
export function Banner({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error';
  children: ReactNode;
}) {
  const tones = {
    info: 'bg-brand-50 text-brand-900 border-brand-200',
    success: 'bg-green-50 text-green-900 border-green-300',
    error: 'bg-red-50 text-red-900 border-red-300',
  } as const;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-md border px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

/** Labelled text field with programmatically-associated error (WCAG 3.3.1/1.3.1). */
export function Field({
  label,
  name,
  error,
  hint,
  ...props
}: ComponentProps<'input'> & { label: string; error?: string; hint?: string }) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errId = error ? `${name}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium">
        {label}
        {props.required && <span aria-hidden="true" className="text-red-700"> *</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      )}
      <input
        id={name}
        name={name}
        aria-describedby={[hintId, errId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        className="min-h-touch rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
        {...props}
      />
      {error && (
        <p id={errId} className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
