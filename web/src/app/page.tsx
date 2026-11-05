import { ServicesList } from "@/components/ServicesList";

export default function HomePage() {
  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Services</h1>
          <p className="muted">Everything provisioned through the platform. Status updates live.</p>
        </div>
      </div>
      <ServicesList />
    </div>
  );
}
