import Image from 'next/image'
import Link from 'next/link'
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Youtube,
} from 'lucide-react'

const EXPLORE_LINKS = [
  { href: '/courses', label: 'Cursos' },
  { href: '/method', label: 'Metodología' },
  { href: '/shop', label: 'Precios' },
  { href: '/library', label: 'Biblioteca' },
  { href: '/resources/podcasts', label: 'Podcasts' },
  { href: '/faq', label: 'Preguntas frecuentes' },
  { href: '/contact', label: 'Contacto' },
]

const SOCIAL_LINKS = [
  { href: 'https://facebook.com/lingowow', label: 'Facebook', Icon: Facebook },
  { href: 'https://instagram.com/_lingowow', label: 'Instagram', Icon: Instagram },
  { href: 'https://youtube.com/@lingowow', label: 'YouTube', Icon: Youtube },
  { href: 'https://linkedin.com/company/lingowow', label: 'LinkedIn', Icon: Linkedin },
]

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary/60">
      <div className="container mx-auto px-4 py-16 md:px-6 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr]">
          {/* Mast */}
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <Image
                src="/branding/logo.png"
                alt="Lingowow"
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg"
              />
              <span className="font-display text-2xl font-bold lowercase tracking-tight">
                lingo<span className="text-teal">wow</span>
              </span>
            </div>
            <p className="mt-4 font-display text-xl font-medium leading-snug text-foreground">
              Go <span className="text-teal">wow</span> con nosotros.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Idiomas con profesores titulados, clases en vivo y atención
              personalizada — desde cualquier parte del mundo.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore + contact */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-lexend text-sm font-semibold text-foreground">Explorar</h3>
              <ul className="mt-4 space-y-2.5">
                {EXPLORE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-lexend text-sm font-semibold text-foreground">Contacto</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span>+51 902 518 947</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a
                    href="mailto:info@lingowow.com"
                    className="transition-colors hover:text-foreground"
                  >
                    info@lingowow.com
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>Callao, Perú</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lingowow. Todos los derechos reservados.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Términos
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacidad
            </Link>
            <Link
              href="/cookies"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
