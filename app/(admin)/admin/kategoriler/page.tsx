import { listCategories } from "@/lib/queries";
import { CategoryManager } from "@/components/admin/CategoryManager";

export default async function CategoriesPage() {
  const categories = await listCategories();
  return <CategoryManager initialCategories={categories} />;
}
