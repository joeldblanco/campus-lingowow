import Image from 'next/image'

const Footer = () => {
  return (
    <footer className="border-t bg-slate-100">
      <div className="container px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/branding/logo.png"
                alt="Lingowow"
                width={24}
                height={24}
                className="h-6 w-6 rounded-lg"
              />
              <span className="text-xl font-bold">Lingowow</span>
            </div>
            <p className="text-muted-foreground mb-4">
              Go wow with us!
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c-1.3 1.3-2.5 1.6-3 1.5a1 1 0 0 1-.8-.7c-.4-1.1-.8-3.2-3-5.4C11.3 1 9.4 0 8 0H7a12 12 0 0 0-5 2"></path>
                </svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#cursos" className="text-muted-foreground hover:text-foreground">
                  Cursos
                </a>
              </li>
              <li>
                <a href="#metodo" className="text-muted-foreground hover:text-foreground">
                  Metodología
                </a>
              </li>
              <li>
                <a href="#testimonios" className="text-muted-foreground hover:text-foreground">
                  Testimonios
                </a>
              </li>
              <li>
                <a href="#precios" className="text-muted-foreground hover:text-foreground">
                  Precios
                </a>
              </li>
              <li>
                <a href="#faq" className="text-muted-foreground hover:text-foreground">
                  FAQ
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Idiomas</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Inglés
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  Español
                </a>
              </li>
              <li>
                <span className="text-muted-foreground/50">
                  Francés (Próximamente)
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50">
                  Alemán (Próximamente)
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50">
                  Italiano (Próximamente)
                </span>
              </li>
              <li>
                <span className="text-muted-foreground/50">
                  Japonés (Próximamente)
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Contacto</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span className="text-muted-foreground">+51 902 518 947</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                <span className="text-muted-foreground">info@lingowow.com</span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span className="text-muted-foreground">Callao, Perú</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lingowow. Todos los derechos reservados.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Términos de servicio
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Política de privacidad
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
