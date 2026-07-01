import { useMemo } from 'react';
import { ROUTES } from '@/app/router/route-paths';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  DELETE_ACCOUNT_SECTIONS,
  DELETE_ACCOUNT_STEPS,
  DELETE_ACCOUNT_TITLE,
} from '@/shared/content/legal/delete-account';
import {
  buildDeletionMailtoUrl,
  DELETION_MAILTO_LABEL,
} from '@/shared/content/legal/deletion-mailto';
import LegalDocumentLayout from './LegalDocumentLayout';

const LEGAL_CROSS_LINKS = [
  { label: 'Privacy Policy', to: ROUTES.privacy },
  { label: 'Terms of Service', to: ROUTES.terms },
];

export default function DeleteAccountPage() {
  const { user } = useAuth();

  const mailtoHref = useMemo(
    () =>
      buildDeletionMailtoUrl({
        email: user?.email,
        handle: user?.handle,
      }),
    [user?.email, user?.handle],
  );

  return (
    <LegalDocumentLayout
      title={DELETE_ACCOUNT_TITLE}
      sections={DELETE_ACCOUNT_SECTIONS}
      crossLinks={LEGAL_CROSS_LINKS}
      steps={DELETE_ACCOUNT_STEPS}
      primaryAction={{ label: DELETION_MAILTO_LABEL, href: mailtoHref }}
    />
  );
}
