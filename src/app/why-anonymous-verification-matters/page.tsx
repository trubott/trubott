import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { ShieldCheck, Lock, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Why Anonymous Verification Matters | TruBott - Privacy First",
  description: "Explore the importance of anonymous identity verification in a world of data breaches and privacy concerns.",
};

export default function AnonymousVerificationMattersPage() {
  return (
    <ContentPage
      eyebrow="Opinion"
      title="Why Anonymous Verification Matters"
      subtitle="In a digital world, trust is a currency. But privacy shouldn't be the price you pay for it."
    >
      <ContentSection title="The Privacy Paradox" icon={ShieldCheck}>
        <p>
          We are constantly asked to prove who we are. From opening a bank account to joining a Discord server, the "Proof of Identity" requirement is everywhere. However, every time we share our full ID, we create a new risk.
        </p>
      </ContentSection>

      <ContentSection title="The Risk of Over-Sharing" icon={Lock}>
        <p>
          Data breaches are inevitable. When a platform that stores your passport data gets hacked, your identity is stolen forever. Anonymous verification solves this by providing a "Proof of Attribute" rather than a "Proof of Identity."
        </p>
      </ContentSection>

      <ContentSection title="A Global Standard" icon={Globe}>
        <p>
          TruBott is building towards a world where you can verify your age, your location, and your reputation globally, without ever having to reveal your name to a central authority.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
