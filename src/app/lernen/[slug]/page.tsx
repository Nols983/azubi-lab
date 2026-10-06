import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModuleProgressionContent } from "../../components/learning/learning-progression-ui";
import { LearningObjectives } from "../../components/learning/learning-objectives";
import { ModuleLearnerStatus, ModuleProgressSummary } from "../../components/progress/learner-progress-ui";
import { getLearningModule, getOrderedLessons, learningModules } from "../../data/learning-modules";
import { getQuizForModule } from "../../data/quizzes";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return learningModules.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const learningModule = getLearningModule(slug);
  return { title: learningModule?.title ?? "Lernmodul nicht gefunden" };
}

export default async function LearningModulePage({ params }: Props) {
  const { slug } = await params;
  const learningModule = getLearningModule(slug);
  if (!learningModule) notFound();

  const lessons = getOrderedLessons(learningModule);
  const quiz = getQuizForModule(learningModule.slug);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/lernen" className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zurück zur Lernübersicht</Link>
      <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold text-blue-700">{learningModule.category}</p><ModuleLearnerStatus learningModule={learningModule} /></div>
        <h1 className="mt-4 break-words hyphens-auto text-3xl font-bold tracking-tight text-slate-950 [overflow-wrap:anywhere] sm:text-4xl">{learningModule.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{learningModule.description}</p>
        <div className="mt-8"><ModuleProgressSummary learningModule={learningModule} /></div>
        {lessons.length > 0 && learningModule.learningObjectives ? (
          <div className="mt-10 space-y-10">
            <LearningObjectives objectives={learningModule.learningObjectives} />
            <ModuleProgressionContent learningModule={learningModule} quiz={quiz ? { description: quiz.description } : undefined} />
          </div>
        ) : (
          <section className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5 sm:p-6" aria-labelledby="content-notice-heading">
            <h2 id="content-notice-heading" className="font-bold text-blue-950">Lerninhalte folgen</h2>
            <p className="mt-2 leading-7 text-blue-900">Die Inhalte dieses Lernmoduls werden in einem späteren Meilenstein umgesetzt.</p>
          </section>
        )}
      </article>
    </div>
  );
}
