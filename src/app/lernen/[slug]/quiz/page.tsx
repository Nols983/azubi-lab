import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnonymousQuizAccessGate, LockedLearningAccess } from "../../../components/learning/learning-progression-ui";
import { QuizApp } from "../../../components/quiz/quiz-app";
import { QuizProgressSummary } from "../../../components/progress/learner-progress-ui";
import { getLearningModule } from "../../../data/learning-modules";
import { getQuizForModule, quizzes } from "../../../data/quizzes";
import { getCurrentLearningProgression } from "../../../lib/server/learning-progression-service";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return quizzes.map(({ moduleSlug: slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const learningModule = getLearningModule(slug);
  const quiz = getQuizForModule(slug);
  return { title: learningModule && quiz ? `${quiz.title} – ${learningModule.title}` : "Quiz nicht gefunden" };
}

export default async function ModuleQuizPage({ params }: Props) {
  const { slug } = await params;
  const learningModule = getLearningModule(slug);
  const quiz = getQuizForModule(slug);
  if (!learningModule || !quiz) notFound();
  const moduleHref = `/lernen/${learningModule.slug}`;
  const currentProgression = await getCurrentLearningProgression(learningModule.slug);
  if (currentProgression.audience === "unavailable") {
    return <LockedLearningAccess kind="quiz" moduleSlug={learningModule.slug} reason="Der serverseitige Lernstand konnte für diese Kontositzung nicht sicher geprüft werden." />;
  }
  if ((currentProgression.audience === "learner" || currentProgression.audience === "staff") && !currentProgression.progression.quiz.unlocked) {
    return <LockedLearningAccess kind="quiz" moduleSlug={learningModule.slug} reason={currentProgression.progression.quiz.lockReason ?? "Das Abschlussquiz ist noch gesperrt."} />;
  }

  const content = (
    <article className="mx-auto max-w-4xl">
      <nav aria-label="Brotkrümelnavigation" className="text-sm text-slate-600">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/lernen" className="rounded text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Lernen</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href={moduleHref} className="rounded text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{learningModule.title}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-700">Abschlussquiz</li>
        </ol>
      </nav>
      <header className="mt-6 border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold text-blue-700">{learningModule.title}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Abschlussquiz</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{quiz.description} Das Quiz umfasst {quiz.questions.length} Fragen. Ergebnisse werden je nach Anmeldung mit dem Konto oder anonym in diesem Browser gespeichert; Antwortauswahlen werden nicht gespeichert.</p>
      </header>
      <div className="pt-8"><QuizProgressSummary moduleSlug={learningModule.slug} framed /></div>
      <div className="py-8 sm:py-10"><QuizApp quiz={quiz} /></div>
      <Link href={moduleHref} className="inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"><span aria-hidden="true" className="mr-2">←</span>Zurück zur Modulübersicht</Link>
    </article>
  );
  return currentProgression.audience === "anonymous"
    ? <AnonymousQuizAccessGate learningModule={learningModule}>{content}</AnonymousQuizAccessGate>
    : content;
}
