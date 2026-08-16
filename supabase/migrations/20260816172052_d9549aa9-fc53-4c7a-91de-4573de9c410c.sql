DROP POLICY "own students" ON public.students;
DROP POLICY "own assessments" ON public.assessments;
DROP POLICY "own marks" ON public.marks;
DROP POLICY "own attendance" ON public.attendance;

CREATE POLICY "own students" ON public.students FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = students.course_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = students.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "own assessments" ON public.assessments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assessments.course_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = assessments.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "own marks" ON public.marks FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = marks.course_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = marks.course_id AND c.teacher_id = auth.uid()));

CREATE POLICY "own attendance" ON public.attendance FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = attendance.course_id AND c.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = attendance.course_id AND c.teacher_id = auth.uid()));

DROP FUNCTION IF EXISTS public.owns_course(uuid);