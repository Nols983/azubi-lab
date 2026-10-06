import Link from "next/link";
import type { ReactNode } from "react";
import { LearningObjectives } from "./learning-objectives";

export type LessonSection = {
  title: string;
  paragraphs: readonly ReactNode[];
  points?: readonly ReactNode[];
  note?: ReactNode;
  activity?: ReactNode;
};

type Scenario = {
  title: string;
  situation: ReactNode;
  tasks: readonly ReactNode[];
  solution: ReactNode;
};

export function FundamentalsLesson({
  lessonId,
  objectives,
  intro,
  sections,
  children,
  scenario,
  takeaway,
  relatedLinks = [],
}: {
  lessonId: string;
  objectives: readonly string[];
  intro: ReactNode;
  sections: readonly LessonSection[];
  children?: ReactNode;
  scenario: Scenario;
  takeaway: readonly ReactNode[];
  relatedLinks?: readonly { href: string; label: string }[];
}) {
  return (
    <div className="space-y-10 text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
      <LearningObjectives context="lesson" objectives={objectives} />

      <section aria-labelledby={`${lessonId}-intro`}>
        <h2 id={`${lessonId}-intro`} className="text-2xl font-bold tracking-tight text-slate-950">Einordnung</h2>
        <div className="mt-4 space-y-4">{intro}</div>
      </section>

      {sections.map((section, index) => (
        <section key={section.title} aria-labelledby={`${lessonId}-section-${index}`}>
          <h2 id={`${lessonId}-section-${index}`} className="text-2xl font-bold tracking-tight text-slate-950">{section.title}</h2>
          <div className="mt-4 space-y-4">{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div>
          {section.points && (
            <ul className="mt-5 space-y-3">
              {section.points.map((point, pointIndex) => <li key={pointIndex} className="flex gap-3"><span aria-hidden="true" className="mt-2.5 size-2 shrink-0 rounded-full bg-blue-600" /><span>{point}</span></li>)}
            </ul>
          )}
          {section.note && <aside className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-slate-900">{section.note}</aside>}
          {section.activity && <div className="mt-6">{section.activity}</div>}
        </section>
      ))}

      {children}

      <section aria-labelledby={`${lessonId}-scenario`} className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-7">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-blue-700">Praxisfall</p>
        <h2 id={`${lessonId}-scenario`} className="mt-2 text-2xl font-bold tracking-tight text-blue-950">{scenario.title}</h2>
        <div className="mt-4 text-blue-950">{scenario.situation}</div>
        <ol className="mt-5 list-decimal space-y-2 pl-6 text-blue-950">{scenario.tasks.map((task, index) => <li key={index}>{task}</li>)}</ol>
        <details className="mt-5 rounded-xl border border-blue-200 bg-white p-4 text-slate-800">
          <summary className="cursor-pointer font-bold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Begründete Lösung anzeigen</summary>
          <div className="mt-3 text-sm leading-6">{scenario.solution}</div>
        </details>
      </section>

      <section aria-labelledby={`${lessonId}-takeaway`} className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 sm:p-7">
        <h2 id={`${lessonId}-takeaway`} className="text-2xl font-bold tracking-tight text-emerald-950">Das nimmst du mit</h2>
        <ul className="mt-4 space-y-3 text-emerald-950">{takeaway.map((item, index) => <li key={index} className="flex gap-3"><span aria-hidden="true" className="mt-2.5 font-bold">✓</span><span>{item}</span></li>)}</ul>
      </section>

      {relatedLinks.length > 0 && (
        <nav aria-label="Passende Lernmodule" className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="font-bold text-slate-950">Weiterlernen im Azubi Lab</h2>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm">
            {relatedLinks.map((link) => <li key={link.href}><Link href={link.href} className="inline-flex min-h-11 items-center rounded-lg font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{link.label}</Link></li>)}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function ResponsiveTable({ caption, headers, rows }: { caption: string; headers: readonly string[]; rows: readonly (readonly ReactNode[])[] }) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} aria-label={`${caption}; Tabelle kann horizontal gescrollt werden`}>
      <table className="min-w-[44rem] w-full border-collapse text-left text-sm leading-6">
        <caption className="bg-slate-100 px-4 py-3 text-left font-bold text-slate-950">{caption}</caption>
        <thead className="bg-slate-50 text-slate-950"><tr>{headers.map((header) => <th key={header} scope="col" className="border-t border-slate-200 px-4 py-3 font-bold">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-slate-200 align-top">{row.map((cell, cellIndex) => cellIndex === 0 ? <th key={cellIndex} scope="row" className="px-4 py-3 font-bold text-slate-950">{cell}</th> : <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function TextFlow({ caption, steps }: { caption: string; steps: readonly ReactNode[] }) {
  return (
    <figure className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <figcaption className="font-bold text-slate-950">{caption}</figcaption>
      <ol className="mt-5 grid gap-3 lg:flex lg:items-stretch">
        {steps.map((step, index) => (
          <li key={index} className="contents">
            <div className="min-w-0 rounded-xl border border-blue-200 bg-white p-4 text-center text-sm font-semibold text-slate-900 lg:flex-1">{step}</div>
            {index < steps.length - 1 && <span aria-hidden="true" className="text-center font-bold text-blue-700 max-lg:rotate-90 lg:self-center">→</span>}
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function CodeBlock({ caption, children }: { caption: string; children: string }) {
  return (
    <figure className="mt-6 min-w-0 rounded-xl border border-slate-200 bg-slate-950 text-slate-100">
      <figcaption className="border-b border-slate-700 px-4 py-3 text-sm font-bold text-slate-200">{caption}</figcaption>
      <pre tabIndex={0} aria-label={`${caption}; Codeblock kann horizontal gescrollt werden`} className="overflow-x-auto p-4 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><code>{children}</code></pre>
    </figure>
  );
}
