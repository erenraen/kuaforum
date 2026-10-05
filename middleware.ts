import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /panel/* (işletme paneli) ve /admin/* (platform admin paneli) girişsiz
// kullanıcılara kapalıdır. Diğer her şey (keşif, işletme detay, randevu alma)
// herkese açıktır.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsBusinessAuth = path.startsWith("/panel");
  const needsAdminAuth = path.startsWith("/admin") && path !== "/admin/giris";

  if ((needsBusinessAuth || needsAdminAuth) && !user) {
    const loginUrl = new URL(needsAdminAuth ? "/admin/giris" : "/giris", request.url);
    loginUrl.searchParams.set("sonra", path);
    return NextResponse.redirect(loginUrl);
  }

  if (needsAdminAuth && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin" && path !== "/admin/giris") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/panel/:path*", "/admin/:path*"],
};
