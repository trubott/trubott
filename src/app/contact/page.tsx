import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Mail, MessageSquare, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | TruBott - Get in Touch",
  description: "Have questions about TruBott? Reach out to our support team for help with identity verification, billing, or enterprise solutions.",
};

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="Get in Touch"
      title="How can we help?"
      subtitle="We're here to answer your questions about digital trust, privacy, and identity."
    >
      <ContentSection title="Email Support" icon={Mail}>
        <p>
          For general inquiries, support requests, or feedback, please email us at:
          <br />
          <a href="mailto:contact@trubott.com" className="text-blue-600 font-bold hover:underline">contact@trubott.com</a>
        </p>
      </ContentSection>

      <ContentSection title="Community" icon={MessageSquare}>
        <p>
          Join our community on Reddit to stay updated on new features and discuss the future of anonymous identity.
        </p>
        <p>
          <a href="https://reddit.com/r/trustcard" target="_blank" rel="noopener noreferrer" className="text-orange-600 font-bold hover:underline">r/trustcard</a>
        </p>
      </ContentSection>

      <ContentSection title="Privacy Inquiries" icon={Shield}>
        <p>
          If you have specific questions about how we handle data or want to request a data deletion (though we delete almost everything automatically!), please reach out via email.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
