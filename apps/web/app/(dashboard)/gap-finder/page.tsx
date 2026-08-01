import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GapFinderPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Research Gap Finder</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Submit multi-paper contexts to `/v1/intelligence/gap-finder` to generate ranked gaps with
          confidence, commercial potential, and patent opportunity scoring.
        </p>
      </CardContent>
    </Card>
  );
}
