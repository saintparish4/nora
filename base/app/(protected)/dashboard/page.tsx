'use client';

import { PatientSidebar } from "@/components/patient-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { CalendarDays, FlaskConical, MessageSquare, Receipt, Stethoscope } from "lucide-react"

export default function Page() {
  return (
    <SidebarProvider suppressHydrationWarning>
      <PatientSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <div className="flex flex-col gap-1 px-1">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Here's what's next in your care journey.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next appointment</CardTitle>
                <CalendarDays className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Thu, 2:30 PM</div>
                <p className="text-muted-foreground text-xs">Annual physical</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-muted-foreground text-xs">New messages to read</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lab results</CardTitle>
                <FlaskConical className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2</div>
                <p className="text-muted-foreground text-xs">Ready for review</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billing</CardTitle>
                <Receipt className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$120.00</div>
                <p className="text-muted-foreground text-xs">Balance due</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Stethoscope className="text-muted-foreground size-4" />
                  <CardTitle>Upcoming appointments</CardTitle>
                </div>
                <CardDescription>Your next visits and preparation details</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="divide-border grid gap-4 divide-y">
                  <div className="flex items-center justify-between pt-0">
                    <div>
                      <div className="font-medium">Annual physical</div>
                      <div className="text-muted-foreground">Thu, 2:30 PM • Primary Care</div>
                    </div>
                    <a className="text-primary text-sm" href="#">View details</a>
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <div className="font-medium">Follow-up</div>
                      <div className="text-muted-foreground">Nov 5, 10:00 AM • Telehealth</div>
                    </div>
                    <a className="text-primary text-sm" href="#">View details</a>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FlaskConical className="text-muted-foreground size-4" />
                  <CardTitle>Recent lab results</CardTitle>
                </div>
                <CardDescription>Highlights from your latest tests</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span>Hemoglobin A1c</span>
                    <span className="text-muted-foreground">5.6%</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span>Lipid panel (LDL)</span>
                    <span className="text-muted-foreground">88 mg/dL</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

