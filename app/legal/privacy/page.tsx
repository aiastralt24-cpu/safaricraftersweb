export default function PrivacyPage() {
  return <Legal title="Privacy Policy" copy="Safari Crafters collects enquiry details only to respond, plan journeys and manage guest relationships. Marketing consent is explicit and can be withdrawn." />;
}

function Legal({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="section" style={{ paddingTop: 150 }}>
      <div className="container" style={{ maxWidth: 820 }}>
        <h1 className="h1">{title}</h1>
        <p className="intro">{copy}</p>
      </div>
    </section>
  );
}
