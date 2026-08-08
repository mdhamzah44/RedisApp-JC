import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  requestPhoneOtp,
  signIn,
  signInWithGoogle,
  signUp,
  verifyPhoneOtp,
} from "@/lib/auth.functions";
import { cn } from "@/lib/utils";

const googleClientId = import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined;

/**
 * Phone OTP is temporarily disabled in the UI (Twilio isn't configured yet).
 * The server functions (requestPhoneOtp / verifyPhoneOtp) are untouched —
 * flip this back to true to bring the tab back once TWILIO_* is set.
 */
const PHONE_AUTH_ENABLED = false;

function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleClientId || !ref.current) return;
    const render = () => {
      const google = (window as unknown as { google?: any }).google;
      if (!google?.accounts?.id || !ref.current) return false;
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (res: { credential: string }) => onCredential(res.credential),
      });
      google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "continue_with",
      });
      return true;
    };
    if (render()) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => render();
    document.head.appendChild(script);
  }, [onCredential]);

  if (!googleClientId) return null;
  return (
    <div className="mt-4">
      <div ref={ref} className="flex justify-center" />
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

export function AuthDialog({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string;
}) {
  const qc = useQueryClient();
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState("");
  const [devCode, setDevCode] = useState("");

  const done = async (name: string) => {
    await qc.invalidateQueries();
    toast.success(`Welcome, ${name.split(" ")[0]}`);
    onOpenChange(false);
  };

  const loginM = useMutation({
    mutationFn: (v: { email: string; password: string }) => signIn({ data: v }),
    onSuccess: (u) => void done(u.name),
    onError: (e: Error) => toast.error(e.message),
  });
  const signupM = useMutation({
    mutationFn: (v: { name: string; email: string; phone: string; password: string }) =>
      signUp({ data: v }),
    onSuccess: (u) => void done(u.name),
    onError: (e: Error) => toast.error(e.message),
  });
  const googleM = useMutation({
    mutationFn: (credential: string) => signInWithGoogle({ data: { credential } }),
    onSuccess: (u) => void done(u.name),
    onError: (e: Error) => toast.error(e.message),
  });
  const otpRequestM = useMutation({
    mutationFn: (value: string) => requestPhoneOtp({ data: { phone: value } }),
    onSuccess: (r) => {
      setOtpSent(true);
      setDevCode(r.devCode ?? "");
      toast[r.sent ? "success" : "message"](
        r.sent ? "Code sent by SMS" : "SMS provider not configured — use the code shown below",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const otpVerifyM = useMutation({
    mutationFn: (code: string) => verifyPhoneOtp({ data: { phone, code } }),
    onSuccess: (u) => void done(u.name),
    onError: (e: Error) => toast.error(e.message),
  });

  const busy =
    loginM.isPending ||
    signupM.isPending ||
    googleM.isPending ||
    otpRequestM.isPending ||
    otpVerifyM.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Sign in to MakinItHome</DialogTitle>
          <DialogDescription>
            {reason ?? "Your orders, addresses and messages with makers live here."}
          </DialogDescription>
        </DialogHeader>

        <GoogleButton onCredential={(c) => googleM.mutate(c)} />

        <Tabs defaultValue="login">
          <TabsList
            className={cn("grid w-full", PHONE_AUTH_ENABLED ? "grid-cols-3" : "grid-cols-2")}
          >
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
            {PHONE_AUTH_ENABLED && <TabsTrigger value="phone">Phone</TabsTrigger>}
          </TabsList>

          <TabsContent value="login" className="pt-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                loginM.mutate({
                  email: String(f.get("email")),
                  password: String(f.get("password")),
                });
              }}
            >
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {loginM.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="pt-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                signupM.mutate({
                  name: String(f.get("name")),
                  email: String(f.get("email")),
                  phone: String(f.get("phone") ?? ""),
                  password: String(f.get("password")),
                });
              }}
            >
              <div>
                <Label htmlFor="su-name">Full name</Label>
                <Input id="su-name" name="name" required autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="su-phone">Mobile (optional)</Label>
                <Input id="su-phone" name="phone" inputMode="numeric" maxLength={10} />
              </div>
              <div>
                <Label htmlFor="su-password">Password</Label>
                <Input
                  id="su-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={busy}>
                {signupM.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Create
                account
              </Button>
            </form>
          </TabsContent>

          {PHONE_AUTH_ENABLED && (
            <TabsContent value="phone" className="pt-4">
              {!otpSent ? (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    otpRequestM.mutate(phone);
                  }}
                >
                  <div>
                    <Label htmlFor="otp-phone">Mobile number</Label>
                    <Input
                      id="otp-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="numeric"
                      placeholder="10-digit mobile"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full" disabled={busy}>
                    {otpRequestM.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Send
                    code
                  </Button>
                </form>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    otpVerifyM.mutate(String(f.get("code")));
                  }}
                >
                  <div>
                    <Label htmlFor="otp-code">6-digit code sent to {phone}</Label>
                    <Input id="otp-code" name="code" inputMode="numeric" maxLength={6} required />
                  </div>
                  {devCode && (
                    <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                      No SMS provider is configured, so here is your code: <b>{devCode}</b>
                    </p>
                  )}
                  <Button type="submit" className="w-full rounded-full" disabled={busy}>
                    {otpVerifyM.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}{" "}
                    Verify & continue
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setOtpSent(false)}
                  >
                    Change number
                  </Button>
                </form>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
