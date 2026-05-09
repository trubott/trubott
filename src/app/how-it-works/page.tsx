import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Zap, UserCircle2, CreditCard, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works | TruBott - 3 Steps to Digital Trust",
  description: "Learn how TruBott creates anonymous identity flashcards in seconds using biometric liveness and social attestation.",
};

export default function HowItWorksPage() {
  return (
    <ContentPage
      eyebrow="The Process"
      title="Three things. That's it."
      subtitle="TruBott is designed to be the simplest way to prove your identity while protecting your privacy."
    >
      <ContentSection title="1. Connect & Attest" icon={UserCircle2}>
        <p>
          First, you securely connect a social account (like Reddit, LinkedIn, or X). We use this to verify your digital reputation—account age, activity, and verified status. We never see or store your password.
        </p>
      </ContentSection>

      <ContentSection title="2. Liveness Check" icon={Zap}>
        <p>
          Next, a quick 2-second biometric scan ensures you are a real, living human. This process happens entirely in your browser. We don't store your raw face data; we only generate a temporary trust signal.
        </p>
      </ContentSection>

      <ContentSection title="3. Mint & Share" icon={CreditCard}>
        <p>
          Finally, you mint your "Flashcard"—a secure, ephemeral digital ID. You receive a unique link that you can share with anyone. The recipient sees your verified attributes but never your PII.
        </p>
      </ContentSection>

      <ContentSection title="Privacy-First by Design" icon={Lock}>
        <p>
          Every TruBott card is a "flash" identity. It is single-use and auto-deletes after 24 hours. Your data is never sold, never harvested, and never leaked. It's digital trust, without the digital footprint.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
