import { listCities, listDistrictsByCity } from "@/lib/queries";
import { CityDistrictManager } from "@/components/admin/CityDistrictManager";

export default async function CityDistrictPage() {
  const [cities, districtsByCity] = await Promise.all([listCities(), listDistrictsByCity()]);
  return <CityDistrictManager initialCities={cities} districtsByCity={districtsByCity} />;
}
