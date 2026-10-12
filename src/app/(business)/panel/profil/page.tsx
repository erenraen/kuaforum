import { getCurrentBusiness } from "@/lib/business";
import { ProfileEditor } from "@/components/business/ProfileEditor";

export default async function ProfilePage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;
  return <ProfileEditor business={business} />;
}
