import { Link } from 'wouter';
import { SiInstagram, SiTiktok, SiFacebook } from 'react-icons/si';
import { useAppContext } from '../../context/AppContext';
import logoPath from "@assets/candy_crackzzz_2_1776628492110.png";

export default function Footer() {
  const { settings } = useAppContext();

  return (
    <footer className="bg-card border-t border-border mt-auto mb-16 md:mb-0">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              {settings.showLogo && settings.logoBase64 ? (
                <img src={settings.logoBase64} alt={settings.businessName} className="h-12 object-contain" />
              ) : settings.showLogo ? (
                <img src={logoPath} alt="Candy Crackzzz Logo" className="h-12 object-contain" />
              ) : (
                <span className="font-black text-2xl text-primary tracking-tight font-sans">
                  {settings.businessName}
                </span>
              )}
            </Link>
            <p className="text-muted-foreground max-w-sm">
              {settings.aboutText}
            </p>
            <div className="flex gap-4 pt-2">
              {settings.socialLinks?.instagram && (
                <a href={settings.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary transition-colors">
                  <SiInstagram className="w-6 h-6" />
                </a>
              )}
              {settings.socialLinks?.tiktok && (
                <a href={settings.socialLinks.tiktok} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary transition-colors">
                  <SiTiktok className="w-6 h-6" />
                </a>
              )}
              {settings.socialLinks?.facebook && (
                <a href={settings.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary transition-colors">
                  <SiFacebook className="w-6 h-6" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black uppercase tracking-wider text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/menu" className="text-muted-foreground hover:text-primary transition-colors">Menu</Link></li>
              {settings.enableSeasonalSection && (
                <li><Link href="/seasonal" className="text-muted-foreground hover:text-primary transition-colors">Seasonal Specials</Link></li>
              )}
              {settings.enableCustomOrders && (
                <li><Link href="/custom-orders" className="text-muted-foreground hover:text-primary transition-colors">Custom Orders</Link></li>
              )}
              {settings.enableGallery && (
                <li><Link href="/gallery" className="text-muted-foreground hover:text-primary transition-colors">Gallery</Link></li>
              )}
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms &amp; Conditions</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-black uppercase tracking-wider text-foreground">Contact</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>{settings.businessPhone}</li>
              <li>{settings.businessEmail}</li>
              <li className="pt-2 italic">{settings.serviceArea}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {settings.businessName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
