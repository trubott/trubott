import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-gray-300 py-20 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="space-y-4">
          <Link href="/" className="text-blue-500 hover:underline text-sm">← Back</Link>
          <h1 className="text-4xl font-bold text-white tracking-tight">Terms of Use</h1>
          <p className="text-sm opacity-50">Effective Date: April 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Service Description</h2>
          <p>
            Trubott provides identity verification and "Flash Card" generation services. 
            Verification is based on automated signals and social media profiles.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Prohibited Use</h2>
          <p>
            You may not use Trubott to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Impersonate others using deepfakes or stolen photos.</li>
            <li>Bypass verification logic via automated scripts.</li>
            <li>Harass or deceive other users.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">3. Payments</h2>
          <p>
            "Flash Cards" are single-use or limited-time verified profiles. 
            Payments are final once a card has been minted and verified.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Disclaimer</h2>
          <p>
            Trubott is an AI-assisted verification tool. While we strive for 100% accuracy, 
            we do not guarantee the absolute truth of any user's claims. 
            Use verified profiles at your own risk.
          </p>
        </section>

        <footer className="pt-10 border-t border-gray-800 text-xs">
          <p>© 2026 Truebuilders. Contact: contact@trubott.com</p>
        </footer>
      </div>
    </main>
  );
}
