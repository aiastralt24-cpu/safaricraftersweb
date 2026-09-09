import type { Metadata } from "next";
import "./privacy.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Safari Crafters collects, uses, stores and protects personal data.",
  alternates: { canonical: "/legal/privacy" }
};

const dataCategories = [
  ["Identity data", "Your first name, maiden name, last name or similar identifiers, marital status, title, date of birth and gender."],
  ["Contact data", "Your home or business address, email address and telephone numbers."],
  ["Financial data", "Your bank account and payment-card details. We do not retain or store credit-card details unless authorised to retain them as a security deposit."],
  ["Transaction data", "Details about payments to and from you, and the products and services you have purchased from us."],
  ["Technical data", "Your IP address, login data, browser type and version, time-zone setting and location, browser plug-ins, operating system, platform and other technology used to access this website."],
  ["Usage data", "Information about how you use our website, products and services."],
  ["Marketing and communications data", "Your preferences for receiving marketing from us and your communication preferences."]
];

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <header className="privacy-hero">
        <div className="container privacy-hero-grid">
          <p className="privacy-kicker">Legal &amp; privacy</p>
          <div><h1>Privacy Policy</h1><p>How Safari Crafters collects, manages and protects your personal data.</p></div>
        </div>
      </header>

      <div className="container privacy-layout">
        <aside aria-label="Privacy policy contents">
          <p>On this page</p>
          <a href="#introduction">Introduction</a>
          <a href="#information">Information we collect</a>
          <a href="#collection">How information is collected</a>
          <a href="#use">How we use information</a>
          <a href="#sharing">Sharing and transfers</a>
          <a href="#security">Security and retention</a>
        </aside>

        <article className="privacy-document">
          <section id="introduction">
            <p className="privacy-label">Safari Crafters · the Company</p>
            <h2>Our commitment to your privacy</h2>
            <p>Safari Crafters (referred to as the “Company”, “we”, “us” or “our”) respects your privacy and is committed to protecting your personal data. This notice explains how we look after your personal data when you visit our website, regardless of where you visit it from, or provide personal data to us by other means, including by telephone. It also explains your privacy rights and how the law protects you.</p>
            <p>This notice describes how we collect, manage and process personal data, including information you provide when purchasing travel arrangements. Please read it together with any other privacy or fair-processing notice supplied when we collect your data. Those notices supplement this policy and do not override it.</p>
            <h3>Minors</h3>
            <p>This website is not intended for minors as defined by the Indian Contract Act, 1872. We collect information relating to children or minors only when an adult who is legally competent to enter into a contract makes a booking for them.</p>
            <h3>Third-party links</h3>
            <p>Our website may contain links to third-party websites, plug-ins and applications. Those services may collect or share information about you. We do not control third-party websites and are not responsible for their privacy statements. We encourage you to read the privacy notice of each website you visit.</p>
          </section>

          <section id="information">
            <p className="privacy-label">Personal information</p>
            <h2>The data we collect</h2>
            <p>Personal data means information from which an individual can be identified. It does not include information where the identity has been removed.</p>
            <div className="privacy-data-grid">
              {dataCategories.map(([title, copy]) => <div key={title}><h3>{title}</h3><p>{copy}</p></div>)}
            </div>
            <h3>Aggregated data</h3>
            <p>We may collect, use and share statistical or demographic information. Aggregated data may be derived from personal data but is not treated as personal data in law when it does not directly or indirectly reveal your identity.</p>
            <h3>Special categories of personal data</h3>
            <p>To assess whether a journey is suitable and provide an appropriate service, we may need information about dietary requirements, health, race or ethnicity, religious or philosophical beliefs, gender or sexual orientation. We collect and process sensitive personal data only where strictly necessary and with your explicit consent. You are not required to consent, and you may withdraw consent at any time.</p>
            <p>This information is handled in accordance with the Information Technology Act, 2000 and rules amended from time to time.</p>
          </section>

          <section id="collection">
            <p className="privacy-label">Collection</p>
            <h2>How your personal data reaches us</h2>
            <h3>Direct interactions</h3>
            <p>You may provide identity, contact and financial information when you:</p>
            <ul>
              <li>make a booking or request a travel quotation;</li>
              <li>subscribe to a newsletter or request marketing;</li>
              <li>enter a competition, promotion or survey;</li>
              <li>provide feedback; or</li>
              <li>use our online payment or client portals.</li>
            </ul>
            <h3>Automated technologies</h3>
            <p>As you interact with our website, we may automatically collect technical information about your equipment, browsing actions and patterns through cookies or similar technologies.</p>
            <h3>Third-party sources</h3>
            <p>From time to time we may run competitions with third parties and receive participant information. Participants are given the opportunity to opt in or out of communications from us.</p>
          </section>

          <section id="use">
            <p className="privacy-label">Use of information</p>
            <h2>How we use your personal data</h2>
            <p>We use personal data only where the law allows us to: perform a contract we are entering into or have entered into with you; pursue our legitimate interests or those of a third party where your rights do not override those interests; or comply with a legal or regulatory obligation.</p>
            <p>We generally rely on consent only for direct marketing by email or text. You may withdraw marketing consent at any time by contacting <a href="mailto:info@safaricrafters.in">info@safaricrafters.in</a>.</p>
            <h3>Marketing and promotional offers</h3>
            <p>We may use identity, contact, technical, usage and profile information to understand which services and offers may interest you. You will receive marketing communications only where you have requested information or purchased services and have opted in to receive marketing.</p>
            <h3>Opting out</h3>
            <p>You may stop marketing messages by using the unsubscribe link in a message or emailing <a href="mailto:info@safaricrafters.in">info@safaricrafters.in</a>. Opting out does not affect personal data supplied in connection with a booking or other transaction.</p>
            <h3>Cookies</h3>
            <p>You can configure your browser to refuse some or all cookies or alert you when websites set or access cookies. Disabling cookies may cause parts of this website to become inaccessible or function incorrectly.</p>
            <h3>Change of purpose</h3>
            <p>We use personal data for the purpose for which it was collected unless another use is reasonably compatible with that purpose. You may contact us for an explanation. If we need to use information for an unrelated purpose, we will notify you and explain the legal basis. We may process information without your knowledge or consent where the law requires or permits it.</p>
          </section>

          <section id="sharing">
            <p className="privacy-label">Disclosure</p>
            <h2>Sharing and international transfers</h2>
            <p>We may share your personal data with necessary legal and consular authorities where circumstances warrant it and the governing laws of India require or permit us to do so.</p>
            <h3>International travel</h3>
            <p>When you travel outside India, we may transfer your personal data outside India where necessary to fulfil our contract with you.</p>
          </section>

          <section id="security">
            <p className="privacy-label">Safeguards</p>
            <h2>Data security and retention</h2>
            <p>We use appropriate security measures to protect personal data from accidental loss, unauthorised access or use, alteration and disclosure. Access is limited to employees, agents, contractors and third parties with a legitimate business need. They process information on our instructions and are subject to confidentiality obligations.</p>
            <p>We maintain procedures for suspected personal-data breaches and will notify you and any applicable regulator where legally required.</p>
            <h3>How long we retain data</h3>
            <p>We retain personal data only for as long as necessary for the purpose for which it was collected, including legal, accounting and reporting requirements. The retention period reflects the amount, nature and sensitivity of the data, the risk of harm from unauthorised use or disclosure, the processing purpose, whether that purpose can be achieved by other means and applicable legal requirements.</p>
          </section>

          <footer className="privacy-contact">
            <p className="privacy-label">Questions or requests</p>
            <h2>Contact Safari Crafters</h2>
            <p>For questions about this policy, your personal data or your marketing preferences, email <a href="mailto:info@safaricrafters.in">info@safaricrafters.in</a>.</p>
          </footer>
        </article>
      </div>
    </main>
  );
}
