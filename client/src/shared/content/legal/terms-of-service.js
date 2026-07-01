import { LEGAL_META } from './legal-meta';

/**
 * @typedef {{ id: string, title: string, paragraphs: string[] }} LegalSection
 */

/** @type {LegalSection[]} */
export const TERMS_OF_SERVICE_SECTIONS = [
  {
    id: 'agreement',
    title: 'Agreement to terms',
    paragraphs: [
      'These Terms of Service ("Terms") govern your access to and use of the RYDO website, mobile applications, and related services (collectively, the "Service") operated by ' + LEGAL_META.controllerName + ' ("RYDO", "we", "us", or "our").',
      'By creating an account, downloading the app, or otherwise using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service.',
      `Effective date: ${LEGAL_META.effectiveDate}.`,
    ],
  },
  {
    id: 'eligibility',
    title: 'Eligibility',
    paragraphs: [
      'You must be at least 13 years old to use the Service.',
      'If you are under the age of majority in your jurisdiction, you may use the Service only with the consent of a parent or legal guardian who agrees to these Terms on your behalf.',
      'You represent that the information you provide during registration is accurate and that you have the right to use the Service in your location.',
    ],
  },
  {
    id: 'your-account',
    title: 'Your account',
    paragraphs: [
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.',
      'Notify us promptly at ' + LEGAL_META.contactEmail + ' if you believe your account has been compromised.',
      'We may suspend or terminate accounts that violate these Terms or pose a risk to the Service or other users.',
    ],
  },
  {
    id: 'the-service',
    title: 'The service',
    paragraphs: [
      'RYDO provides features for cyclists including route discovery and storage, navigation, live ride awareness, clubs, messaging, hazard reporting, and related tools.',
      'The Service is provided on an "as available" basis. Features may change, be added, or be removed. We do not guarantee uninterrupted or error-free operation.',
      'Live ride, map, and location features depend on your device, network connectivity, and third-party services. Accuracy and availability may vary.',
    ],
  },
  {
    id: 'user-content',
    title: 'User content',
    paragraphs: [
      'You retain ownership of content you submit to the Service, including routes, GPX files, profile information, messages, and hazard reports ("User Content").',
      'By submitting User Content, you grant RYDO a non-exclusive, worldwide, royalty-free license to host, store, display, and distribute that content as needed to operate and provide the Service, including showing it to other users according to your privacy settings.',
      'You represent that you have the rights necessary to submit User Content and that it does not violate any law or third-party rights.',
      'We may remove User Content that violates these Terms or that we reasonably believe is harmful, abusive, or unlawful.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    paragraphs: [
      'You agree not to:',
      'Use the Service for any unlawful purpose or in violation of applicable laws.',
      'Harass, threaten, defame, or harm other users.',
      'Upload malware, attempt unauthorized access, scrape the Service, or interfere with its operation.',
      'Impersonate another person or misrepresent your affiliation.',
      'Use the Service to send spam or unsolicited communications.',
      'Collect or harvest personal information about other users without consent.',
    ],
  },
  {
    id: 'safety-disclaimer',
    title: 'Safety and outdoor activity disclaimer',
    paragraphs: [
      'Cycling and off-road riding involve inherent risks. RYDO is not a substitute for your own judgment, skill, equipment, and awareness of trail conditions.',
      'Route information, hazard reports, live rider positions, and map data may be incomplete, outdated, or inaccurate. Do not rely solely on the Service for navigation or safety decisions.',
      'You are solely responsible for your conduct and safety while riding. Always follow local laws, trail rules, and safe riding practices.',
    ],
  },
  {
    id: 'third-party-maps',
    title: 'Third-party maps and services',
    paragraphs: [
      'The Service uses third-party mapping and data providers, including Mapbox. Your use of map features may also be subject to those providers\' terms and policies.',
      'Weather and other supplementary data may be provided by third parties such as Open-Meteo. We do not control and are not responsible for third-party services.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    paragraphs: [
      'You may stop using the Service at any time. You may request permanent account deletion using the steps at https://rydo.bike/delete-account (also available from Settings in the app). Deletion requests are processed within ' + LEGAL_META.deletionProcessingDays + ' days after we verify your identity.',
      'We may suspend or terminate your access to the Service at any time for violation of these Terms, legal requirements, or to protect the Service or other users.',
      'Upon termination, your right to use the Service ends. Provisions that by their nature should survive termination will survive, including disclaimers, limitations of liability, and indemnity.',
      'Our handling of your personal data after termination is described in our Privacy Policy.',
    ],
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    paragraphs: [
      'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT ANY CONTENT OR DATA WILL BE ACCURATE OR RELIABLE.',
    ],
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, RYDO AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.',
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (USD $100).',
      'SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS. IN THOSE CASES, OUR LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.',
    ],
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    paragraphs: [
      'You agree to indemnify and hold harmless RYDO and its affiliates, officers, employees, and agents from any claims, damages, losses, and expenses (including reasonable legal fees) arising from your use of the Service, your User Content, or your violation of these Terms.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing law and disputes',
    paragraphs: [
      `These Terms are governed by the laws of ${LEGAL_META.governingLaw}, without regard to conflict-of-law principles.`,
      'Any dispute arising from these Terms or the Service will be resolved in the courts or forums specified by applicable law in that jurisdiction, unless mandatory consumer protection laws in your country require otherwise.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    paragraphs: [
      'We may modify these Terms from time to time. We will post the updated Terms on this page and update the effective date.',
      'If we make material changes, we may provide additional notice through the Service or by email where appropriate.',
      'Your continued use of the Service after changes become effective constitutes acceptance of the updated Terms.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    paragraphs: [
      'Questions about these Terms may be sent to:',
      `Email: ${LEGAL_META.contactEmail}`,
      `Postal address: ${LEGAL_META.postalAddress}`,
    ],
  },
];

export const TERMS_OF_SERVICE_TITLE = 'Terms of Service';
