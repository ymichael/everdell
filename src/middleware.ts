import { NextRequest, NextResponse } from "next/server";
import { acceptLanguage } from "./accept-header";

// I consiously duplicate these from i18n config because middleware sees this config as undefined. Obviously, in order to perform custom locale processing middleware must be able to access this config. I hope it is due to me not being able to understand how to actually achieve that.
export const locales = ["en-US", "ru-RU", "pt-BR"];
export const defaultLocale = "en-US";

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
  const parts = locale.split("-");
  let localeWithUpperCaseEnding =
    parts.length > 1 ? `${parts[0]}-${parts[1].toUpperCase()}` : locale;

  if (
    locales.every((loc) => {
      return localeWithUpperCaseEnding !== loc;
    })
  )
    localeWithUpperCaseEnding = defaultLocale;

  if (req.nextUrl.toString().includes(`/${localeWithUpperCaseEnding}`)) return;

  if (req.nextUrl.locale !== localeWithUpperCaseEnding) {
    return NextResponse.redirect(
      new URL(
        `/${localeWithUpperCaseEnding}${req.nextUrl.pathname}${req.nextUrl.search}`,
        req.url
      )
    );
  }
}
