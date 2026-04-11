import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function meta() {
  return [
    { title: "Proof of Purpose" },
    { name: "description", content: "Proof of Purpose Dashboard" },
  ];
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Proof of Purpose</h1>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            The web stack is wired up and ready to go.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button>Get Started</Button>
          <Button variant="outline">Learn More</Button>
        </CardContent>
      </Card>
    </main>
  );
}
