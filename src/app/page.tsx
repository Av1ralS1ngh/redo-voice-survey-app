'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { createClient } from "@/lib/supabase-client";

const DEFAULT_EMAIL_REDIRECT = "https://voice-survey-app-three.vercel.app/projects";
const EMAIL_REDIRECT_URL = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_URL;
  if (fromEnv && /https?:\/\//.test(fromEnv) && !fromEnv.includes('localhost')) {
    return fromEnv;
  }
  return DEFAULT_EMAIL_REDIRECT;
})();

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && isMounted) {
        router.replace("/projects");
      }
    }
    checkSession();
    return () => {
      isMounted = false;
    };
  }, [router, supabase.auth]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: EMAIL_REDIRECT_URL,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        router.replace("/projects");
        router.refresh();
      } else {
        setSuccessMessage("Account created, please sign in.");
  setIsSignUp(false);
  setEmail("");
  setPassword("");
        setLoading(false);
      }

      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      router.replace("/projects");
      router.refresh();
    } else {
      setError("Unable to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <main className={`${inter.className} min-h-screen flex items-center justify-center bg-background text-foreground transition-colors duration-500 p-6`}>
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-6 w-6 text-white"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </span>
            <span className="text-2xl font-semibold">Pluve</span>
          </div>
          <h1 className="mt-6 text-4xl font-bold">AI-Powered Market Research</h1>
          <p className="mt-4 text-lg text-muted">
            Conduct intelligent, scalable research with AI-moderated interviews.
          </p>
        </div>
        <div>
          <div className="surface-card rounded-xl shadow-lg p-10 transition-colors duration-500">
            <h2 className="text-2xl font-semibold">{isSignUp ? "Create an account" : "Welcome back"}</h2>
            <p className="text-sm text-muted mt-2 mb-8">
              {isSignUp ? "Sign up to start your first AI-powered research project" : "Sign in to your researcher account"}
            </p>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2 text-foreground placeholder:text-muted focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-transparent px-4 py-2 text-foreground placeholder:text-muted focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">
                  {error}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-green-600">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                className="mt-8 w-full rounded-md bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? (isSignUp ? "Creating account..." : "Signing in...") : isSignUp ? "Sign up" : "Sign in"}
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-muted">
              {isSignUp ? "Already have an account?" : "New to Pluve?"}{" "}
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isSignUp;
                  setIsSignUp(nextMode);
                  setError(null);
                  setSuccessMessage(null);
                  setEmail("");
                  setPassword("");
                }}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
