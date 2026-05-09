import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Heart, UserCheck, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Dating Safety & Identity | TruBott - Verify Before You Meet",
  description: "Protect yourself while online dating. Use TruBott to share a verified identity badge that proves you are a real person without revealing your full name or address.",
};

export default function DatingSafetyPage() {
  return (
    <ContentPage
      eyebrow="Safe Dating"
      title="Establish trust before the first date"
      subtitle="Share a verified proof of identity and liveness without revealing your private details to strangers."
    >
      <ContentSection title="Trust shouldn't be dangerous" icon={Heart}>
        <p>
          Online dating requires a leap of faith. TruBott makes that leap safer by allowing you to share a "Trust Badge" before you meet in person or share sensitive contact info.
        </p>
        <p>
          Prove that you are the person in your photos (via liveness check) and that you have a verified social history, all while keeping your last name, address, and documents private.
        </p>
      </ContentSection>

      <ContentSection title="How to use it" icon={UserCheck}>
        <ul className="list-disc pl-6 space-y-4">
          <li><strong>Request a Card:</strong> Ask your match to share a TruBott flashcard before meeting.</li>
          <li><strong>Verify Photos:</strong> Ensure the person you're talking to matches their biometric liveness.</li>
          <li><strong>Stay Anonymous:</strong> Reveal only what's necessary (Age, Gender, Social Proof) until you're comfortable.</li>
        </ul>
      </ContentSection>

      <ContentSection title="Red Flag Detection" icon={ShieldAlert}>
        <p>
          Scammers and catfishes avoid TruBott because it requires a live face check that detects masks, deepfakes, and static photos. If someone refuses to share a TruBott card, it's a signal to proceed with caution.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
