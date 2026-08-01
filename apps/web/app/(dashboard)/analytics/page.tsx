import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Research Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Track reading velocity, writing throughput, experiment completion, and publication readiness with
          team and individual insights.
        </p>
      </CardContent>
    </Card>
  );
}
