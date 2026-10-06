import Link from "next/link";

export default function BoardNotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <div className="text-5xl">🫧</div>
      <h1 className="heading mt-3 text-2xl">No board here</h1>
      <p className="mt-2 text-sm text-mist">Either it doesn&apos;t exist or you&apos;re not a member of it.</p>
      <Link href="/dashboard" className="btn-primary mt-6">
        Back to dashboard
      </Link>
    </div>
  );
}
