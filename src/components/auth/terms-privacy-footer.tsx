import Link from 'next/link'

const TermsPrivacyFooter = () => {
  return (
    <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
      Al continuar, aceptas nuestros <Link href="#terms">Términos de Servicio</Link> y nuestra{' '}
      <Link href="#privacy">Política de Privacidad</Link>.
    </div>
  )
}

export default TermsPrivacyFooter
