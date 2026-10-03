import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium">Not found</p>
      <p className="text-xs text-muted-foreground">That page or task doesn’t exist.</p>
      <Button size="sm" variant="outline" render={<Link href="/inbox" />}>
        Go to inbox
      </Button>
    </div>
  );
}
