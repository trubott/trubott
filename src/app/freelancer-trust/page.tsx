import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Briefcase, UserCheck, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Freelancer Trust & Identity | TruBott - Build Credibility",
  description: "Freelancers: use TruBott to share a verified identity and social reputation with clients without revealing your personal identifiable information.",
};

export default function FreelancerTrustPage() {
  return (
    <ContentPage
      eyebrow="Professional Trust"
      title="Prove your professional reputation"
      subtitle="Establish credibility with new clients by sharing verified social signals and biometric liveness."
    >
      <ContentSection title="Trust in the Gig Economy" icon={Briefcase}>
        <p>
          As a freelancer, your reputation is everything. But sharing your personal ID or full LinkedIn profile with every potential lead can be a privacy risk. TruBott allows you to share a "Professional Proof" card instead.
        </p>
      </ContentSection>

      <ContentSection title="What Clients See" icon={UserCheck}>
        <ul className="list-disc pl-6 space-y-4">
          <li><strong>Verified Accounts:</strong> Proof that you own your LinkedIn or X handle.</li>
          <li><strong>Liveness Proof:</strong> Confirmation that you are a real human, not a bot or a scammer.</li>
          <li><strong>Consistent Identity:</strong> A signal that your device and location are consistent with your claims.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Protect Your Business" icon={Shield}>
        <p>
          By using ephemeral flashcards, you protect yourself from identity theft and doxxing while still providing the high-trust signals that clients need to close the deal.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
