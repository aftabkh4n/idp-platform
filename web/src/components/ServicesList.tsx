"use client";

import Link from "next/link";
import { formatDateTime, timeAgo } from "@/lib/format";
import { useServices } from "@/lib/hooks";
import { isTerminal } from "@/lib/provisioning";
import { LANGUAGES } from "@/lib/types";
import { ErrorPanel } from "./ErrorPanel";
import { StatusBadge } from "./StatusBadge";

export function ServicesList() {
  const { data: services, error, isPending, isFetching, refetch } = useServices();

  if (isPending) {
    return (
      <div className="panel" aria-busy="true">
        <p className="muted">Loading services…</p>
      </div>
    );
  }

  if (error && !services) {
    return <ErrorPanel title="Couldn't load services" error={error} onRetry={() => void refetch()} />;
  }

  if (services.length === 0) {
    return (
      <div className="panel empty">
        <h2 className="panel-title">No services yet</h2>
        <p className="muted">Provision one and it will show up here with its live status.</p>
        <Link href="/services/new" className="button">
          Create your first service
        </Link>
      </div>
    );
  }

  const inProgress = services.filter((s) => !isTerminal(s.status)).length;
  const deployed = services.filter((s) => s.status === "deployed").length;
  const failed = services.filter((s) => s.status === "failed").length;

  return (
    <div className="stack">
      <dl className="stats">
        <div>
          <dt>Total</dt>
          <dd>{services.length}</dd>
        </div>
        <div>
          <dt>In progress</dt>
          <dd>{inProgress}</dd>
        </div>
        <div>
          <dt>Deployed</dt>
          <dd>{deployed}</dd>
        </div>
        <div>
          <dt>Failed</dt>
          <dd>{failed}</dd>
        </div>
      </dl>

      {error && (
        <p className="notice" role="status">
          Showing cached data: {error.message}
        </p>
      )}

      <div className="table-wrap" role="region" aria-label="Services table" tabIndex={0}>
        <table className="table" aria-busy={isFetching}>
          <caption className="visually-hidden">Provisioned services, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Status</th>
              <th scope="col">Language</th>
              <th scope="col">Owner</th>
              <th scope="col">Created</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <th scope="row">
                  <Link href={`/services/${s.id}`}>{s.name}</Link>
                </th>
                <td>
                  <StatusBadge status={s.status} />
                </td>
                <td>{LANGUAGES.find((l) => l.value === s.language)?.label ?? s.language}</td>
                <td>{s.owner}</td>
                <td>
                  <time dateTime={s.createdAt} title={formatDateTime(s.createdAt)}>
                    {timeAgo(s.createdAt)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
