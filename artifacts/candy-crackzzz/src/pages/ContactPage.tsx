import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Star, ImagePlus, X } from 'lucide-react';
import { SiInstagram, SiTiktok, SiFacebook } from 'react-icons/si';
import PageLayout from '@/components/layout/PageLayout';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Review } from '@/types';
import { apiCreatePublicMessage } from '@/lib/api';

export default function ContactPage() {
  const { settings, reviews, setReviews } = useAppContext();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState<{ name: string; rating: number; text: string; imageBase64: string }>(
    { name: '', rating: 5, text: '', imageBase64: '' },
  );
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewImageError, setReviewImageError] = useState('');

  const REVIEW_IMAGE_MAX_BYTES = 2_500_000;

  const handleReviewImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReviewImageError('');
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setReviewImageError('Please pick a valid image file.');
      event.target.value = '';
      return;
    }
    if (file.size > REVIEW_IMAGE_MAX_BYTES) {
      setReviewImageError('Image must be 2.5 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setReviewImageError('Could not read image.');
        return;
      }
      setReviewForm((prev) => ({ ...prev, imageBase64: result }));
    };
    reader.onerror = () => setReviewImageError('Could not read image.');
    reader.readAsDataURL(file);
  };

  const clearReviewImage = () => setReviewForm((prev) => ({ ...prev, imageBase64: '' }));
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const name = contactForm.name.trim();
    const message = contactForm.message.trim();
    const email = contactForm.email.trim();
    const phone = contactForm.phone.trim();
    if (!name || !message) {
      toast({ title: 'Almost there', description: 'Please add your name and a short message.', variant: 'destructive' });
      return;
    }
    if (!email && !phone) {
      toast({ title: 'How can we reply?', description: 'Add an email or phone number so we can get back to you.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await apiCreatePublicMessage({
        name,
        email,
        phone,
        subject: contactForm.subject.trim(),
        message,
        type: 'contact',
      });
      toast({ title: 'Message sent!', description: "We got it — we'll reply as soon as we can." });
      setContactForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      toast({
        title: 'Could not send',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name.trim() || !reviewForm.text.trim()) return;
    const newReview: Review = {
      id: Math.random().toString(36).substring(2, 9),
      customerName: reviewForm.name.trim(),
      rating: reviewForm.rating,
      text: reviewForm.text.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      isFeatured: false,
      imageBase64: reviewForm.imageBase64 || undefined,
    };
    setReviews(prev => [...prev, newReview]);
    setReviewSubmitted(true);
    toast({ title: "Review submitted!", description: "Thank you! Your review is pending approval." });
  };

  const contactEmail = settings.contactDestinationEmail || settings.businessEmail;

  return (
    <PageLayout>
      <div className="bg-card border-b border-border py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-4 text-foreground">
            SAY HELLO
          </h1>
          <p className="text-xl font-bold text-muted-foreground max-w-2xl mx-auto">
            Questions? Custom orders? Just want to say you love us? We're here for it.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

          {/* Contact Info */}
          <div className="space-y-12">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-wider mb-8">Get In Touch</h2>
              <div className="space-y-6">
                {settings.businessPhone && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 text-primary">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-1">Phone</h3>
                      <p className="text-xl font-bold">{settings.businessPhone}</p>
                    </div>
                  </div>
                )}

                {contactEmail && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center flex-shrink-0 text-secondary">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-1">Email</h3>
                      <a href={`mailto:${contactEmail}`} className="text-xl font-bold hover:text-primary transition-colors">{contactEmail}</a>
                    </div>
                  </div>
                )}

                {settings.serviceArea && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0 text-accent">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-1">Service Area</h3>
                      <p className="text-xl font-bold">{settings.serviceArea}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center flex-shrink-0 text-foreground">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-wider text-sm text-muted-foreground mb-1">Hours</h3>
                    <p className="text-lg font-bold">Mon – Fri: 9am – 6pm</p>
                    <p className="text-lg font-bold">Sat: 10am – 4pm</p>
                    <p className="text-lg font-bold">Sun: Closed</p>
                  </div>
                </div>
              </div>
            </div>

            {(settings.socialLinks?.instagram || settings.socialLinks?.tiktok || settings.socialLinks?.facebook) && (
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wider mb-6">Follow Us</h2>
                <div className="flex gap-4">
                  {settings.socialLinks.instagram && (
                    <a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer" className="w-14 h-14 bg-card border border-border rounded-full flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg">
                      <SiInstagram className="w-6 h-6" />
                    </a>
                  )}
                  {settings.socialLinks.tiktok && (
                    <a href={settings.socialLinks.tiktok} target="_blank" rel="noreferrer" className="w-14 h-14 bg-card border border-border rounded-full flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg">
                      <SiTiktok className="w-6 h-6" />
                    </a>
                  )}
                  {settings.socialLinks.facebook && (
                    <a href={settings.socialLinks.facebook} target="_blank" rel="noreferrer" className="w-14 h-14 bg-card border border-border rounded-full flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-lg">
                      <SiFacebook className="w-6 h-6" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact form */}
          <div className="bg-card rounded-3xl border border-border p-8 md:p-10">
            <h2 className="text-2xl font-black uppercase tracking-wider mb-8">Send a Message</h2>
            <form onSubmit={handleContact} className="space-y-5">
              <div className="space-y-2">
                <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Name</Label>
                <Input
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-background h-12 font-bold"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Email</Label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                    className="bg-background h-12 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Phone</Label>
                  <Input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                    className="bg-background h-12 font-bold"
                  />
                </div>
              </div>
              <p className="text-xs font-bold text-muted-foreground -mt-3">Provide an email or phone number so we can reply.</p>
              <div className="space-y-2">
                <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Subject</Label>
                <Input
                  value={contactForm.subject}
                  onChange={(e) => setContactForm((p) => ({ ...p, subject: e.target.value }))}
                  className="bg-background h-12 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Message</Label>
                <Textarea
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                  className="bg-background min-h-[120px] resize-none font-bold"
                />
              </div>
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full h-14 text-lg font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.4)]">
                {isSubmitting ? 'SENDING...' : 'SEND MESSAGE'}
              </Button>
            </form>
          </div>
        </div>

        {/* Leave a Review section */}
        <div className="mt-20 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black uppercase tracking-wider mb-2">Leave a Review</h2>
            <p className="text-muted-foreground font-bold">Loved your order? Tell the world!</p>
          </div>

          {reviewSubmitted ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">🍬</div>
              <h3 className="text-xl font-black mb-2">Thank you!</h3>
              <p className="text-muted-foreground font-bold">Your review is submitted and pending approval. We appreciate the love!</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8">
              <form onSubmit={handleReviewSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Your Name</Label>
                  <Input
                    required
                    value={reviewForm.name}
                    onChange={e => setReviewForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="First name or nickname"
                    className="bg-background h-12 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Rating</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewForm(p => ({ ...p, rating: n }))}
                        className={`text-2xl transition-transform hover:scale-110 ${n <= reviewForm.rating ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
                      >
                        <Star className={`w-8 h-8 ${n <= reviewForm.rating ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Your Review</Label>
                  <Textarea
                    required
                    value={reviewForm.text}
                    onChange={e => setReviewForm(p => ({ ...p, text: e.target.value }))}
                    placeholder="Tell us about your experience..."
                    className="bg-background min-h-[100px] resize-none font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Photo (optional)</Label>
                  {reviewForm.imageBase64 ? (
                    <div className="relative inline-block">
                      <img src={reviewForm.imageBase64} alt="Review preview" className="max-h-48 rounded-xl border border-border bg-background" />
                      <button
                        type="button"
                        onClick={clearReviewImage}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                        data-testid="button-remove-review-image"
                        aria-label="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-bold bg-background border border-dashed border-border rounded-xl px-4 py-3 hover:border-primary transition-colors">
                      <ImagePlus className="w-4 h-4 text-primary" />
                      <span>Add a photo of your treat</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReviewImageChange}
                        data-testid="input-review-image"
                      />
                    </label>
                  )}
                  {reviewImageError && (
                    <p className="text-xs font-bold text-destructive">{reviewImageError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">PNG or JPG, up to 2.5 MB.</p>
                </div>

                <Button type="submit" size="lg" className="w-full font-black uppercase tracking-wider shadow-[0_0_15px_rgba(255,0,255,0.3)]">
                  Submit Review
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
