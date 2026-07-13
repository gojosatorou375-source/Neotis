import Link from "next/link";
import { ArrowLeft, Shield, Sparkles } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-[#0A0A0A] px-6 py-12 sm:px-10">
      <div className="mx-auto max-w-2xl bg-white dark:bg-[#121212] border-4 border-black dark:border-white p-8 sm:p-12 rounded-3xl shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)] transition-all">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border-2 border-black dark:border-white bg-[#B8FF33] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all duration-150"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10 text-center sm:text-left border-b-4 border-black dark:border-white pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white text-xs font-black uppercase tracking-widest mb-4">
            <Shield className="h-3.5 w-3.5" />
            Compliance & Privacy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black dark:text-white uppercase mb-2">
            Privacy Policy
          </h1>
          <p className="text-xs font-bold text-black/50 dark:text-white/50 uppercase tracking-widest">
            Last Updated: July 2026
          </p>
        </div>

        {/* Body Content */}
        <div className="space-y-8 text-black dark:text-white/90">
          <section>
            <h2 className="text-lg font-black uppercase tracking-wide border-b-2 border-black/10 dark:border-white/10 pb-2 mb-3">
              1. Overview & Local-First Philosophy
            </h2>
            <p className="text-sm font-medium leading-relaxed mb-3">
              Noetis (formerly PersonaMD) and the Noetis Conversation Capture browser extension are built with a **local-first** security design. 
            </p>
            <p className="text-sm font-medium leading-relaxed">
              We believe your data belongs to you. By default, all conversation parsing, text extraction, local semantic search, and configurations run entirely in your local browser environment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase tracking-wide border-b-2 border-black/10 dark:border-white/10 pb-2 mb-3">
              2. Extension Data Processing
            </h2>
            <p className="text-sm font-medium leading-relaxed mb-3">
              The **Noetis Conversation Capture** extension extracts message logs from your active AI chat tabs (e.g., ChatGPT, Claude) only when you explicitly trigger a capture command.
            </p>
            <ul className="list-disc list-inside text-sm font-medium space-y-2">
              <li><strong>Local Storage:</strong> Scraped chats are cached on your browser using Chrome local storage APIs. We do not transmit these chats to any central server.</li>
              <li><strong>Capsule Export:</strong> You can download your captured data as a standardized `.json` file (Noetis Capsule) to import manually into the Noetis app.</li>
              <li><strong>Zero Third-Party Sharing:</strong> We do not sell, rent, or transfer your captured data to third parties, analytics companies, or advertisers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase tracking-wide border-b-2 border-black/10 dark:border-white/10 pb-2 mb-3">
              3. Database Storage & Credentials
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              When syncing your capsules or using the app dashboard, data is stored securely in **your own configured database instance** via the Supabase Client SDK. Your database access tokens and passwords remain within your local environment configurations (`.env`) and are never sent to Noetis developers or intermediate servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black uppercase tracking-wide border-b-2 border-black/10 dark:border-white/10 pb-2 mb-3">
              4. Chrome Web Store Compliance
            </h2>
            <p className="text-sm font-medium leading-relaxed">
              We certify that our data practices fully comply with the Chrome Web Store Developer Program Policies, including the Single Purpose policy, the Limited Use requirements, and user privacy protections.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
