import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, LogOut, Search, Settings2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listCourses } from "@/lib/api";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const { data: courses = [] } = useQuery({ queryKey: ["courses"], queryFn: listCourses });

  const results = query.trim()
    ? courses
        .filter((c) =>
          `${c.code} ${c.title} ${c.session} ${c.semester}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
        .slice(0, 6)
    : [];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="app-header sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />

          <div className="relative ml-auto hidden w-full max-w-xs md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Search courses…"
              className="h-9 pl-8"
            />
            {open && results.length > 0 && (
              <div className="absolute left-0 top-11 w-full overflow-hidden rounded-md border bg-popover shadow-panel">
                {results.map((c) => (
                  <button
                    key={c.id}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent"
                    onMouseDown={() =>
                      navigate({ to: "/courses/$courseId", params: { courseId: c.id } })
                    }
                  >
                    <span className="text-sm font-medium">{c.code}</span>
                    <span className="text-xs text-muted-foreground">{c.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/dashboard">
                <LayoutGrid className="mr-1.5 h-4 w-4" /> Dashboard
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                    {(email[0] ?? "T").toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                  {email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <UserRound className="mr-2 h-4 w-4" /> Teacher profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                  <Settings2 className="mr-2 h-4 w-4" /> My courses
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
