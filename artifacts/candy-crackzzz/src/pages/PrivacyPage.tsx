import PageLayout from "@/components/layout/PageLayout";
import { useAppContext } from "@/context/AppContext";
import { Link } from "wouter";

export default function PrivacyPage() {
  const { settings } = useAppContext();
  const contactEmail = settings.contactDestinationEmail || settings.businessEmail || "support@candycrackzzz.com";

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-12 space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-primary">Candy Crackzzz</p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground font-medium">This policy explains how we collect, use, and protect information when you use Candy Crackzzz.</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Information We Collect</h2>
            <p className="text-muted-foreground leading-7">We may collect your name, phone number, email address, order details, and optional SMS or rewards preferences when you place an order, contact us, or join our rewards and referral programs.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">How We Use It</h2>
            <p className="text-muted-foreground leading-7">We use this information to fulfill orders, provide customer service, manage rewards and referrals, and send optional promotional texts only when you have opted in.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Text Messaging Consent</h2>
            <p className="text-muted-foreground leading-7">Consent to receive text messages is not a condition of purchase. Message and data rates may apply. Reply STOP to opt out and HELP for help.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Data Sharing</h2>
            <p className="text-muted-foreground leading-7">We do not sell your personal information. We share data only as needed to run our business, such as with service providers that help process orders, deliver messages, or support our website and communications.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-wider">Contact Us</h2>
            <p className="text-muted-foreground leading-7">Questions about this policy can be sent to <a href={`mailto:${contactEmail}`} className="text-primary font-bold hover:underline">{contactEmail}</a>.</p>
          </section>

          <div className="pt-4">
            <Link href="/terms" className="text-primary font-black uppercase tracking-wider hover:underline">View SMS Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}