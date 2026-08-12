export type MarkStatus = "graded" | "absent" | "na" | "missing";

export type AttendanceRule = { min: number; marks: number };

export type GradeBand = { min: number; grade: string; point: number };

export type CourseSettings = {
  ctPolicy: "best_n" | "average";
  ctBestN: number;
  ctConvertedMax: number;
  useAttendance: boolean;
  attendanceMode: "rules" | "proportional";
  attendanceMax: number;
  attendanceRules: AttendanceRule[];
  useAssignment: boolean;
  assignmentMax: number;
  useLab: boolean;
  labMax: number;
  totalMax: number;
  decimals: number;
  rounding: "none" | "round" | "ceil" | "floor";
  absentAsZero: boolean;
  gradeScale: GradeBand[];
  sheetOrientation: "portrait" | "landscape";
  showNameOnSheet: boolean;
};

export const DEFAULT_SETTINGS: CourseSettings = {
  ctPolicy: "best_n",
  ctBestN: 4,
  ctConvertedMax: 20,
  useAttendance: true,
  attendanceMode: "rules",
  attendanceMax: 10,
  attendanceRules: [
    { min: 90, marks: 10 },
    { min: 85, marks: 9 },
    { min: 80, marks: 8 },
    { min: 75, marks: 7 },
    { min: 70, marks: 6 },
    { min: 65, marks: 5 },
    { min: 60, marks: 4 },
    { min: 0, marks: 0 },
  ],
  useAssignment: true,
  assignmentMax: 10,
  useLab: false,
  labMax: 0,
  totalMax: 40,
  decimals: 2,
  rounding: "round",
  absentAsZero: true,
  gradeScale: [
    { min: 80, grade: "A+", point: 4.0 },
    { min: 75, grade: "A", point: 3.75 },
    { min: 70, grade: "A-", point: 3.5 },
    { min: 65, grade: "B+", point: 3.25 },
    { min: 60, grade: "B", point: 3.0 },
    { min: 55, grade: "B-", point: 2.75 },
    { min: 50, grade: "C+", point: 2.5 },
    { min: 45, grade: "C", point: 2.25 },
    { min: 40, grade: "D", point: 2.0 },
    { min: 0, grade: "F", point: 0 },
  ],
  sheetOrientation: "portrait",
  showNameOnSheet: false,
};

export function withDefaults(raw: unknown): CourseSettings {
  const s = (raw ?? {}) as Partial<CourseSettings>;
  return { ...DEFAULT_SETTINGS, ...s };
}

export type Course = {
  id: string;
  teacher_id: string;
  code: string;
  title: string;
  university: string;
  department: string;
  academic_year: string;
  session: string;
  semester: string;
  level: string;
  section: string;
  course_type: string;
  teacher_name: string;
  teacher_designation: string;
  settings: CourseSettings;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  course_id: string;
  roll: string;
  name: string;
  reg_no: string;
  section: string;
  status: string;
  position: number;
};

export type AssessmentCategory = "ct" | "assignment" | "lab";

export type Assessment = {
  id: string;
  course_id: string;
  category: AssessmentCategory;
  name: string;
  max_marks: number;
  assessed_on: string | null;
  position: number;
};

export type Mark = {
  id?: string;
  course_id: string;
  assessment_id: string;
  student_id: string;
  value: number | null;
  status: MarkStatus;
};

export type Attendance = {
  course_id: string;
  student_id: string;
  classes_held: number | null;
  attended: number | null;
};
