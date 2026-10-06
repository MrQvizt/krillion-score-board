import { Logo } from "./Logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <div className="card animate-pop p-6 sm:p-8">
        <h1 className="heading text-3xl">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-mist">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}
