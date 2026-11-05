import { ApiError } from "@/lib/api";

interface Props {
  title: string;
  error: unknown;
  onRetry?: () => void;
}

export function ErrorPanel({ title, error, onRetry }: Props) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const offline = error instanceof ApiError && error.status === 0;
  return (
    <div className="panel panel-danger" role="alert">
      <h2 className="panel-title">{title}</h2>
      <p>{message}</p>
      {offline && (
        <p className="muted">
          Start it with <code>dotnet run --project src/Idp.Api</code>, or set <code>NEXT_PUBLIC_API_URL</code>.
        </p>
      )}
      {onRetry && (
        <button type="button" className="button button-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
