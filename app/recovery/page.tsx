"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecoveryPageRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
    </div>
  );
}
