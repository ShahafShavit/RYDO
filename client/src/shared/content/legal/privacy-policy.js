import { LEGAL_META } from './legal-meta';

/**
 * @typedef {{ id: string, title: string, paragraphs: string[] }} LegalSection
 */

/** @type {LegalSection[]} */
export const PRIVACY_POLICY_SECTIONS = [
  {
    id: 'introduction',
    title: 'Introduction',
    paragraphs: [
      `This Privacy Policy describes how ${LEGAL_META.controllerName} ("RYDO", "we", "us", or "our") collects, uses, and shares information when you use the RYDO website, mobile applications, and related services (collectively, the "Service").`,
      `RYDO is a cycling platform for route discovery, navigation, live ride awareness, clubs, and trail safety features.`,
      `The data controller responsible for your personal data is ${LEGAL_META.controllerName}.`,
      `Effective date: ${LEGAL_META.effectiveDate}.`,
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    paragraphs: [
      'We collect information you provide directly, information generated through your use of the Service, and limited technical data needed to operate the Service.',
      'Account and profile: when you register, we collect your email address, password (stored as a secure hash), first name, last name, and public handle. You may also add a bio, text location (such as city or region), riding preferences, and an avatar image.',
      'Routes and rides: if you upload or create routes, we store GPX track data, route metadata, and preview coordinates. If you join or organize rides, we store participation records, ride details, and aggregated ride history (such as distance, elevation, and duration). We do not store a continuous GPS trace of your completed rides on our servers.',
      'Social and community: we store club memberships, ride and club chat messages, friend requests, inbox messages, and public profile information according to your privacy settings.',
      'Hazard reports: if you report a trail hazard, we store the hazard type, description, coordinates, and your display name as reporter.',
      'Gamification: we store experience points, levels, and challenge progress associated with your account.',
      'Activity data: we record timestamps such as last seen and aggregated engagement metrics used for internal administration. We do not use third-party analytics or advertising SDKs.',
      'Device and session data: when you sign in, an authentication token is stored locally on your device (browser local storage or native app preferences) so you remain signed in. We may also store theme and display preferences locally.',
    ],
  },
  {
    id: 'location-information',
    title: 'Location information',
    paragraphs: [
      'RYDO uses your device location when you grant permission. On Android, the app requests fine and coarse location access. On iOS, location is requested only while you are using the app.',
      'Live ride: during an active live ride, your approximate position, heading, accuracy, and timestamp are sent to our servers and shared in real time with other participants in that ride via our live connection service. This live location data is held in memory for the active session and is not stored as a persistent location history on our servers.',
      'Maps and navigation: location may be used to show your position on maps, support route exploration, and related navigation features.',
      'Hazard reporting: when you place a hazard on the map, we store the coordinates you select.',
      'Weather: we may send route start coordinates to Open-Meteo to retrieve weather information displayed in the app.',
      'We do not request background location access in the current version of the app.',
    ],
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    paragraphs: [
      'We use the information we collect to:',
      'Provide, operate, and maintain the Service, including authentication, route libraries, live ride features, clubs, chat, and hazard reporting.',
      'Display your profile and content to other users according to your privacy settings.',
      'Share your live position with other participants during rides you join.',
      'Support gamification features such as leaderboards and challenges.',
      'Monitor Service reliability and internal usage patterns (first-party metrics only).',
      'Respond to your requests and communicate with you about the Service.',
      'Protect the security and integrity of the Service and enforce our Terms of Service.',
    ],
  },
  {
    id: 'legal-bases',
    title: 'Legal bases for processing (EEA, UK, and Switzerland)',
    paragraphs: [
      'If you are in the European Economic Area, the United Kingdom, or Switzerland, we process personal data on the following bases:',
      'Performance of a contract: to provide the Service you sign up for, including account management, routes, rides, and live features.',
      'Legitimate interests: to operate, secure, and improve the Service, prevent abuse, and support community safety features, balanced against your rights.',
      'Consent: where required, such as for optional profile fields or location access through your device settings. You may withdraw consent by changing device permissions or account settings, though some features may not work without it.',
      'Legal obligation: where we must comply with applicable law.',
    ],
  },
  {
    id: 'sharing',
    title: 'How we share information',
    paragraphs: [
      'With other users: your public profile, routes, ride participation, and other content may be visible to other users based on your privacy settings. During a live ride, your real-time position is visible to other participants in that ride.',
      'With service providers: we use hosting and infrastructure providers (including Amazon Web Services) to run the Service. Map requests are sent to Mapbox. Weather requests may be sent to Open-Meteo. Web fonts may be loaded from Google Fonts.',
      'We do not sell your personal information.',
      'We may disclose information if required by law, to protect rights and safety, or in connection with a merger, acquisition, or asset sale, subject to applicable law.',
    ],
  },
  {
    id: 'third-party-services',
    title: 'Third-party services',
    paragraphs: [
      'Mapbox provides map tiles and related mapping services. See Mapbox\'s privacy policy at https://www.mapbox.com/legal/privacy.',
      'Open-Meteo provides weather data based on coordinates you or the app send. See https://open-meteo.com/en/terms.',
      'Google Fonts may be loaded from Google\'s CDN when you use the web app. See https://policies.google.com/privacy.',
      'These third parties process data according to their own policies. We encourage you to review them.',
    ],
  },
  {
    id: 'cookies-and-storage',
    title: 'Cookies and local storage',
    paragraphs: [
      'The web app stores an authentication token and basic user session data in your browser\'s local storage to keep you signed in. Theme and UI preferences may also be stored locally.',
      'The native mobile app stores similar session data using on-device secure storage.',
      'We do not use advertising cookies or third-party tracking pixels. We do not use dedicated crash reporting or analytics SDKs from third parties.',
    ],
  },
  {
    id: 'data-retention',
    title: 'Data retention',
    paragraphs: [
      'We retain your account and associated content while your account is active and as needed to provide the Service.',
      'If you delete your account or request deletion, we will delete or anonymize your personal data within ' + LEGAL_META.deletionProcessingDays + ' days of verifying your request, except where we must retain certain information for legal, security, or legitimate business purposes. See https://rydo.bike/delete-account for what is deleted, what may be retained, and how to submit a request.',
      'Aggregated or de-identified data that cannot reasonably be used to identify you may be retained longer.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your rights and choices',
    paragraphs: [
      'Depending on where you live, you may have the right to access, correct, delete, or export your personal data; object to or restrict certain processing; and withdraw consent where processing is based on consent.',
      'You can update much of your profile and privacy settings in the app. Location sharing can be controlled through your device permissions.',
      'To exercise your rights, contact us at ' + LEGAL_META.contactEmail + '. We will respond within the timeframe required by applicable law (typically within 30 days for GDPR requests).',
      'If you are a California resident, you have the right to know what personal information we collect and how we use it, to request deletion, and to not be discriminated against for exercising your rights. We do not sell personal information.',
      'If you are in the EEA or UK, you may lodge a complaint with your local data protection authority.',
      'To request account deletion, follow the steps at https://rydo.bike/delete-account (also linked from Settings in the app). Account deletion is permanent and is processed within ' + LEGAL_META.deletionProcessingDays + ' days after we verify your request. Data export is not yet available as a self-service feature; you may request a copy of your data by emailing ' + LEGAL_META.contactEmail + '.',
    ],
  },
  {
    id: 'international-transfers',
    title: 'International data transfers',
    paragraphs: [
      'Your information may be processed and stored on servers operated by our hosting providers. Data may be transferred to and processed in countries other than your own, including countries that may have different data protection laws.',
      'Where required, we rely on appropriate safeguards for such transfers.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'We use reasonable technical and organizational measures designed to protect your information. Passwords are stored using industry-standard hashing. Access to production systems is restricted.',
      'No method of transmission or storage is completely secure. We cannot guarantee absolute security.',
    ],
  },
  {
    id: 'children',
    title: 'Children\'s privacy',
    paragraphs: [
      'The Service is not directed to children under 13, and we do not knowingly collect personal information from children under 13.',
      'If you believe a child under 13 has provided us with personal information, please contact us at ' + LEGAL_META.contactEmail + ' and we will take steps to delete it.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. We will post the updated policy on this page and update the effective date above.',
      'If we make material changes, we may provide additional notice through the Service or by email where appropriate.',
      'Your continued use of the Service after changes become effective constitutes acceptance of the updated policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact us',
    paragraphs: [
      'If you have questions about this Privacy Policy or our data practices, contact us at:',
      `Email: ${LEGAL_META.contactEmail}`,
      `Postal address: ${LEGAL_META.postalAddress}`,
    ],
  },
];

export const PRIVACY_POLICY_TITLE = 'Privacy Policy';
