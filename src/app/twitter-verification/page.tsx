import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Twitter, Shield, Bot } from "lucide-react";

export const metadata: Metadata = {
  title: "Twitter (X) Verification | TruBott - Digital Trust Badges",
  description: "Verify your X (Twitter) account ownership anonymously. Prove you are a real human behind the handle with biometric liveness and social attestation.",
};

export default function TwitterVerificationPage() {
  return (
    <ContentPage
      eyebrow="X (Twitter) Identity"
      title="Verify your X profile without doxxing"
      subtitle="Establish authority and human-status for your Twitter handle using biometric-backed digital trust cards."
    >
      <ContentSection title="Authority without exposure" icon={Twitter}>
        <p>
          In an era of bots and blue-checks, proving you are a genuine human behind an X (Twitter) handle is more important than ever. TruBott provides a way to link your biometric liveness to your Twitter handle.
        </p>
        <p>
          Generate a secure link that shows your "Human Verified" status and account ownership, without revealing your personal identifiable information (PII) to the person you're sharing with.
        </p>
      </ContentSection>

      <ContentSection title="Combatting Bots" icon={Bot}>
        <p>
          Use TruBott to prove you aren't a bot in high-stakes discussions or when participating in community-gated events. A TruBott flashcard combines a 2-second face liveness check with your Twitter identity to provide an undeniable proof of personhood.
        </p>
      </ContentSection>

      <ContentSection title="Privacy First" icon={Shield}>
        <p>
          Unlike traditional KYC, TruBott doesn't want your ID card. We only want to know that you are you. We use ephemeral sessions that auto-delete, ensuring your digital footprint remains minimal while your trust remains high.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
