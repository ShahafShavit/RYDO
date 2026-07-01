import { LEGAL_META } from './legal-meta';

const DELETION_SUBJECT = 'RYDO Account Deletion Request';

/**
 * @param {{ email?: string, handle?: string }} [account]
 * @returns {string}
 */
export function buildDeletionMailtoUrl(account = {}) {
  const params = new URLSearchParams();
  params.set('subject', DELETION_SUBJECT);

  const email = account.email?.trim();
  const handle = account.handle?.trim();
  const bodyLines = [
    'Hello RYDO team,',
    '',
    'I would like to permanently delete my RYDO account and associated personal data.',
    '',
  ];

  if (email) bodyLines.push(`Account email: ${email}`);
  if (handle) bodyLines.push(`Public handle: ${handle}`);
  if (email || handle) bodyLines.push('');

  bodyLines.push('Thank you.');

  params.set('body', bodyLines.join('\n'));

  return `mailto:${LEGAL_META.contactEmail}?${params.toString()}`;
}

export const DELETION_MAILTO_LABEL = 'Request account deletion';
