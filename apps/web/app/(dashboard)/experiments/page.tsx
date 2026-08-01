import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExperimentsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiment Planner</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Design hypotheses, variables, datasets, metrics, and timelines. This module builds on the same
          project/task domain models exposed by the API.
        </p>
      </CardContent>
    </Card>
  );
}
