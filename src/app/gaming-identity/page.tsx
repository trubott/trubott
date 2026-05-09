import { Metadata } from "next";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Gamepad2, UserX, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Gaming Identity & Safety | TruBott - Reduce Scams",
  description: "Gamers: prove your identity and social maturity without doxxing. Reduce smurfing and scamming in your community with anonymous trust cards.",
};

export default function GamingIdentityPage() {
  return (
    <ContentPage
      eyebrow="Safe Gaming"
      title="Verified identity for gamers"
      subtitle="Prove you're a real player and account owner without revealing your real name or location."
    >
      <ContentSection title="Clean Up the Lobby" icon={Gamepad2}>
        <p>
          Online gaming is plagued by smurfs, scammers, and toxic bad actors. TruBott helps communities and tournament admins verify that players are real humans with established social histories (like long-standing Reddit or X accounts).
        </p>
      </ContentSection>

      <ContentSection title="Stop the Scams" icon={UserX}>
        <p>
          When trading skins, accounts, or in-game items, use a TruBott flashcard to establish trust. A live face check ensures that the person on the other side isn't using a stolen identity or a bot script.
        </p>
      </ContentSection>

      <ContentSection title="Gamer Privacy" icon={Shield}>
        <p>
          You don't need to give your home address or driver's license to an admin just to play in a tournament. Share a TruBott card instead—it provides the trust they need while keeping your personal life 100% private.
        </p>
      </ContentSection>
    </ContentPage>
  );
}
