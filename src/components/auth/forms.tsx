"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { IconInfo } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n";
import {
  extractSessionToken,
  requestPasswordReset,
  resetPassword,
  safeNextPath,
  signIn,
  signUp,
  storeSessionToken,
} from "@/lib/auth-client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isServerError(error: unknown): string | null {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "");
    if (message) return message;
  }
  return null;
}

/* ── Login ─────────────────────────────────────────────────────────────── */

export function LoginForm({ next }: { next?: string }) {
  const dict = getDictionary();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const destination = safeNextPath(next);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setEmailError(undefined);

    if (!EMAIL_PATTERN.test(email)) {
      setEmailError(dict.auth.register.emailInvalid);
      return;
    }

    setLoading(true);
    try {
      signIn.email(
        { email, password },
        {
          onSuccess: (ctx) => {
            // Guarda el token Bearer como respaldo (cookies bloqueadas en iframe).
            storeSessionToken(extractSessionToken(ctx));
            window.location.href = destination;
          },
          onError: (ctx) => {
            setLoading(false);
            const message = ctx?.error?.message ?? "";
            // Mensajes de infraestructura se muestran tal cual (ayudan a depurar);
            // errores de credenciales se muestran con el texto seguro del diccionario.
            if (/origin|csrf|network|fetch/i.test(message)) {
              setError(message);
            } else {
              setError(dict.auth.login.invalidCredentials);
            }
          },
        },
      );
    } catch {
      // Nunca dejar el botón "trabado" ante una excepción inesperada.
      setLoading(false);
      setError(dict.auth.errors.generic);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert variant="danger" title={error} /> : null}
      <Input
        label={dict.auth.login.email}
        type="email"
        autoComplete="email"
        placeholder={dict.auth.login.emailPlaceholder}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={emailError}
        required
      />
      <div className="flex flex-col gap-1.5">
        <Input
          label={dict.auth.login.password}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Link
          href="/forgot-password"
          className="self-end text-xs font-bold text-primary-700 hover:text-primary-hover"
        >
          {dict.auth.login.forgot}
        </Link>
      </div>
      <Button type="submit" loading={loading} fullWidth>
        {dict.auth.login.submit}
      </Button>
      <p className="text-center text-xs text-muted">
        {dict.auth.login.noAccount}{" "}
        <Link
          href={`/register${next ? `?next=${encodeURIComponent(destination)}` : ""}`}
          className="font-bold text-primary-700 hover:text-primary-hover"
        >
          {dict.auth.login.register}
        </Link>
      </p>
    </form>
  );
}

/* ── Registro ──────────────────────────────────────────────────────────── */

export function RegisterForm({ next }: { next?: string }) {
  const dict = getDictionary();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const destination = safeNextPath(next);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = dict.auth.register.nameRequired;
    if (!EMAIL_PATTERN.test(email)) errors.email = dict.auth.register.emailInvalid;
    if (password.length < 8) errors.password = dict.auth.register.passwordMin;
    if (confirm !== password) errors.confirm = dict.auth.register.passwordMismatch;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    signUp.email(
      { name: name.trim(), email, password },
      {
        onSuccess: (ctx) => {
          storeSessionToken(extractSessionToken(ctx));
          window.location.href = destination;
        },
        onError: (ctx) => {
          setLoading(false);
          const message = ctx?.error?.message ?? "";
          if (/exist|already|taken/i.test(message)) {
            setError(dict.auth.register.emailTaken);
          } else if (message) {
            setError(message);
          } else {
            setError(dict.auth.errors.generic);
          }
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? <Alert variant="danger" title={error} /> : null}
      <Input
        label={dict.auth.register.name}
        autoComplete="name"
        placeholder={dict.auth.register.namePlaceholder}
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
        required
      />
      <Input
        label={dict.auth.register.email}
        type="email"
        autoComplete="email"
        placeholder={dict.auth.register.emailPlaceholder}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
        required
      />
      <Input
        label={dict.auth.register.password}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        hint={dict.auth.register.passwordMin}
        required
      />
      <Input
        label={dict.auth.register.confirm}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={fieldErrors.confirm}
        required
      />
      <Button type="submit" loading={loading} fullWidth>
        {dict.auth.register.submit}
      </Button>
      <p className="text-center text-xs text-muted">
        {dict.auth.register.hasAccount}{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(destination)}` : ""}`}
          className="font-bold text-primary-700 hover:text-primary-hover"
        >
          {dict.auth.register.login}
        </Link>
      </p>
    </form>
  );
}

