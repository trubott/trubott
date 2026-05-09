import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { HelpCircle, Shield, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQ | TruBott - Frequently Asked Questions",
  description: "Find answers to common questions about TruBott identity verification, privacy, pricing, and how flashcards work.",
};

export default function FAQPage() {
  return (
    <ContentPage
      eyebrow="Support"
      title="Common Questions"
      subtitle="Everything you need to know about TruBott and digital trust."
    >
      <ContentSection title="General" icon={HelpCircle}>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-900">What is a TruBott Flashcard?</h4>
            <p>It's a single-use, ephemeral digital ID that proves your identity via face checks and social data without revealing your real name.</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900">How long does a card last?</h4>
            <p>Cards automatically expire after 24 hours or a single use, whichever comes first.</p>
          </div>
        </div>
      </ContentSection>

      <ContentSection title="Privacy & Security" icon={Shield}>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-900">Is my face data stored?</h4>
            <p>No. Face liveness checks happen in your browser. We never see, store, or transmit your raw biometric data.</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900">What data do you collect?</h4>
            <p>Only what's necessary to generate the card. This data is wiped once the card expires.</p>
          </div>
        </div>
      </ContentSection>

      <ContentSection title="Pricing" icon={CreditCard}>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-900">How much does it cost?</h4>
            <p>Standard flashcards are $1.99 per mint. We also offer regional pricing (e.g., ₹180 for Indian users).</p>
          </div>
        </div>
      </ContentSection>
    </ContentPage>
  );
}
