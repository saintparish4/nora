"use client"

import * as React from "react"
import {
  CalendarDays,
  Bot,
  Search,
  FileText,
  FlaskConical,
  Home,
  Inbox,
  Receipt,
  Settings2,
  Stethoscope,
  Pill,
  LogOut,
  Zap,
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
      items: [
        { title: "Overview", url: "/dashboard" },
      ],
    },
    {
      title: "⚡ Quick Booking",
      url: "/quick-booking",
      icon: Zap,
      items: [
        { title: "Book in 2 Minutes", url: "/quick-booking" },
      ],
    },
    {
      title: "AI Symptom Checker",
      url: "/booking/symptoms",
      icon: Bot,
      items: [
        { title: "New Check", url: "/booking/symptoms" },
        { title: "History", url: "/booking/symptoms/history" },
      ],
    },
    {
      title: "Browse Providers",
      url: "/providers",
      icon: Search,
      items: [
        { title: "All Providers", url: "/providers" },
        { title: "Specialties", url: "/providers/specialties" },
      ],
    },
    {
      title: "Appointments",
      url: "/appointments",
      icon: CalendarDays,
      items: [
        { title: "My Appointments", url: "/appointments" },
      ],
    },
    {
      title: "Messages",
      url: "/patient/dashboard/messages",
      icon: Inbox,
      items: [
        { title: "Inbox", url: "/patient/dashboard/messages" },
        { title: "Compose", url: "/patient/dashboard/messages/compose" },
      ],
    },
    {
      title: "Lab Results",
      url: "/patient/dashboard/labs",
      icon: FlaskConical,
      items: [
        { title: "Recent", url: "/patient/dashboard/labs" },
        { title: "All Results", url: "/patient/dashboard/labs/all" },
      ],
    },
    {
      title: "Medications",
      url: "/patient/dashboard/medications",
      icon: Pill,
      items: [
        { title: "Active", url: "/patient/dashboard/medications" },
        { title: "Refills", url: "/patient/dashboard/medications/refills" },
      ],
    },
    {
      title: "Documents",
      url: "/patient/dashboard/documents",
      icon: FileText,
      items: [
        { title: "Forms", url: "/patient/dashboard/documents/forms" },
        { title: "Records", url: "/patient/dashboard/documents/records" },
      ],
    },
    {
      title: "Billing",
      url: "/patient/dashboard/billing",
      icon: Receipt,
      items: [
        { title: "Statements", url: "/patient/dashboard/billing" },
        { title: "Payments", url: "/patient/dashboard/billing/payments" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
      items: [
        { title: "Preferences", url: "/settings" },
      ],
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


