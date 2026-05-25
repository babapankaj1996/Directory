"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const SIGNUP_INTENT_COOKIE = "signup_intent";
const OWNER_ADD_PROFILE_INTENT = "OWNER_ADD_PROFILE";

export function rememberAddProfileSignupIntent() {
  if (typeof document === "undefined") return;
  document.cookie = `${SIGNUP_INTENT_COOKIE}=${OWNER_ADD_PROFILE_INTENT}; path=/; max-age=900; SameSite=Lax`;
}

export function AddProfileSignupLink({
  children = "Add Your Profile",
  className,
  variant = "ghost"
}: {
  children?: ReactNode;
  className?: string;
  variant?: "primary" | "gold" | "ghost";
}) {
  return (
    <Button href="/signup" variant={variant} className={className} onClick={rememberAddProfileSignupIntent}>
      {children}
    </Button>
  );
}
