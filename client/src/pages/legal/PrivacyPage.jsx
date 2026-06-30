import { ROUTES } from '@/app/router/route-paths';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_TITLE,
} from '@/shared/content/legal/privacy-policy';
import LegalDocumentLayout from './LegalDocumentLayout';

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout
      title={PRIVACY_POLICY_TITLE}
      sections={PRIVACY_POLICY_SECTIONS}
      crossLink={{ label: 'Terms of Service', to: ROUTES.terms }}
    />
  );
}
