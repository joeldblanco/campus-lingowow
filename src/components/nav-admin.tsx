'use client'

import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

export function NavAdmin({
  sections,
}: {
  sections: {
    title: string
    icon: LucideIcon
    url?: string
    subItems?: {
      title: string
      url: string
      icon?: LucideIcon
    }[]
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Administración</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sections.map((item) =>
            item.subItems ? (
              <Collapsible key={item.title} defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="cursor-pointer transition-all duration-200 ease-out hover:bg-accent/50 group-data-[state=open]/collapsible:bg-accent/30"
                    >
                      <item.icon className="transition-all duration-200 ease-out group-data-[state=open]/collapsible:text-primary" />
                      <span className="transition-all duration-200 ease-out group-data-[state=open]/collapsible:font-medium">
                        {item.title}
                      </span>
                      <ChevronRight className="ml-auto transition-all duration-300 ease-out transform group-data-[state=open]/collapsible:rotate-90 group-data-[state=open]/collapsible:text-primary" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:transition-all data-[state=closed]:duration-150 data-[state=closed]:ease-linear data-[state=open]:transition-all data-[state=open]:duration-300 data-[state=open]:ease-out">
                    <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300 ease-out">
                      {item.subItems.map((subItem, index) => (
                        <SidebarMenuSub key={subItem.title}>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              className="transition-all duration-200 ease-out hover:bg-accent/70 hover:translate-x-1"
                              style={{
                                animationDelay: `${index * 50}ms`,
                                animation: 'slideInFromLeft 0.3s ease-out forwards',
                              }}
                            >
                              <Link href={subItem.url}>
                                {subItem.icon && (
                                  <subItem.icon className="h-4 w-4 transition-colors duration-200" />
                                )}
                                <span className="transition-all duration-200">{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      ))}
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className="cursor-pointer transition-all duration-200 ease-out hover:bg-accent/50 hover:translate-x-0.5"
                >
                  <Link href={item.url || '#'}>
                    <item.icon className="transition-colors duration-200" />
                    <span className="transition-all duration-200">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
