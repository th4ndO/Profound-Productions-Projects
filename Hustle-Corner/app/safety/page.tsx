import Link from "next/link";
import { APP_NAME } from "@/config";

export const metadata = { title: `Safety Tips · ${APP_NAME}` };

export default function SafetyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Staying Safe</h1>

      <div className="space-y-8 text-gray-700">
        <p className="leading-relaxed">
          {APP_NAME} helps you find sellers, but every deal happens directly
          between you and them over WhatsApp. A few basics to keep in mind:
        </p>

        <ul className="list-disc space-y-4 pl-5 leading-relaxed">
          <li>
            <strong className="text-gray-900">Meet in public or shared spaces</strong>{" "}
            where possible — a res common room, a campus café, somewhere with
            other people around.
          </li>
          <li>
            <strong className="text-gray-900">Don&apos;t pay large deposits upfront.</strong>{" "}
            A small deposit for materials is normal for some services, but be
            cautious of anyone asking for full payment before doing any work.
          </li>
          <li>
            <strong className="text-gray-900">Check reviews first.</strong> A seller
            with real reviews from other students is a good sign.
          </li>
          <li>
            <strong className="text-gray-900">Report problems.</strong> If something
            feels off — a seller who doesn&apos;t deliver, asks for something
            outside the listed service, or makes you uncomfortable — use the
            &quot;Report this listing&quot; link on their profile.
          </li>
        </ul>

        <p className="border-t border-gray-100 pt-8 leading-relaxed">
          Questions or something urgent? Contact your campus security or
          student affairs office directly — {APP_NAME} is a directory, not an
          emergency service.
        </p>

        <p className="text-sm text-gray-500">
          See also our{" "}
          <Link href="/terms" className="text-brand-600 underline">
            Terms of Use
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand-600 underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
