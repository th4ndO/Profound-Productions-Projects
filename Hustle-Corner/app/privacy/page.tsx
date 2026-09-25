import { APP_NAME } from "@/config";

export const metadata = { title: `Privacy Policy · ${APP_NAME}` };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        TODO: review before launch
      </p>
      <h1 className="mb-8 text-2xl font-bold">Privacy Policy</h1>

      <div className="space-y-8 text-gray-700">
        <p className="leading-relaxed">
          This policy explains what {APP_NAME} collects, why, and how you can
          have it removed. {APP_NAME} operates for students at the University
          of Pretoria (Hatfield) and aims to collect only what&apos;s needed
          to run the directory.
        </p>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">What we collect</h2>
          <ul className="list-disc space-y-2 pl-5 leading-relaxed">
            <li>Your name and email address, when you create an account.</li>
            <li>
              If you become a seller: your business name, bio, WhatsApp
              number, area note, category, services, prices, and any photos
              you upload.
            </li>
            <li>Reviews and ratings you leave, and reports you submit.</li>
            <li>
              Basic usage events (profile views, WhatsApp button clicks) tied
              to a seller listing, not to you personally as a visitor.
            </li>
          </ul>
        </section>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Why we collect it</h2>
          <p className="leading-relaxed">
            To run the directory: showing seller listings to buyers, letting
            sellers manage their profile, verifying reviewers are real
            students, and showing sellers how many people viewed their
            listing or messaged them.
          </p>
        </section>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">What&apos;s public</h2>
          <p className="leading-relaxed">
            A seller&apos;s business name, bio, area note, category, services,
            prices, photos, WhatsApp number, and reviews are shown publicly
            on their profile. Your name and email as a student account are
            never shown publicly unless you leave a review (your name is
            shown alongside it) or become a seller.
          </p>
        </section>

        <section className="border-t border-gray-100 pt-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Requesting deletion
          </h2>
          <p className="leading-relaxed">
            You can delete your account and seller profile at any time from
            your dashboard, which also removes your uploaded photos. If you
            need help, TODO: add a contact email here before launch.
          </p>
        </section>
      </div>
    </main>
  );
}
