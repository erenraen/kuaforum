import { listCities, listDistrictsByCity, listCategories } from "@/lib/queries";
import { NewBusinessForm } from "@/components/admin/NewBusinessForm";

export default async function NewBusinessPage() {
  const [cities, districtsByCity, categories] = await Promise.all([
    listCities(),
    listDistrictsByCity(),
    listCategories(),
  ]);

  return <NewBusinessForm cities={cities} districtsByCity={districtsByCity} categories={categories} />;
}