/* ── Recuperación ──────────────────────────────────────────────────────── */

export function ForgotForm() {
  const dict = getDictionary();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setEmailError(undefined);

    if (!EMAIL_PATTERN.test(email)) {
      setEmailError(dict.auth.register.emailInvalid);
      return;
    }

    setLoading(true);
    requestPasswordReset(
      { email, redirectTo: `${window.location.origin}/reset-password` },
      {
        onSuccess: async () => {
          setSent(true);
          setLoading(false);
          if (process.env.NEXT_PUBLIC_AUTH_DEV_RESET === "true") {
            try {
              const response = await fetch(
                `/api/auth/dev/reset-link?email=${encodeURIComponent(email)}`,
              );
              if (response.ok) {
                const data = (await response.json()) as { link: string | null };
                setDevLink(data.link);
              }
            } catch {
              setDevLink(null);
            }
          }
        },
        onError: () => {
          setLoading(false);
          setError(dict.auth.errors.generic);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sent ? (
        <>
          <Alert variant="success" title={dict.auth.forgot.sent} />
          {devLink ? (
            <div className="rounded-xl border border-info/25 bg-info-soft p-4">
              <p className="flex items-center gap-2 text-xs font-bold text-info-strong">
                <IconInfo size={14} />
                {dict.auth.forgot.devTitle}
              </p>
              <p className="mt-1 text-xs text-muted">{dict.auth.forgot.devDescription}</p>
              <a
                href={devLink}
                className="mt-2 block break-all rounded-lg bg-elevated p-2.5 font-mono text-[11px] text-primary-700 underline"
              >
                {devLink}
              </a>
            </div>
          ) : null}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {error ? <Alert variant="danger" title={error} /> : null}
          <Input
            label={dict.auth.forgot.email}
            type="email"
            autoComplete="email"
            placeholder={dict.auth.login.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={emailError}
            required
          />
          <Button type="submit" loading={loading} fullWidth>
            {dict.auth.forgot.submit}
          </Button>
        </form>
      )}
      <Link
        href="/login"
        className="text-center text-xs font-bold text-primary-700 hover:text-primary-hover"
      >
        {dict.auth.forgot.back}
      </Link>
    </div>
  );
}

/* ── Restablecimiento ──────────────────────────────────────────────────── */

export function ResetForm({ token }: { token: string }) {
  const dict = getDictionary();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (password.length < 8) errors.password = dict.auth.register.passwordMin;
    if (confirm !== password) errors.confirm = dict.auth.register.passwordMismatch;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    resetPassword(
      { newPassword: password, token },
      {
        onSuccess: () => {
          setLoading(false);
          setSuccess(true);
        },
        onError: () => {
          setLoading(false);
          setError(dict.auth.reset.invalidToken);
        },
      },
    );
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="success" title={dict.auth.reset.success} />
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-50 shadow-sm transition-colors hover:bg-primary-hover"
        >
          {dict.auth.reset.goToLogin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? (
        <Alert
          variant="danger"
          title={error}
          action={
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-primary-700 hover:text-primary-hover"
            >
              {dict.auth.forgot.title}
            </Link>
          }
        />
      ) : null}
      <Input
        label={dict.auth.reset.newPassword}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldErrors.password}
        hint={dict.auth.register.passwordMin}
        required
      />
      <Input
        label={dict.auth.reset.confirm}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        error={fieldErrors.confirm}
        required
      />
      <Button type="submit" loading={loading} fullWidth>
        {dict.auth.reset.submit}
      </Button>
    </form>
  );
}
