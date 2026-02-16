"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "@/lib/auth";

export type Profile = {
  full_name: string | null;
  major: string | null;
  interests: string[] | string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function isProfileComplete(p: Profile) {
  const interestsArr =
    Array.isArray(p.interests) ? p.interests : p.interests ? [p.interests] : [];
  return Boolean(p.full_name && p.major && interestsArr.length > 0);
}

export function useRequireProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.status === 401) {
          removeToken();
          router.replace("/login");
          return;
        }

        if (res.status === 404) {
          router.replace("/onboarding");
          return;
        }

        if (!res.ok) {
          // fallback: keep user safe
          router.replace("/login");
          return;
        }

        const data = (await res.json()) as Profile;

        if (!isProfileComplete(data)) {
          router.replace("/onboarding");
          return;
        }

        setProfile(data);
        setLoading(false);
      } catch (e) {
        router.replace("/login");
      }
    })();
  }, [router]);

  return { loading, profile };
}