import { NextRequest, NextResponse } from "next/server";
import { acceptLanguage } from "./accept-header";

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
  if (
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.includes("/api/") ||
    PUBLIC_FILE.test(req.nextUrl.pathname)
  ) {
    return;
  }

  const localeHeader = req.headers.get("accept-language");
  if (localeHeader === null) return;
  const locale = acceptLanguage(localeHeader);
  const parts = locale.split('-');
  const newLocale = parts.length > 1 ? `${parts[0]}-${parts[1].toUpperCase()}` : locale;
  
  if (req.nextUrl.locale !== newLocale) {
    return NextResponse.redirect(
      new URL(`/${newLocale}${req.nextUrl.pathname}${req.nextUrl.search}`, req.url)
    );
  }
}
