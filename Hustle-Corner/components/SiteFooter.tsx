import Link from "next/link";
import { APP_NAME } from "@/config";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
      <p>
        <Link href="/safety" className="hover:text-gray-700">
          Safety
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:text-gray-700">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-gray-700">
          Terms
        </Link>
      </p>
      <p className="mt-2">© {new Date().getFullYear()} {APP_NAME}</p>
    </footer>
  );
}
