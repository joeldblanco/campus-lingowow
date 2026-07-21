import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

const CompanySidebarHeader = () => {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="hover:bg-transparent active:bg-transparent cursor-default px-3 flex items-center justify-start"
        >
          <span
            role="img"
            aria-label="Lingowow"
            className="block h-9 w-[130px] bg-[#137fec]"
            style={{
              WebkitMask: 'url(/branding/lw_logotipo.png) center / contain no-repeat',
              mask: 'url(/branding/lw_logotipo.png) center / contain no-repeat',
            }}
          />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export default CompanySidebarHeader
