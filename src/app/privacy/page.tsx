import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-gray-300 py-20 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="space-y-4">
          <Link href="/" className="text-blue-500 hover:underline text-sm">← Back</Link>
          <h1 className="text-4xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-sm opacity-50">Last Updated: April 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Data Collection</h2>
          <p>
            Trubott collects only what is necessary for verification: 
            Live face signals (ephemeral), social media handles (LinkedIn, Instagram, Reddit), and basic profile data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Biometric Data</h2>
          <p className="text-blue-400 font-medium">
            We do NOT store your biometric data.
          </p>
          <p>
            Face checks are processed in the browser to detect liveness and estimate age/gender. 
            Only the result (Pass/Fail) and metadata (estimated age range) are stored in our database.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">3. Data Sharing</h2>
          <p>
            Your "Flash Cards" are private links. Only the person you share the link with can view your verified status. 
            We do not sell your data to third parties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Your Rights</h2>
          <p>
            You can delete your account and all associated social connections at any time via your dashboard.
          </p>
        </section>

        <footer className="pt-10 border-t border-gray-800">
          <p className="text-xs">Contact: contact@trubott.com</p>
        </footer>
      </div>
    </main>
  );
}
