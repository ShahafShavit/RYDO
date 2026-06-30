import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/router/route-paths';
import { LEGAL_META } from '@/shared/content/legal/legal-meta';

/**
 * @param {{
 *   title: string,
 *   sections: Array<{ id: string, title: string, paragraphs: string[] }>,
 *   crossLink: { label: string, to: string },
 * }} props
 */
export default function LegalDocumentLayout({ title, sections, crossLink }) {
  return (
    <article className="rydo-container mx-auto w-full max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <header className="mb-10 border-b border-border/60 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-fg-subtle">
          Last updated: {LEGAL_META.effectiveDate}
        </p>
        <p className="mt-4 text-sm text-fg-muted">
          See also:{' '}
          <Link
            to={crossLink.to}
            className="text-rydo-purple underline-offset-4 hover:underline"
          >
            {crossLink.label}
          </Link>
        </p>
      </header>

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
