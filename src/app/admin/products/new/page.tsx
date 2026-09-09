import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewProductForm } from "./NewProductForm";

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/products/new");
  }

  return <NewProductForm />;
}
