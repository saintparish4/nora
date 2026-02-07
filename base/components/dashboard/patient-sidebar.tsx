"use client"

import * as React from "react"
import {
  CalendarDays,
  FileText,
  FlaskConical,
  Home,
  Inbox,
  Receipt,
  Settings2,
  Stethoscope,
  Pill,
  LogOut,
  HeartPulse,
  Users,
} from "lucide-react"

import { useAuth } from "@/lib/auth/context"
import { NavMain } from "@/components/navigation/nav-main"
import { NavProjects } from "@/components/navigation/nav-projects"
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
      items: [], // No dropdown - direct link
    },
    {
      title: "Get Care",
      url: "/get-care",
      icon: HeartPulse,
      items: [], // No dropdown - unified wizard
    },
    {
      title: "Browse Providers",
      url: "/providers",
      icon: Users,
      items: [], // No dropdown - direct link
    },
    {
      title: "Appointments",
      url: "/appointments",
      icon: CalendarDays,
      items: [], // No dropdown - direct link
    },
    {
      title: "Messages",
      url: "/dashboard/messages",
      icon: Inbox,
      items: [], // No dropdown - combined inbox/compose
    },
    {
      title: "Lab Results",
      url: "/dashboard/labs",
      icon: FlaskConical,
      items: [
        { title: "Recent", url: "/dashboard/labs" },
        { title: "All Results", url: "/dashboard/labs/all" },
      ],
    },
    {
      title: "Medications",
      url: "/dashboard/medications",
      icon: Pill,
      items: [
        { title: "Active", url: "/dashboard/medications" },
        { title: "Refills", url: "/dashboard/medications/refills" },
      ],
    },
    {
      title: "Documents",
      url: "/dashboard/documents",
      icon: FileText,
      items: [
        { title: "Forms", url: "/dashboard/documents/forms" },
        { title: "Records", url: "/dashboard/documents/records" },
      ],
    },
    {
      title: "Billing",
      url: "/dashboard/billing",
      icon: Receipt,
      items: [
        { title: "Statements", url: "/dashboard/billing" },
        { title: "Payments", url: "/dashboard/billing/payments" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [], // No dropdown - direct link
    },
    {
      title: "Logout",
      url: "/logout",
      icon: LogOut,
      items: [],
    },
  ],
  projects: [
    { name: "Care Plan", url: "#", icon: Stethoscope },
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
        <NavProjects projects={navConfig.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} onLogout={logout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
