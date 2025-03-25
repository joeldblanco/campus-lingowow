import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

const CompanySidebarHeader = () => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <div className="flex items-center text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={'/media/images/lingowow-logo.png'} alt={'Lingowow'} />
                <AvatarFallback className="rounded-lg">LW</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{'Lingowow'}</span>
                <span className="truncate text-xs">{'Go wow with us!'}</span>
              </div>
            </div>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">Lingowow</span>
            <span className="truncate text-xs">Go wow with us!</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default CompanySidebarHeader
