import { ROUTES } from '@/app/router/route-paths';
import {
  TERMS_OF_SERVICE_SECTIONS,
  TERMS_OF_SERVICE_TITLE,
} from '@/shared/content/legal/terms-of-service';
import LegalDocumentLayout from './LegalDocumentLayout';

export default function TermsPage() {
  return (
    <LegalDocumentLayout
      title={TERMS_OF_SERVICE_TITLE}
      sections={TERMS_OF_SERVICE_SECTIONS}
      crossLink={{ label: 'Privacy Policy', to: ROUTES.privacy }}
    />
  );
}
