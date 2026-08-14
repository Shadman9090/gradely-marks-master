# Gradely: Marks Made Simple

Build a modern, professional, highly user-friendly web application called GRADELY.



1. PRODUCT VISION



GRADELY is a marks management and marksheet generation platform designed primarily for university teachers.



The goal is to replace complicated Excel-based marks management with a simple web application where teachers can:



- Create courses

- Add/import students

- Enter class test marks

- Manage attendance

- Enter assignment/presentation marks

- Enter laboratory marks

- Automatically calculate totals, averages and converted marks

- Review student performance

- Generate professional printable marksheets

- Export marksheets as PDF

- Export/import data using Excel

- Save multiple courses, semesters and academic sessions

- Reopen and edit previous records



The application should feel like a professional academic administration tool, NOT like a generic spreadsheet.



---



2. DESIGN PHILOSOPHY



The UI should be:



- Clean

- Modern

- Minimal

- Professional

- Extremely easy for teachers to understand

- Fast and responsive

- Desktop-first but fully responsive

- Accessible

- Suitable for long data-entry sessions



Use a modern dashboard aesthetic with:



- Clear typography

- Subtle borders

- Cards

- Tables

- Tabs

- Dropdowns

- Search

- Filters

- Toast notifications

- Confirmation dialogs



Avoid excessive animations, gradients, oversized text, or unnecessary decorative elements.



The product name GRADELY should have a strong but simple visual identity.



Suggested tagline:



"Marks management, made simple."



---



3. AUTHENTICATION



Implement teacher authentication.



Support:



- Sign up

- Login

- Logout

- Forgot password

- Password reset

- Teacher profile



Each teacher should only see their own courses and marks data unless an explicit sharing system is implemented later.



Use Supabase authentication and database.



---



4. MAIN DASHBOARD



After login, show a dashboard.



Header:



GRADELY logo

Search

Notifications

Teacher profile



Main dashboard should contain:



Overview cards



- Active Courses

- Total Students

- Pending Marks

- Completed Mark Sheets



Course section



Display the teacher's courses as cards.



Each course card should show:



- Course code

- Course title

- Academic year

- Semester

- Course type

- Number of students

- Last updated

- Progress/completion indicator



Buttons:



Open Course



Manage Marks



Generate Marksheet



More



Also provide:



+ Create New Course



---



5. COURSE CREATION



When the teacher clicks "Create New Course", open a clean multi-step form.



Step 1 — Course Information



Fields:



- Course Code

- Course Title

- Department

- Academic Year

- Semester

- Year/Level

- Section

- Teacher Name

- Teacher Designation



Example:



Course Code:

ECE 3205



Course Title:

Industrial Electronics



Department:

Department of Electrical and Computer Engineering



Year:

3rd Year



Semester:

Even Semester



Teacher:

Teacher 1



Designation:

Assistant Professor



---



6. COURSE WORKSPACE



Inside a course, create a course workspace with navigation tabs:



Overview

Students

Class Tests

Attendance

Assignments

Laboratory

Marks Summary

Marksheet

Settings



The teacher should be able to move between these sections without losing entered data.



---



7. STUDENT MANAGEMENT



Create a student management interface.



Columns:



- Roll Number

- Student Name

- Registration Number

- Section

- Status

- Actions



Features:



- Add student

- Edit student

- Delete student

- Search student

- Sort students

- Filter students

- Bulk import students from Excel

- Export students to Excel



Provide an Import Excel button.



When importing Excel:



1. Upload file

2. Read spreadsheet

3. Detect columns

4. Allow teacher to map columns

5. Preview imported students

6. Validate duplicates/errors

7. Confirm import



Never silently overwrite existing students.



---



8. CLASS TEST MANAGEMENT



Create a Class Test management system.



Teachers should be able to create tests dynamically.



Example:



CT 1 — Maximum 20

CT 2 — Maximum 20

CT 3 — Maximum 20

CT 4 — Maximum 20

CT 5 — Maximum 20



The teacher should be able to:



- Add CT

- Rename CT

- Set maximum marks

- Set date

- Enter marks

- Edit marks

- Delete CT



Marks table:



| Roll | Student Name | CT 1 | CT 2 | CT 3 | CT 4 | CT 5 | Average |



Automatically calculate:



- CT average

- Converted CT marks

- Missing marks



Example:



If the course considers the best 4 CTs:



Best 4 CT average should automatically be calculated.



Allow the teacher to configure whether the system uses:



- Average of all tests

- Best N tests

- Manually selected tests



Do not hard-code one grading method.



---



9. ATTENDANCE



Create an attendance management module.



Allow teachers to enter:



- Total classes

- Classes attended



