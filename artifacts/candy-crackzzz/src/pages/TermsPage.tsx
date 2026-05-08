import PageLayout from "@/components/layout/PageLayout";
import { useAppContext } from "@/context/AppContext";

export default function TermsPage() {
  const { settings } = useAppContext();
  const contactEmail = settings.contactDestinationEmail || settings.businessEmail || "support@candycrackzzz.com";

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-primary">Candy Crackzzz SMS Terms &amp; Conditions</p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Terms &amp; Conditions</h1>
          </div>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Messaging Program</h2>
            <p className="text-muted-foreground leading-7">By providing your phone number, you may receive messages related to order confirmations, pickup or delivery coordination, customer care, and optional promotional texts only when you opt in.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Message Frequency and Costs</h2>
            <p className="text-muted-foreground leading-7">Message frequency may vary. Message and data rates may apply.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Opt-Out and Help</h2>
            <p className="text-muted-foreground leading-7">Reply STOP to opt out at any time. Reply HELP for help.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Consent</h2>
            <p className="text-muted-foreground leading-7">Consent to receive text messages is not a condition of purchase.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Carrier Disclaimer</h2>
            <p className="text-muted-foreground leading-7">Carriers are not liable for delayed or undelivered messages.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Support</h2>
            <p className="text-muted-foreground leading-7">For support, contact <a href={`mailto:${contactEmail}`} className="text-primary font-bold hover:underline">{contactEmail}</a>.</p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}