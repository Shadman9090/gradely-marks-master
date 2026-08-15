import { Link } from "@tanstack/react-router";
import { MoreHorizontal, FileText, Table2, ArrowUpRight } from "lucide-react";
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
  return (
    <div className="card-lift flex h-full flex-col rounded-lg border bg-card p-5 shadow-card hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold tracking-tight">{course.code}</span>
            <Badge variant="secondary" className="capitalize">
              {course.course_type}
            </Badge>
          </div>
          <h3 className="mt-1 truncate text-[15px] font-semibold">{course.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[course.level, course.semester, course.session].filter(Boolean).join(" · ")}
          </p>
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

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Students</dt>
          <dd className="numeric font-medium">{studentCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last updated</dt>
          <dd className="font-medium">
            {new Date(course.updated_at).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "short",
            })}
          </dd>
        </div>
      </dl>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Marks entered</span>
          <span className="numeric font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/courses/$courseId" params={{ courseId: course.id }} search={{ tab: "overview" }}>
            Open <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
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
