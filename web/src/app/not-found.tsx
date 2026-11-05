import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel">
      <h1>Page not found</h1>
      <Link href="/" className="button button-secondary">
        Back to services
      </Link>
    </div>
  );
}
