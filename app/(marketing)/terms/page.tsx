import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/marketing/legal-document";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export const metadata: Metadata = {
  title: "Terms of Service — FloPilot.io",
  description:
    "Terms governing use of the FloPilot shop operations platform, including optional QuickBooks and other integrations.",
};

const UPDATED = "July 15, 2026";
const CONTACT = "info@flopilot.io";

export default function TermsOfServicePage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description={`Last updated ${UPDATED}. These terms are the end-user license agreement for using FloPilot.`}
      />
      <LegalDocument>
        <section>
          <h2>1. Agreement</h2>
          <p>
            These Terms of Service (“Terms”) are a binding agreement between you
            (the individual or shop/business you represent) and FloPilot
            (“FloPilot,” “we,” “us,” or “our”) for use of the FloPilot websites,
            apps, and related services (the “Service”).
          </p>
          <p>
            By creating an account, accessing, or using the Service, you agree to
            these Terms and our{" "}
            <Link href="/privacy">Privacy Policy</Link>. If you are accepting on
            behalf of a company, you represent that you have authority to bind
            that company.
          </p>
        </section>

        <section>
          <h2>2. The Service</h2>
          <p>
            FloPilot provides software tools for shop operations such as orders,
            estimates, production coordination, customers, files, reporting, and
            optional third-party integrations (including QuickBooks Online).
            Features may change as we improve the product. We may add, modify, or
            discontinue features with reasonable notice when practical.
          </p>
        </section>

        <section>
          <h2>3. Accounts and workspaces</h2>
          <ul>
            <li>
              You must provide accurate account information and keep it updated.
            </li>
            <li>
              You are responsible for activity under your accounts and for
              maintaining the confidentiality of credentials.
            </li>
            <li>
              Shop admins are responsible for inviting/removing staff and
              managing permissions inside their workspace.
            </li>
            <li>
              You must be old enough to form a binding contract in your
              jurisdiction and use the Service only for lawful business purposes.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. License</h2>
          <p>
            Subject to these Terms, FloPilot grants you a limited, non-exclusive,
            non-transferable, revocable license to access and use the Service for
            your internal business operations. We retain all rights in the
            Service, software, branding, and documentation. You may not copy,
            modify, reverse engineer, sublicense, or resell the Service except as
            allowed by law or with our written permission.
          </p>
        </section>

        <section>
          <h2>5. Your content and data</h2>
          <p>
            You retain ownership of customer, order, artwork, and other business
            data you submit (“Customer Data”). You grant FloPilot a worldwide
            license to host, process, transmit, and display Customer Data solely
            to provide and improve the Service and as otherwise described in the
            Privacy Policy.
          </p>
          <p>
            You represent that you have the rights and consents needed to upload
            and process Customer Data in FloPilot, including any personal data
            about your customers or staff.
          </p>
        </section>

        <section>
          <h2>6. Integrations (including QuickBooks)</h2>
          <p>
            Optional integrations connect FloPilot to third-party services. By
            connecting an integration, you authorize FloPilot to access and
            exchange data with that service as needed to perform the actions you
            request (for example, creating or updating QuickBooks estimates or
            invoices).
          </p>
          <ul>
            <li>
              Third-party services are governed by their own terms and privacy
              policies. FloPilot is not responsible for those services.
            </li>
            <li>
              You are responsible for verifying documents pushed to QuickBooks
              before treating them as final for accounting, tax, or customer
              billing.
            </li>
            <li>
              Re-syncing or updating a linked document may overwrite fields in
              the third-party system according to how you use the integration.
            </li>
            <li>
              You can disconnect integrations in Settings. Disconnecting does not
              automatically delete records already created in the third-party
              system.
            </li>
          </ul>
        </section>

        <section>
          <h2>7. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service unlawfully or to infringe others’ rights</li>
            <li>Attempt unauthorized access to accounts, systems, or data</li>
            <li>
              Interfere with or disrupt the Service, or reverse engineer it
              beyond what law allows
            </li>
            <li>
              Upload malware, or use the Service to spam or harass anyone
            </li>
            <li>
              Misrepresent your identity or your authority to connect a
              third-party accounting company
            </li>
          </ul>
        </section>

        <section>
          <h2>8. Fees</h2>
          <p>
            If you purchase a paid plan, you agree to the pricing, billing terms,
            and taxes presented at purchase or in an order form. Unless stated
            otherwise, fees are non-refundable. We may change pricing with notice
            for upcoming renewal periods.
          </p>
        </section>

        <section>
          <h2>9. Confidentiality</h2>
          <p>
            Each party may receive confidential information from the other.
            Neither party will use or disclose that information except to perform
            under these Terms or as required by law. Customer Data is your
            confidential information.
          </p>
        </section>

        <section>
          <h2>10. Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM
            EXTENT PERMITTED BY LAW, FLOPILOT DISCLAIMS ALL WARRANTIES, EXPRESS
            OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE OR
            ANY INTEGRATION WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT OUTPUT
            (INCLUDING ACCOUNTING DOCUMENTS) WILL MEET YOUR REQUIREMENTS WITHOUT
            YOUR REVIEW.
          </p>
        </section>

        <section>
          <h2>11. Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLOPILOT AND ITS AFFILIATES
            WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR
            BUSINESS, ARISING FROM OR RELATED TO THE SERVICE OR THESE TERMS.
          </p>
          <p>
            OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THE SERVICE OR THESE
            TERMS WILL NOT EXCEED THE AMOUNTS YOU PAID TO FLOPILOT FOR THE
            SERVICE IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO
            LIABILITY (OR USD $100 IF YOU HAVE NOT PAID ANY FEES).
          </p>
        </section>

        <section>
          <h2>12. Indemnity</h2>
          <p>
            You will defend and indemnify FloPilot against claims arising from
            your Customer Data, your use of the Service, your misuse of
            integrations, or your violation of these Terms or applicable law,
            except to the extent caused by FloPilot’s willful misconduct.
          </p>
        </section>

        <section>
          <h2>13. Suspension and termination</h2>
          <p>
            You may stop using the Service at any time. We may suspend or
            terminate access if you breach these Terms, create risk/harm, or if
            we discontinue the Service. Upon termination, your license ends.
            Sections that by nature should survive (including ownership,
            disclaimers, liability limits, and indemnity) will survive.
          </p>
        </section>

        <section>
          <h2>14. Changes to Terms</h2>
          <p>
            We may update these Terms by posting a revised version on this page
            and updating the “Last updated” date. Continued use after the
            effective date constitutes acceptance. If you do not agree, stop using
            the Service.
          </p>
        </section>

        <section>
          <h2>15. Governing law</h2>
          <p>
            These Terms are governed by the laws of the State of California,
            excluding conflict-of-law rules, unless mandatory local law requires
            otherwise. Courts located in California will have exclusive
            jurisdiction, except where applicable law gives you a right to bring
            claims in your local courts.
          </p>
        </section>

        <section>
          <h2>16. Contact</h2>
          <p>
            FloPilot — Legal / Terms
            <br />
            Email: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
            <br />
            Website: <Link href="/">https://flopilot.io</Link>
          </p>
          <p>
            Related: <Link href="/privacy">Privacy Policy</Link>
          </p>
        </section>
      </LegalDocument>
    </>
  );
}
