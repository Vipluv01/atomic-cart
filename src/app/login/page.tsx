"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) setError("Invalid email or password.");
    else router.push(callbackUrl);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Log in
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
