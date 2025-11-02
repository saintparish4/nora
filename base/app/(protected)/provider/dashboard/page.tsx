'use client';

import React from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import data from "./data.json";

export default function Page() {
  const toNumber = (value: string) => {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }

  const byHeader = Object.fromEntries(
    data.map((d) => [d.header, d])
  ) as Record<string, (typeof data)[number]>

  const todaysAppointments = toNumber(byHeader["Today's Appointments"]?.target || "0")
  const checkedIn = toNumber(byHeader["Checked-in Patients"]?.target || "0")
  const avgWaitMin = toNumber(byHeader["Average Wait Time (min)"]?.target || "0")
  const noShowPct = byHeader["No-show Rate (%)"]?.target || "0"

  const cards = [
    {
      description: "Today's Appointments",
      value: String(todaysAppointments),
      trendLabel: "+3%",
      trendDirection: "up" as const,
      subtext: "vs. last Thursday",
    },
    {
      description: "Checked-in",
      value: String(checkedIn),
      trendLabel: "+1%",
      trendDirection: "up" as const,
      subtext: "arrived and waiting",
    },
    {
      description: "Avg. Wait (min)",
      value: String(avgWaitMin),
      trendLabel: "-2 min",
      trendDirection: "down" as const,
      subtext: "lower is better",
    },
    {
      description: "No-show Rate",
      value: `${noShowPct}%`,
      trendLabel: "-0.3%",
      trendDirection: "down" as const,
      subtext: "past 7 days",
    },
  ]

  // Build a lightweight synthetic series using today's totals
  const base = todaysAppointments || 20
  const series = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    const desktop = Math.max(5, Math.round(base * (0.8 + Math.sin(i / 5) * 0.1)))
    const mobile = Math.max(3, Math.round(base * (0.4 + Math.cos(i / 7) * 0.1)))
    return {
      date: date.toISOString().slice(0, 10),
      desktop,
      mobile,
    }
  })

  return (
    <SidebarProvider
      suppressHydrationWarning
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight">Provider Dashboard</h1>
                  <p className="text-muted-foreground">
                    Today at a glance: appointments, wait times, follow-ups, labs, and messages.
                  </p>
                </div>
              </div>
              <SectionCards cards={cards} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive title="Appointments trend" data={series} />
              </div>
              <div className="px-4 lg:px-6">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-lg font-medium">Worklist</h2>
                  <p className="text-muted-foreground text-sm">Actionable items across your clinic</p>
                </div>
                <DataTable data={data} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}