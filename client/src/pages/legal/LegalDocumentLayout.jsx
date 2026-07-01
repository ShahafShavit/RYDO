import { Link } from 'react-router-dom';
import { LEGAL_META } from '@/shared/content/legal/legal-meta';

/**
 * @typedef {{ label: string, to: string }} LegalCrossLink
 */

/**
 * @param {{
 *   title: string,
 *   sections: Array<{ id: string, title: string, paragraphs: string[] }>,
 *   crossLinks: LegalCrossLink[],
 *   steps?: { title: string, items: string[] },
 *   primaryAction?: { label: string, href: string },
 * }} props
 */
export default function LegalDocumentLayout({
  title,
  sections,
  crossLinks,
  steps,
  primaryAction,
}) {
  return (
    <article className="rydo-container mx-auto w-full max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <header className="mb-10 border-b border-border/60 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-fg-subtle">
          Last updated: {LEGAL_META.effectiveDate}
        </p>
        {crossLinks.length > 0 ? (
          <p className="mt-4 text-sm text-fg-muted">
            See also:{' '}
            {crossLinks.map((link, index) => (
              <span key={link.to}>
                {index > 0 ? (index === crossLinks.length - 1 ? ', and ' : ', ') : null}
                <Link
                  to={link.to}
                  className="text-rydo-purple underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {steps ? (
        <section
          aria-labelledby="legal-steps-heading"
          className="mb-10 rounded-2xl border border-rydo-purple/25 bg-rydo-purple/5 p-6 md:p-8"
        >
          <h2 id="legal-steps-heading" className="text-lg font-semibold text-fg/95">
            {steps.title}
          </h2>
          <ol className="mt-5 list-decimal space-y-4 pl-5 text-fg-muted leading-relaxed">
            {steps.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
          {primaryAction ? (
            <a
              href={primaryAction.href}
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-rydo-purple px-5 py-3 text-sm font-semibold text-white transition hover:bg-rydo-purple/90"
            >
              {primaryAction.label}
            </a>
          ) : null}
        </section>
      ) : null}

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-fg/95">{section.title}</h2>
            <div className="mt-4 space-y-4 text-fg-muted leading-relaxed">
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-14 border-t border-border/60 pt-8 text-sm text-fg-subtle">
        <p className="mt-3">
          Questions?{' '}
          <a
            href={`mailto:${LEGAL_META.contactEmail}`}
            className="text-rydo-purple underline-offset-4 hover:underline"
          >
            {LEGAL_META.contactEmail}
          </a>
        </p>
      </footer>
    </article>
  );
}
