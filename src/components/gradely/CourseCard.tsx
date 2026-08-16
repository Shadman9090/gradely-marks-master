import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MoreHorizontal, FileText, Table2, ArrowUpRight, Users, Clock } from "lucide-react";
import type { Course } from "@/lib/gradely-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CourseCard({
  course,
  studentCount,
  progress,
  onDuplicate,
  onDelete,
}: {
  course: Course;
  studentCount: number;
  progress: number;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  // Brief animated fill of the progress bar on first paint.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(progress), 60);
    return () => window.clearTimeout(t);
  }, [progress]);

  const meta = [course.course_type, course.level, course.semester, course.session]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card-lift group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-card hover:border-primary/30 hover:shadow-panel">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] bg-primary/70 transition-opacity duration-200 group-hover:bg-primary"
      />

      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold tracking-tight text-primary">
                {course.code}
              </span>
              <Badge variant="secondary" className="capitalize">
                {course.course_type}
              </Badge>
            </div>
            <h3 className="mt-1.5 truncate text-base font-semibold leading-snug">{course.title}</h3>
            <p className="mt-1 truncate text-xs capitalize text-muted-foreground">{meta}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>Duplicate course</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                Delete course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="numeric font-medium text-foreground">{studentCount}</span> students
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            Updated{" "}
            {new Date(course.updated_at).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>

        <div className="rounded-lg border border-primary/10 bg-primary/[0.04] p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Marks completion</span>
            <span className="numeric font-semibold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={shown} className="h-1.5 bg-primary/10" />
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-border/70 bg-surface/60 p-4">
        <Button asChild size="sm">
          <Link to="/courses/$courseId" params={{ courseId: course.id }} search={{ tab: "overview" }}>
            Open course <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/courses/$courseId" params={{ courseId: course.id }} search={{ tab: "tests" }}>
            <Table2 className="mr-1.5 h-3.5 w-3.5" /> Marks
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link
            to="/courses/$courseId"
            params={{ courseId: course.id }}
            search={{ tab: "marksheet" }}
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Marksheet
          </Link>
        </Button>
      </div>
    </div>
  );
}
