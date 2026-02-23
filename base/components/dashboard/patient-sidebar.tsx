"use client"

import * as React from "react"
import {
  CalendarDays,
  Home,
  Settings2,
  LogOut,
  HeartPulse,
  Users,
} from "lucide-react"

import { useAuth } from "@/lib/auth/context"
import { NavMain } from "@/components/navigation/nav-main"
import { NavUser } from "@/components/navigation/nav-user"
import { TeamSwitcher } from "@/components/navigation/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const navConfig = {
  teams: [
    { name: "Nora Health", logo: Home, plan: "Patient" },
  ],
  navMain: [
    {
      title: "Home",
      url: "/dashboard",
      icon: Home,
      isActive: true,
      items: [],
    },
    {
      title: "Get Care",
      url: "/dashboard/get-care",
      icon: HeartPulse,
      items: [],
    },
    {
      title: "Browse Providers",
      url: "/dashboard/providers",
      icon: Users,
      items: [],
    },
    {
      title: "Appointments",
      url: "/dashboard/appointments",
      icon: CalendarDays,
      items: [],
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings2,
      items: [],
    },
    {
      title: "Logout",
      url: "/logout",
      icon: LogOut,
      items: [],
    },
  ],
}

export function PatientSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()

  const userData = {
    name: user?.email?.split('@')[0] || "Patient",
    email: user?.email || "",
    avatar: "/avatars/shadcn.jpg",
  }

  return (
    <Sidebar collapsible="icon" {...props} suppressHydrationWarning>
      <SidebarHeader>
        <TeamSwitcher teams={navConfig.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navConfig.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onLogout={logout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
