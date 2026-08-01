import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChatPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Context-Aware AI Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Chat over uploaded PDFs with retrieval augmentation from Qdrant embeddings and persistent
          conversation history in PostgreSQL.
        </p>
      </CardContent>
    </Card>
  );
}
