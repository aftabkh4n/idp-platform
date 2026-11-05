import type { Metadata } from "next";
import { NewServiceClient } from "./NewServiceClient";

export const metadata: Metadata = { title: "New service" };

export default function NewServicePage() {
  return (
    <div className="stack narrow">
      <div>
        <h1>New service</h1>
        <p className="muted">
          Creates a GitHub repo with a Dockerfile, CI workflow and README, then deploys it to Kubernetes.
        </p>
      </div>
      <div className="panel">
        <NewServiceClient />
      </div>
    </div>
  );
}
