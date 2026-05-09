import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { ShieldCheck, Zap, Lock } from "lucide-react";

export const metadata: Metadata = {
  title: "Biometrics and Privacy | TruBott - Secure Face Checks",
  description: "Learn how TruBott balances biometric security with extreme user privacy using local liveness detection.",
};

export default function BiometricsAndPrivacyPage() {
  return (
    <ContentPage
      eyebrow="Security Deep-Dive"
      title="Biometrics and Privacy"
      subtitle="How we prove you are you, without ever seeing your face data."
    >
      <ContentSection title="The Biometric Challenge" icon={ShieldCheck}>
        <p>
          Biometric data is the most sensitive data we have. If a password is leaked, you can change it. If your face data is leaked, you're stuck. That's why TruBott uses a "No-Storage" approach.
        </p>
      </ContentSection>

      <ContentSection title="Local Liveness" icon={Zap}>
        <p>
          Our liveness checks happen in your browser. We don't upload your video or photos to a server. We only receive a cryptographic signal that says "Yes, this is a real human."
        </p>
      </ContentSection>

      <ContentSection title="Privacy-First Authentication" icon={Lock}>
        <p>
          By decoupling liveness from identity, we create a system where you can be "Human Verified" without being "Named Verified." This is the future of digital privacy.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
