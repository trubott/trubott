import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { MessageSquare, ShieldCheck, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Reddit Verification | TruBott - Prove Your Reputation",
  description: "Securely prove your Reddit account ownership and reputation without sharing your password or real identity. Ideal for private communities and P2P trust.",
};

export default function RedditVerificationPage() {
  return (
    <ContentPage
      eyebrow="Reddit Identity"
      title="Prove your Reddit reputation anonymously"
      subtitle="Share your account signals without ever compromising your privacy or sharing your credentials."
    >
      <ContentSection title="Trust for Redditors" icon={MessageSquare}>
        <p>
          Reddit is built on reputation. Whether you're a moderator, a high-karma contributor, or an active member of a niche community, your account age and activity are your credentials.
        </p>
        <p>
          TruBott allows you to "mint" a flashcard that proves you own a specific Reddit handle and meet certain criteria (like account age or verification status) without ever having to share your Reddit password or reveal your real name.
        </p>
      </ContentSection>

      <ContentSection title="How it helps" icon={ShieldCheck}>
        <ul className="list-disc pl-6 space-y-4">
          <li><strong>Private Communities:</strong> Gain entry to gated subreddits by proving you are a long-standing user.</li>
          <li><strong>P2P Transactions:</strong> Establish trust before high-value deals in marketplace subreddits.</li>
          <li><strong>Safe DMs:</strong> Prove you're not a "throwaway" account before starting a sensitive conversation.</li>
        </ul>
      </ContentSection>

      <ContentSection title="No Passwords Required" icon={Zap}>
        <p>
          We use secure OAuth and ephemeral attestation. This means we never see your password, and we don't store your Reddit data. The card exists for 24 hours and then vanishes from the web.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
