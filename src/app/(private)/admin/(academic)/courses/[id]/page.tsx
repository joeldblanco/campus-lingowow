import { getCourseById } from "@/lib/actions/courses";
import { notFound } from "next/navigation";
import CourseDetailsClient from "./course-details-client";
import { Lexend } from "next/font/google";
import { cn } from "@/lib/utils";

const lexend = Lexend({ subsets: ["latin"] });

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CourseDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    notFound();
  }

  return (
    <div className={cn("min-h-screen bg-background", lexend.className)}>
      <CourseDetailsClient course={course} />
    </div>
  );
}
