import { ArrowUpRight, BookOpenCheck, Clock3, Sparkles, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpis = [
  { label: "Papers Read", value: "184", change: "+12 this week", icon: BookOpenCheck },
  { label: "Research Gaps Found", value: "27", change: "+4 this week", icon: Sparkles },
  { label: "Experiments Planned", value: "13", change: "+2 this week", icon: Target },
  { label: "Deadlines", value: "6", change: "2 this month", icon: Clock3 }
];

const modules = [
  "AI PDF Reader",
  "Research Gap Finder",
  "Reviewer Simulator",
  "Paper Scoring",
  "Experiment Planner",
  "Academic Writer"
];

export default function DashboardPage() {
  return (
    <>
      <header className="rounded-2xl border border-border bg-card p-6">
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Welcome back</p>
        <h2 className="text-2xl font-semibold">Your AI Research Assistant from Idea to Publication</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Manage projects, digest papers, discover research opportunities, and prepare publication-ready
          manuscripts in one intelligent workspace.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">{kpi.label}</CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.change}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <Button variant="ghost" size="sm">
              View all <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "LLM Reliability in Scientific Workflows", status: "Drafting methodology" },
              { name: "Neural Compression for Edge Devices", status: "Preparing camera-ready version" },
              { name: "Healthcare Causal Discovery Benchmark", status: "Running final experiments" }
            ].map((project) => (
              <div key={project.name} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{project.name}</p>
                <p className="text-xs text-muted-foreground">{project.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Modules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {modules.map((module) => (
              <div
                key={module}
                className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
              >
                {module}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
