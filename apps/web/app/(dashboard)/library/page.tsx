import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LibraryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Library</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Upload, organize, annotate, and search your papers. The API endpoint `/v1/papers/upload`
          supports ingestion and vector indexing for RAG workflows.
        </p>
      </CardContent>
    </Card>
  );
}
