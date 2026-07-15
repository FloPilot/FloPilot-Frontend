import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/marketing/legal-document";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export const metadata: Metadata = {
  title: "Privacy Policy — FloPilot.io",
  description:
    "How FloPilot collects, uses, and protects information when you use our shop operations platform and integrations like QuickBooks.",
};

const UPDATED = "July 15, 2026";
const CONTACT = "info@flopilot.io";

export default function PrivacyPolicyPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description={`Last updated ${UPDATED}. This policy explains how FloPilot handles information for shops using our platform.`}
      />
      <LegalDocument>
        <section>
          <h2>1. Who we are</h2>
          <p>
            FloPilot (“FloPilot,” “we,” “us,” or “our”) provides software for
            decorated apparel and print shops to manage orders, production,
            customers, and related shop operations, including optional
            connections to third-party services such as QuickBooks Online.
          </p>
          <p>
            Questions about this policy:{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </section>

        <section>
          <h2>2. Information we collect</h2>
          <p>Depending on how you use FloPilot, we may collect:</p>
          <ul>
            <li>
              <strong>Account &amp; shop information</strong> — names, emails,
              phone numbers, shop/company details, roles, and login credentials
              (or authentication tokens from our identity provider).
            </li>
            <li>
              <strong>Business data you enter</strong> — customers, orders,
              estimates, invoices, artwork metadata, production schedules,
              inventory-related data, and shop settings.
            </li>
            <li>
              <strong>Integration data</strong> — when you connect QuickBooks or
              other integrations, we receive authorization tokens and sync the
              accounting data needed to create or update customers, estimates,
              invoices, and related records you choose to send.
            </li>
            <li>
              <strong>Usage &amp; device data</strong> — approximate logs such as
              IP address, browser/app type, timestamps, and product usage events
              used for security, reliability, and improvement.
            </li>
            <li>
              <strong>Support communications</strong> — messages you send us
              about your account or shop.
            </li>
          </ul>
        </section>

        <section>
          <h2>3. How we use information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Provide, operate, and improve the FloPilot service</li>
            <li>Authenticate users and secure accounts and shop workspaces</li>
            <li>
              Power features you enable, including pushing estimates/invoices to
              QuickBooks and other integrations
            </li>
            <li>Send service-related notices (security, billing, product changes)</li>
            <li>Provide customer support</li>
            <li>Detect, prevent, and investigate abuse or security issues</li>
            <li>Comply with law and enforce our Terms of Service</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your personal information.
          </p>
        </section>

        <section>
          <h2>4. QuickBooks and other integrations</h2>
          <p>
            If you connect QuickBooks Online, FloPilot acts on your instructions
            to exchange the data needed for that connection (for example,
            customer display names and estimate/invoice line items you push).
            Connection tokens are stored securely for your shop workspace.
            You can disconnect QuickBooks at any time in FloPilot settings;
            disconnecting stops future sync and we stop using those tokens for
            new requests.
          </p>
          <p>
            Third-party services (including Intuit/QuickBooks) have their own
            privacy policies. Their handling of data in their systems is governed
            by those policies.
          </p>
        </section>

        <section>
          <h2>5. Sharing</h2>
          <p>We may share information with:</p>
          <ul>
            <li>
              <strong>Service providers</strong> who help us host, operate,
              secure, or support FloPilot (under contractual obligations to
              protect data)
            </li>
            <li>
              <strong>Integration partners you connect</strong> (such as Intuit
              QuickBooks) to perform the actions you request
            </li>
            <li>
              <strong>Professional advisors</strong> or authorities when required
              by law, or to protect rights, safety, and security
            </li>
            <li>
              <strong>A successor</strong> in connection with a merger,
              acquisition, or asset transfer, subject to this policy’s
              protections
            </li>
          </ul>
          <p>
            Shop admins control who on their team can access shop data inside
            FloPilot.
          </p>
        </section>

        <section>
          <h2>6. Retention</h2>
          <p>
            We retain information for as long as your account/workspace is active
            and as needed to provide the service, meet legal obligations, resolve
            disputes, and enforce agreements. You may request deletion of your
            account/workspace data by contacting{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, subject to legal and
            operational retention requirements.
          </p>
        </section>

        <section>
          <h2>7. Security</h2>
          <p>
            We use administrative, technical, and organizational measures
            designed to protect information (including encrypted transport and
            access controls). No method of transmission or storage is completely
            secure; please use strong passwords and protect your login.
          </p>
        </section>

        <section>
          <h2>8. Your choices</h2>
          <ul>
            <li>Update account and shop profile information in FloPilot</li>
            <li>Disconnect integrations such as QuickBooks in settings</li>
            <li>
              Request access, correction, or deletion by emailing{" "}
              <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
            </li>
          </ul>
          <p>
            If you are in a region with additional privacy rights (for example
            CCPA/CPRA or GDPR-like rights), contact us and we will honor
            applicable requests as required by law.
          </p>
        </section>

        <section>
          <h2>9. Children</h2>
          <p>
            FloPilot is a business service and is not directed to children under
            13 (or the minimum age required in your jurisdiction). We do not
            knowingly collect personal information from children.
          </p>
        </section>

        <section>
          <h2>10. Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the
            updated version on this page and revise the “Last updated” date.
            Continued use of FloPilot after changes means you accept the updated
            policy.
          </p>
        </section>

        <section>
          <h2>11. Contact</h2>
          <p>
            FloPilot — Privacy inquiries
            <br />
            Email: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
            <br />
            Website: <Link href="/">https://flopilot.io</Link>
          </p>
          <p>
            Related: <Link href="/terms">Terms of Service</Link>
          </p>
        </section>
      </LegalDocument>
    </>
  );
}
