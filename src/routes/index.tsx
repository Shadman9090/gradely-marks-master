import gradelyIcon from "@/assets/gradely-icon.png.asset.json";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  Printer,
  ShieldCheck,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GRADELY — Marks management, made simple." },
      {
        name: "description",
        content:
          "A calm academic workspace for university teachers: class tests, attendance, lab marks, automatic totals and print-ready university marksheets.",
      },
      { property: "og:title", content: "GRADELY — Marks management, made simple." },
      {
        property: "og:description",
        content:
          "Replace spreadsheet chaos with a purpose-built marks management and marksheet generation platform.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ClipboardList,
    title: "Every assessment in one place",
    body: "Class tests, attendance, assignments, presentations and laboratory components — configured per course, never hard-coded.",
  },
  {
    icon: Table2,
    title: "Calculations you can trust",
    body: "Best-N class tests, configurable attendance conversion, converted marks and grades computed from raw data only.",
  },
  {
    icon: Printer,
    title: "Official A4 marksheets",
    body: "University heading, course block, dynamic marks table and signature area — print or save as PDF straight from the browser.",
  },
  {
    icon: FileSpreadsheet,
    title: "Excel in, Excel out",
    body: "Import student lists and marks with column mapping, validation and a preview. Export any table back to a workbook.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Each teacher sees only their own courses. Access is enforced in the database, not just the interface.",
  },
  {
    icon: GraduationCap,
    title: "Built for real departments",
    body: "Multiple courses, sessions and semesters. Reopen last semester's course and keep working.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img
              src={gradelyIcon.url}
              alt="Gradely"
              className="h-8 w-8 shrink-0 object-contain"
            />

            <span className="text-[15px] font-semibold tracking-tight">GRADELY</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            For university teachers
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
            Marks management, made simple.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">
            GRADELY replaces fragile spreadsheets with a proper academic workspace. Create a
            course, add students, enter marks once, and generate a print-ready university
            marksheet in a single click.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-3 text-sm text-muted-foreground sm:grid-cols-4">
            {["Create course", "Enter marks", "Review totals", "Print marksheet"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </section>

        <section className="border-y bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px overflow-hidden px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="p-6">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        GRADELY — marks management, made simple.
      </footer>
    </div>
  );
}
