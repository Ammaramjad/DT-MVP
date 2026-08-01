import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Manage profile, subscriptions, notification preferences, provider keys, and organization-level
          security controls.
        </p>
      </CardContent>
    </Card>
  );
}