Automatically calculate:



Attendance percentage



Example:



Attendance = (Classes Attended / Total Classes) × 100



Allow the teacher to configure:



- Maximum attendance marks

- Attendance conversion rules



Example:



Attendance Percentage → Attendance Marks



The conversion logic must be configurable rather than hard-coded.



Display:



| Roll | Student | Classes Held | Attended | Attendance % | Marks |



---



10. ASSIGNMENT & PRESENTATION



Create a module for:



- Assignment

- Presentation

- Quiz

- Other internal assessment



Teacher can create assessment categories.



Each category should allow:



- Name

- Maximum marks

- Date

- Marks



Automatically calculate category totals.



---



11. LABORATORY MARKS



Create a dedicated Laboratory module.



Allow teachers to create laboratory assessments such as:



- Lab Attendance

- Lab Performance

- Lab Report

- Viva

- Continuous Assessment

- Final Lab Examination



Allow custom components.



Example:



| Roll | Attendance | Experiment 1 | Experiment 2 | Experiment 3 | Viva | Report | Total |



The teacher can configure maximum marks for each component.



Automatically calculate totals and converted marks.



The system should support different lab structures for different courses.



---



12. MARKS SUMMARY



Create a centralized marks summary.



Example structure:



| Roll | CT Average | Attendance | Assignment | Presentation | Lab | Total | Percentage | Grade |



Every value should be calculated automatically.



Clearly distinguish:



- Raw marks

- Converted marks

- Final marks



Do not modify raw marks when calculating converted marks.



---



13. MARKSHEET GENERATOR



This is one of the most important features of GRADELY.



Create a professional printable marksheet generator.



The generated marksheet should resemble an official university marksheet rather than a generic web table.



Header should support:



Rajshahi University of Engineering & Technology



Department of Electrical and Computer Engineering



Then display:



Course Code

Course Title

Academic Year

Semester

Year/Level

Teacher Name

Teacher Designation

Date



Then display the marks table.



Example:



| Roll | Total [40] | CT 1 [20] | CT 2 [20] | CT 3 [20] | CT 4 [20] | CT Avg. [20] | Attendance [10] | Assignment & Presentation [10] | Total [40] |



The exact columns must be dynamically generated according to the course configuration.



Include:



- University heading

- Department

- Course information

- Marks table

- Signature area

- Teacher name/designation

- Date

- Page numbers where appropriate



The marksheet must be optimized for A4 printing.



Provide:



Preview



Print



Download PDF



Export Excel



---



14. PRINTING



Printing is critical.



Create a dedicated print stylesheet.



When the teacher clicks Print:



- Hide navigation

- Hide buttons

- Hide dashboard elements

- Show only the official marksheet

- Use A4 dimensions

- Proper margins

- Repeat table headers on multiple pages

- Prevent rows from breaking unnecessarily

- Maintain professional typography

- Ensure the output looks good in both browser print and PDF



The final printed output should look like a professionally prepared university marksheet.



---



15. EXCEL SUPPORT



GRADELY should work extremely well with Excel because many teachers currently maintain marks using spreadsheets.



Support:



Import



- Student lists

- Class test marks

- Attendance

- Lab marks



Export



- Student list

- Marks summary

- Complete marksheet



Provide clear error messages when an Excel file contains:



- Missing roll numbers

- Duplicate roll numbers

- Invalid marks

- Marks exceeding maximum

- Missing required columns



Never silently accept invalid data.



---



16. DATA VALIDATION



Implement strong validation.



For example:



If maximum mark = 20:



0 ≤ mark ≤ 20



Prevent:



- Negative marks

- Marks greater than maximum

- Duplicate roll numbers

- Invalid attendance percentages

- Empty required fields



Allow special values such as:



- Absent

- Not Applicable

- Missing



Handle them consistently during calculations.



---



17. AUTO-SAVE



Marks entry should automatically save changes.



Show a small status indicator:



Saved



or



Saving...



or



Unsaved changes



Never allow accidental loss of marks.



---



18. UNDO / EDIT SAFETY



Because marks are sensitive academic data:



Before deleting:



- A student

- A test

- An assessment

- A course



show a confirmation dialog.



For important bulk operations, provide an undo mechanism where practical.



---



19. COURSE SETTINGS



Allow teachers to configure:



- Number of CTs

- Maximum marks

- Best N CT policy

- Attendance marks

- Assignment marks

- Presentation marks

- Lab marks

- Grade calculation

- Rounding rules

- Decimal precision

- Marksheet layout



Do not hard-code RUET's current structure.



GRADELY should be flexible enough to work with different departments and universities.



---



20. SEARCH & FILTERING



Provide global and course-level search.



