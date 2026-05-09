import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Linkedin, ShieldCheck, Briefcase } from "lucide-react";

export const metadata: Metadata = {
  title: "LinkedIn Verification | TruBott - Professional Proof",
  description: "Verify your LinkedIn professional identity without sharing your full profile or credentials. Prove you are who you say you are in professional DMs.",
};

export default function LinkedinVerificationPage() {
  return (
    <ContentPage
      eyebrow="Professional Identity"
      title="Verify your professional reputation"
      subtitle="Prove your LinkedIn handle ownership and professional status without compromising your privacy."
    >
      <ContentSection title="Trust for Professionals" icon={Linkedin}>
        <p>
          LinkedIn is the standard for professional reputation. But sometimes, you want to prove your credentials without revealing your entire career history or allowing a stranger to browse your connections.
        </p>
        <p>
          TruBott allows you to mint a "Professional Proof" card that attest to your LinkedIn ownership. This is perfect for initial outreach, recruiter calls, or sensitive B2B conversations.
        </p>
      </ContentSection>

      <ContentSection title="Verified signals" icon={Briefcase}>
        <p>
          Show your recipient that you are a verified professional. A TruBott card combines your LinkedIn ownership with a 2-second face check, providing a "Gold Standard" signal for professional trust.
        </p>
      </ContentSection>

      <ContentSection title="Privacy in Outreach" icon={ShieldCheck}>
        <p>
          Protect your professional brand by sharing only what matters. Keep your private DMs, contact info, and network hidden until the trust is established.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
