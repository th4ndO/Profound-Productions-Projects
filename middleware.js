import { NextResponse } from "next/server";

export function middleware(request) {
  const user = process.env.AUTH_USER;
  const pass = process.env.AUTH_PASSWORD;

  if (!user || !pass) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header) {
    const value = header.split(" ")[1] || "";
    const [reqUser, reqPass] = atob(value).split(":");
    if (reqUser === user && reqPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="House Sookoo Data Tracker"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