Teachers should be able to search by:



- Roll number

- Student name

- Course code



Provide filters such as:



- Missing marks

- Complete

- Absent

- Low marks

- High attendance

- Low attendance



---



21. STUDENT PERFORMANCE



Inside the course dashboard, show basic analytics.



Examples:



- Class average

- Highest mark

- Lowest mark

- Attendance average

- Number of students with missing marks

- Number of students who completed all assessments



Use simple charts only where useful.



Do not make analytics more complicated than necessary.



---



22. RESPONSIVE DESIGN



Desktop is the primary environment because teachers will probably use laptops/desktops for marks entry.



However, the application must also work on:



- Tablets

- Mobile phones



On mobile:



- Convert large tables into horizontally scrollable tables

- Keep important actions accessible

- Use responsive navigation

- Never make the interface unusable because of large tables



---



23. DATABASE STRUCTURE



Use Supabase/PostgreSQL.



Design a normalized database.



Suggested entities:



users

teachers

courses

students

course_students

assessments

assessment_types

marks

attendance

lab_assessments

lab_marks

marksheet_templates

academic_sessions



Use proper foreign keys and indexes.



Each course should belong to a teacher.



Marks should belong to:



Course + Student + Assessment



Avoid storing calculated totals as the primary source of truth when they can be calculated from raw marks.



---



24. SECURITY



Implement proper authentication and authorization.



Teachers must only access their own course data.



Use Supabase Row Level Security.



Never expose database credentials in frontend code.



Validate permissions on the server/database level, not only in the UI.



---



25. ERROR HANDLING



Make errors understandable to non-technical users.



Instead of:



"Postgres constraint violation"



show:



"Could not save this mark because it exceeds the maximum allowed mark of 20."



Use toast notifications for successful actions.



---



26. UI COMPONENTS



Create reusable components for:



- Navbar

- Sidebar

- Course Card

- Data Table

- Marks Input Cell

- Assessment Card

- Student Selector

- Import Modal

- Export Modal

- Confirmation Dialog

- Marksheet Preview

- Print Layout

- Empty States

- Loading States



Use consistent spacing, typography and interaction patterns throughout the application.



---



27. SAMPLE DATA



During development, create realistic sample data based on a university environment.



Example:



University:

Rajshahi University of Engineering & Technology



Department:

Electrical and Computer Engineering



Course:

ECE 3205 — Industrial Electronics



Session:

3rd Year Even Semester



Also create sample students and marks so the dashboard and marksheet generator can be tested immediately.



---



28. IMPORTANT UX REQUIREMENT



The most important principle:



A teacher should be able to open GRADELY and understand what to do without reading a manual.



The workflow should feel like:



Login

→ Create/Open Course

→ Add Students

→ Enter Marks

→ Review

→ Generate Marksheet

→ Print/PDF



Keep the number of clicks low.



---



29. FUTURE-READY ARCHITECTURE



Build the application so future features can be added without rewriting the system.



Possible future features:



- Multiple teachers per course

- Department administrator accounts

- University-wide accounts

- Student portal

- Grade calculation

- GPA calculation

- Result processing

- Multiple mark-sheet templates

- Digital signatures

- Cloud sharing

- Course duplication

- Previous semester templates

- Bulk marks upload

- Audit history

- Version history



Do not implement all future features now.



Build the architecture so they can be added later.



---



30. DEVELOPMENT PRIORITY



Build in this order:



Phase 1



Authentication

Dashboard

Course creation

Student management



Phase 2



Class tests

Attendance

Assignments

Laboratory marks



Phase 3



Automatic calculations

Marks summary

Validation



Phase 4



Professional marksheet generator

Print preview

A4 PDF/printing



Phase 5



Excel import/export



Phase 6



Analytics

Polish

Responsive optimization



Do not sacrifice core marks-entry functionality for decorative UI.



---



31. FINAL QUALITY REQUIREMENT



Before considering the application complete, test the complete workflow:



Teacher logs in

→ creates ECE 3205

→ adds/imports students

→ creates CT 1–CT 4

→ enters CT marks

→ enters attendance

→ enters assignment/presentation marks

→ system calculates totals

→ teacher opens marksheet preview

→ teacher prints/downloads PDF

→ output matches the configured university marksheet format.



The application should feel like a real production-ready academic marks management system, not an AI-generated demo.



Use clean React/TypeScript architecture, Supabase for backend/database/authentication, reusable components, strong validation, and a professional academic UI.



Start by building the complete UI and database architecture, then implement the core marks-entry workflow and finally the print-ready marksheet generator.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gradely-marks-master.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2a3f8138-74f1-4c31-8bf3-e87cfcae38a0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
