import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-gradient font-display text-7xl font-extrabold">404</p>
      <h1 className="font-display text-2xl font-bold text-foreground">
        This page drifted off the cloud
      </h1>
      <p className="max-w-md text-sm text-foreground/60">
        The page you are looking for does not exist or was moved. Head back
        home and keep shipping.
      </p>
      <Link href="/">
        <Button variant="primary" size="lg">Back to home</Button>
      </Link>
    </div>
  );
}
