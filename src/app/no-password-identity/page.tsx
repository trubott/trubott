import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Lock, Ghost, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "No-Password Identity | TruBott - Secure & Passwordless",
  description: "Stop using passwords for identity. TruBott uses biometric liveness and social attestation to verify you securely without the risk of credential leaks.",
};

export default function NoPasswordIdentityPage() {
  return (
    <ContentPage
      eyebrow="Security First"
      title="The end of the password era"
      subtitle="Why TruBott uses biometrics and social attestation instead of vulnerable credentials."
    >
      <ContentSection title="Passwords are a liability" icon={Lock}>
        <p>
          Passwords can be stolen, phished, or leaked. Once a password is out there, your identity is compromised. TruBott eliminates this risk by moving away from what you *know* to what you *are* and what you *own*.
        </p>
      </ContentSection>

      <ContentSection title="Biometrics > Credentials" icon={ShieldCheck}>
        <p>
          By using 2-second face liveness checks, TruBott ensures that only the real account owner can generate a flashcard. This is exponentially more secure than a 2FA code or a static password, especially in an age of AI-driven social engineering.
        </p>
      </ContentSection>

      <ContentSection title="Everything Anonymous" icon={Ghost}>
        <p>
          A "No-Password" approach also means no account for us to track. Every session is independent. You verify yourself, share your proof, and the record is wiped. No database of users for hackers to target.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
