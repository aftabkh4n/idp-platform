"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ApiError } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";
import { useHubState } from "@/lib/hub";
import { useService } from "@/lib/hooks";
import { isTerminal, statusLabel, stepLabel } from "@/lib/provisioning";
import { LANGUAGES } from "@/lib/types";
import { ErrorPanel } from "./ErrorPanel";
import { ProvisioningSteps } from "./ProvisioningSteps";
import { StatusBadge } from "./StatusBadge";

export function ServiceDetail({ id }: { id: string }) {
  const { data: service, error, isPending, refetch } = useService(id);
  const hub = useHubState();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // After client-side navigation (e.g. from the create form), put focus on
  // the page heading so screen readers start from the new content.
  const hasService = !!service;
  useEffect(() => {
    if (hasService) headingRef.current?.focus();
  }, [hasService]);

  if (isPending) {
    return (
      <div className="panel" aria-busy="true">
        <p className="muted">Loading service…</p>
      </div>
    );
  }

  if (error && !service) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="panel">
          <h1>Service not found</h1>
          <p className="muted">There&apos;s no service with ID {id}.</p>
          <Link href="/" className="button button-secondary">
            Back to services
          </Link>
        </div>
      );
    }
    return <ErrorPanel title="Couldn't load this service" error={error} onRetry={() => void refetch()} />;
  }

  const language = LANGUAGES.find((l) => l.value === service.language)?.label ?? service.language;
  const failedAt = stepLabel(service.failedStep);
  const live = !isTerminal(service.status);

  return (
    <article className="stack">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Services</Link> <span aria-hidden="true">/</span> <span>{service.name}</span>
      </nav>

      <header className="detail-header">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            {service.name}
          </h1>
          <p className="muted">
            {language} · owned by {service.owner} · created{" "}
            <time dateTime={service.createdAt} title={formatDateTime(service.createdAt)}>
              {timeAgo(service.createdAt)}
            </time>
          </p>
        </div>
        <StatusBadge status={service.status} />
      </header>

      {/* Announces each step change without moving focus. */}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {service.name}: {statusLabel(service.status)}
        {failedAt ? ` at ${failedAt}` : ""}
      </p>

      {service.description && <p>{service.description}</p>}

      {live && hub !== "connected" && (
        <p className="notice" role="note">
          Live updates are {hub === "connecting" ? "connecting" : "unavailable"}. This page will still refresh
          every few seconds.
        </p>
      )}

      {service.status === "failed" && (
        <div className="panel panel-danger" role="alert">
          <h2 className="panel-title">Provisioning failed{failedAt ? ` at ${failedAt}` : ""}</h2>
          <p className="error-message">{service.errorMessage ?? "The worker didn't report an error message."}</p>
          {service.repoUrl && (
            <p className="muted">
              The repo was created before the failure. You may need to delete it before trying again with the same name.
            </p>
          )}
        </div>
      )}

      <section className="panel" aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="panel-title">
          Pipeline
        </h2>
        <ProvisioningSteps service={service} />
      </section>

      {(service.repoUrl || service.serviceUrl) && (
        <section className="panel" aria-labelledby="links-heading">
          <h2 id="links-heading" className="panel-title">
            Links
          </h2>
          <dl className="links">
            {service.repoUrl && (
              <>
                <dt>Repository</dt>
                <dd>
                  <a href={service.repoUrl} target="_blank" rel="noreferrer">
                    {service.repoUrl.replace(/^https?:\/\//, "")}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </dd>
              </>
            )}
            {service.serviceUrl && (
              <>
                <dt>Service URL</dt>
                <dd>
                  <a href={service.serviceUrl} target="_blank" rel="noreferrer">
                    {service.serviceUrl.replace(/^https?:\/\//, "")}
                    <span className="visually-hidden"> (opens in a new tab)</span>
                  </a>
                </dd>
              </>
            )}
          </dl>
        </section>
      )}
    </article>
  );
}
