import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Users, Rocket, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | TruBott - The Trust Primitive",
  description: "Learn about the mission behind TruBott: to build a safer, more anonymous web where trust is built on reputation, not PII.",
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="Our Mission"
      title="Building the primitive for digital trust"
      subtitle="TruBott was born from a simple idea: you shouldn't have to sacrifice your privacy to prove you are trustworthy."
    >
      <ContentSection title="The Problem" icon={Users}>
        <p>
          Today's internet requires us to hand over our most sensitive data—passports, ID cards, addresses—just to prove we are human or that we own an account. This creates massive honeypots for hackers and robs us of our anonymity.
        </p>
      </ContentSection>

      <ContentSection title="The Solution" icon={Rocket}>
        <p>
          We believe in "Reputation-Based Identity." By combining biometric liveness with social account ownership, we can create a high-trust signal that doesn't rely on PII. TruBott is the bridge between your anonymous online presence and real-world trust.
        </p>
      </ContentSection>

      <ContentSection title="Our Commitment" icon={ShieldCheck}>
        <p>
          We are committed to the principle of "Zero Data." If we don't have your data, we can't lose it, and we can't be forced to share it. Every part of our architecture is designed to minimize the digital footprint of our users.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
