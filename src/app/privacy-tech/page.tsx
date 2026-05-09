import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Lock, Code, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Technology | TruBott - How We Protect Your Data",
  description: "Technical overview of TruBott's privacy-first architecture, including zero-storage biometrics and ephemeral session management.",
};

export default function PrivacyTechPage() {
  return (
    <ContentPage
      eyebrow="Technology"
      title="Architecture of Anonymity"
      subtitle="How we use cutting-edge technology to verify your identity without ever seeing your PII."
    >
      <ContentSection title="Zero-Storage Biometrics" icon={ShieldCheck}>
        <p>
          TruBott uses in-browser liveness detection. When you perform a face check, our algorithms analyze the video stream locally to ensure a real human is present. Instead of storing your face, we generate a mathematical proof of liveness that is wiped immediately after the session.
        </p>
      </ContentSection>

      <ContentSection title="Ephemeral Sessions" icon={Lock}>
        <p>
          Unlike traditional platforms that build permanent user profiles, TruBott treats every verification as a "flash" event. Once your card is minted, the underlying session data is marked for deletion. We don't want to know who you were yesterday; we only care that you are verified today.
        </p>
      </ContentSection>

      <ContentSection title="Secure Attestation" icon={Code}>
        <p>
          We use secure OAuth and cryptographic signatures to verify account ownership. By checking signals directly from providers like Reddit or LinkedIn, we can attest to your reputation without needing access to your direct messages or private data.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
