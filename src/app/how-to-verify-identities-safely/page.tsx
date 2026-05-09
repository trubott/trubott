import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { ShieldCheck, UserCheck, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Verify Identities Safely | TruBott Guide",
  description: "A comprehensive guide on how to verify digital identities without compromising privacy or security.",
};

export default function VerifyIdentitiesSafelyPage() {
  return (
    <ContentPage
      eyebrow="Guide"
      title="How to verify identities safely"
      subtitle="Best practices for establishing trust in online communities and marketplaces."
    >
      <ContentSection title="Verify the Person, Not the Document" icon={UserCheck}>
        <p>
          Documents can be forged or stolen. Biometric liveness detection is much harder to fake. Always prefer a "live" verification over a static photo of an ID.
        </p>
      </ContentSection>

      <ContentSection title="Use Ephemeral Proof" icon={Zap}>
        <p>
          Don't collect data you don't need. If you only need to know someone is over 18, don't ask for their date of birth. Use ephemeral proofs like TruBott flashcards that show only the necessary attributes.
        </p>
      </ContentSection>

      <ContentSection title="Trust but Verify" icon={ShieldCheck}>
        <p>
          In high-stakes environments, always ask for a fresh verification card. A TruBott card minted 5 minutes ago is much more reliable than a screenshot of an old profile.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
