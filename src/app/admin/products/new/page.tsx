import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewProductForm } from "./NewProductForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/products/new");
  }

  if (session.user.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-lg px-6 py-24">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">403 — Forbidden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your account ({session.user.email}) doesn&apos;t have admin access. Only
              accounts with the admin role can create products.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <NewProductForm />;
}
