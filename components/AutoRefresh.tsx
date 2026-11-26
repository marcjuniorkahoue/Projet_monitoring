"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Relit les données toutes les 30 secondes, sans recharger la page
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}