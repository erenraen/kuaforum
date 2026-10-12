import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Instagram biyografisine eklenebilecek kısa link: kuaforum.com/r/gozde-barber
export default async function ShortLinkRedirect({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("businesses")
    .select("slug")
    .eq("short_code", params.slug)
    .maybeSingle();

  if (!data) notFound();
  redirect(`/isletme/${data.slug}`);
}
