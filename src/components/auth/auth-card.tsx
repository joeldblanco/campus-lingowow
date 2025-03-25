import TermsPrivacyFooter from '@/components/auth/terms-privacy-footer'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const AuthCard = ({ children, className, ...props }: React.ComponentProps<'div'>) => {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden py-0">
        <CardContent className="grid p-0 md:grid-cols-2">{children}</CardContent>
      </Card>
      <TermsPrivacyFooter />
    </div>
  )
}

export default AuthCard
