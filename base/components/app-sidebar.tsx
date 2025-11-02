"use client"

import * as React from "react"
import {
  BarChart3,
  CalendarDays,
  FileText,
  Map,
  MessageSquare,
  Receipt,
  Settings2,
  Stethoscope,
  Users,
  FlaskConical,
} from "lucide-react"

import { useAuth } from "@/lib/authContext"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Provider-focused navigation data.
const navConfig = {
  teams: [
    {
      name: "Nora Health",
      logo: Map,
      plan: "Provider",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/provider/dashboard",
      icon: BarChart3,
      isActive: true,
      items: [
        { title: "Today", url: "/provider/dashboard" },
        { title: "Analytics", url: "/provider/dashboard#analytics" },
      ],
    },
    {
      title: "Schedule",
      url: "/provider/schedule",
      icon: CalendarDays,
      items: [
        { title: "Day", url: "/provider/schedule?view=day" },
        { title: "Week", url: "/provider/schedule?view=week" },
        { title: "Month", url: "/provider/schedule?view=month" },
      ],
    },
    {
      title: "Patients",
      url: "/provider/patients",
      icon: Users,
      items: [
        { title: "All Patients", url: "/provider/patients" },
        { title: "New Patient", url: "/provider/patients/new" },
        { title: "Cohorts", url: "/provider/patients?view=cohorts" },
      ],
    },
    {
      title: "Messages",
      url: "/provider/messages",
      icon: MessageSquare,
      items: [
        { title: "Inbox", url: "/provider/messages" },
        { title: "Triage", url: "/provider/messages?tab=triage" },
        { title: "Broadcast", url: "/provider/messages/broadcast" },
      ],
    },
    {
      title: "Labs",
      url: "/provider/labs",
      icon: FlaskConical,
      items: [
        { title: "Pending", url: "/provider/labs?status=pending" },
        { title: "Reviewed", url: "/provider/labs?status=reviewed" },
      ],
    },
    {
      title: "Encounters",
      url: "/provider/encounters",
      icon: Stethoscope,
      items: [
        { title: "Today's Notes", url: "/provider/encounters?filter=today" },
        { title: "Refill Requests", url: "/provider/encounters?filter=refills" },
        { title: "Documents", url: "/provider/encounters/documents" },
      ],
    },
    {
      title: "Reports",
      url: "/provider/reports",
      icon: FileText,
      items: [
        { title: "Productivity", url: "/provider/reports/productivity" },
        { title: "Quality", url: "/provider/reports/quality" },
      ],
    },
    {
      title: "Billing",
      url: "/provider/billing",
      icon: Receipt,
      items: [
        { title: "Claims", url: "/provider/billing/claims" },
        { title: "Payments", url: "/provider/billing/payments" },
      ],
    },
    {
      title: "Settings",
      url: "/provider/settings",
      icon: Settings2,
      items: [
        { title: "Profile", url: "/provider/settings/profile" },
        { title: "Preferences", url: "/provider/settings/preferences" },
        { title: "Integrations", url: "/provider/settings/integrations" },
      ],
    },
  ],
  projects: [
    { name: "Main Campus", url: "#", icon: Map },
    { name: "Telehealth", url: "#", icon: Map },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()

  const userData = {
    name: user?.email?.split('@')[0] || "Provider",
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
