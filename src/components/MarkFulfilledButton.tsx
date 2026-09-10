"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markOrderFulfilled } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";

export function MarkFulfilledButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={isPending}
      className="text-indigo-400 hover:text-indigo-300"
      onClick={() => {
        startTransition(async () => {
          const result = await markOrderFulfilled(orderId);
          if ("error" in result) {
            alert(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      {isPending ? "Marking..." : "Mark Fulfilled"}
    </Button>
  );
}
