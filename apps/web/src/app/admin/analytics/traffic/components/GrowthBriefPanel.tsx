'use client';

export interface GrowthBriefSection {
  title: string;
  points: string[];
}

export interface GrowthBriefReport {
  title: string;
  periodLabel: string;
  summary: string;
  sections: GrowthBriefSection[];
}

export default function GrowthBriefPanel({
  report,
}: {
  report: GrowthBriefReport | null;
}) {
  if (!report) return null;

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Growth Brief
          </p>
          <h2 className="text-xl font-semibold text-slate-900">{report.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{report.periodLabel}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <div className="text-sm font-medium text-slate-900">本周期结论</div>
        <p className="mt-2 mb-0 text-sm leading-6 text-slate-600">{report.summary}</p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {report.sections.map((section) => (
          <div key={section.title} className="rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">{section.title}</div>
            <div className="mt-3 space-y-2">
              {section.points.map((point) => (
                <p key={point} className="mb-0 text-sm leading-6 text-slate-600">
                  {point}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
