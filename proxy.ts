import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  if (!req.cookies.get("session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// S'applique à tout sauf : la page de connexion, la sonde, et les fichiers internes de Next.js
export const config = {
  matcher: ["/((?!connexion|api/check|api/status|_next/static|_next/image|favicon.ico).*)"],
};