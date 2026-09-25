import { APP_NAME } from "@/config";

export const metadata = { title: `Terms of Use · ${APP_NAME}` };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        TODO: review before launch
      </p>
      <h1 className="mb-8 text-2xl font-bold">Terms of Use</h1>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">What {APP_NAME} is</h2>
          <p className="leading-relaxed">
            {APP_NAME} is a directory that helps students at the University
            of Pretoria (Hatfield) find and list side-hustle services. We
            don&apos;t process payments or act as a party to any transaction
            between a buyer and a seller — the actual service, and any
            money that changes hands for it, is arranged directly between
            you and the seller, over WhatsApp.
          </p>
        </section>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Appointments</h2>
          <p className="leading-relaxed">
            Some sellers let you request an appointment time through{" "}
            {APP_NAME}. Requesting a slot isn&apos;t a guarantee — the seller
            still has to confirm it, and either side can cancel. {APP_NAME}
            schedules the time; it doesn&apos;t manage payment, enforce a
            cancellation policy, or take responsibility if a seller or buyer
            doesn&apos;t show up. Sort that out directly with each other, the
            same as any other part of the arrangement.
          </p>
        </section>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Sellers</h2>
          <p className="leading-relaxed">
            By listing on {APP_NAME}, you agree that your business
            information, prices, photos, and WhatsApp number will be shown
            publicly, and that the information you provide is accurate.
            Listings are reviewed before going live and can be hidden or
            removed if they violate these terms or campus policies.
          </p>
        </section>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Reviews</h2>
          <p className="leading-relaxed">
            Reviews must reflect a genuine experience with the seller. Fake,
            abusive, or unrelated reviews may be removed, and repeated abuse
            may result in account suspension.
          </p>
        </section>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">No warranty</h2>
          <p className="leading-relaxed">
            {APP_NAME} is provided as-is. We don&apos;t guarantee the quality,
            safety, or legality of any listed service — see our{" "}
            <a href="/safety" className="text-brand-600 underline">
              Safety page
            </a>{" "}
            for guidance on meeting sellers safely.
          </p>
        </section>

        <p className="border-t border-gray-100 pt-8 text-sm text-gray-500">
          TODO: have these terms reviewed properly (e.g. by a lawyer or the
          university&apos;s student affairs office) before real launch.
        </p>
      </div>
    </main>
  );
}
