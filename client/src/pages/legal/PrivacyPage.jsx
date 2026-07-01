import { ROUTES } from '@/app/router/route-paths';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_TITLE,
} from '@/shared/content/legal/privacy-policy';
import LegalDocumentLayout from './LegalDocumentLayout';

const LEGAL_CROSS_LINKS = [
  { label: 'Terms of Service', to: ROUTES.terms },
  { label: 'Delete account', to: ROUTES.deleteAccount },
];

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title={PRIVACY_POLICY_TITLE}
      sections={PRIVACY_POLICY_SECTIONS}
      crossLinks={LEGAL_CROSS_LINKS}
    />
  );
}
