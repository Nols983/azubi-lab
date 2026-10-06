import Link from "next/link";
import type { ReactNode } from "react";
import type { LearningModule, Lesson } from "../../data/learning-modules";
import { getOrderedLessons } from "../../data/learning-modules";
import { getQuizForModule } from "../../data/quizzes";
import { LessonProgressControl } from "../progress/learner-progress-ui";
import { LessonProgressionNavigation } from "./learning-progression-ui";

export function LessonLayout({ learningModule, lesson, children }: { learningModule: LearningModule; lesson: Lesson; children: ReactNode }) {
  const lessons = getOrderedLessons(learningModule);
  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  const moduleHref = `/lernen/${learningModule.slug}`;

  return (
    <article className="mx-auto max-w-4xl">
      <nav aria-label="Brotkrümelnavigation" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/lernen" className="rounded text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lernen</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={moduleHref} className="rounded text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{learningModule.title}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-700">Lektion {index + 1}</li>
        </ol>
      </nav>
      <header className="mt-6 border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold text-blue-700">{learningModule.title}</p>
        <p className="mt-2 text-sm font-medium text-slate-500">Lektion {index + 1} von {lessons.length}</p>
        <h1 className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{lesson.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{lesson.description}</p>
      </header>
      <div className="py-8 sm:py-10">{children}</div>
      <div className="mb-8"><LessonProgressControl moduleSlug={learningModule.slug} lessonSlug={lesson.slug} availability={lesson.status} /></div>
      <nav aria-label="Lektionsnavigation" className="border-t border-slate-200 pt-6">
        <LessonProgressionNavigation learningModule={learningModule} lesson={lesson} hasQuiz={Boolean(getQuizForModule(learningModule.slug))} />
        <Link href={moduleHref} className="mt-6 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Zurück zur Modulübersicht</Link>
      </nav>
    </article>
  );
}
