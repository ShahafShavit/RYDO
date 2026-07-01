import { LEGAL_META } from './legal-meta';

/** @type {{ title: string, items: string[] }} */
export const DELETE_ACCOUNT_STEPS = {
  title: 'How to request account deletion',
  items: [
    `Send a deletion request from the email address on your RYDO account to ${LEGAL_META.contactEmail}. Use the button below or your email app.`,
    'Include your account email and public handle so we can verify that you own the account.',
    'We will reply to confirm your request. If we need additional verification, we will tell you in that email.',
    `We complete verified deletion requests within ${LEGAL_META.deletionProcessingDays} days. Deletion is permanent — it is not the same as signing out or deactivating your account.`,
  ],
};

/** @type {LegalSection[]} */
export const DELETE_ACCOUNT_SECTIONS = [
  {
    id: 'about',
    title: 'About RYDO account deletion',
    paragraphs: [
      'This page explains how to request deletion of your RYDO account and associated personal data. RYDO is the cycling platform available at rydo.bike and in the RYDO mobile app on Google Play.',
      'You do not need to be signed in to read this page. Anyone with a RYDO account can request deletion using the steps above.',
    ],
  },
  {
    id: 'data-deleted',
    title: 'Data we delete',
    paragraphs: [
      'When we process your verified deletion request, we delete or remove access to:',
      'Your account credentials and profile (email, password hash, name, handle, bio, text location, riding preferences, and avatar).',
      'Friend requests, friendships, inbox notifications, and ride invites tied to your account.',
      'Your club memberships, ride participations, and saved routes.',
      'Gamification data such as experience points, levels, and challenge progress.',
      'Per-user activity rollups and ride history entries associated with your account.',
      'Active sign-in sessions and authentication tokens on our servers.',
    ],
  },
  {
    id: 'data-retained',
    title: 'Data we keep or de-identify',
    paragraphs: [
      'Some information may be retained or changed so the Service can keep working for other users:',
      'Routes you uploaded are reassigned to the RYDO system account. Route GPX files and metadata remain available to the community without your name attached.',
      'Club and ride chat messages you sent remain visible to other participants with your original display name at the time of sending. Your account and profile page are removed, so others cannot open a live profile for you.',
      'Hazard reports you filed are kept for trail safety (location, type, and description). Reporter identity is anonymized — your name and handle are removed.',
      'Rides or clubs you created are deleted if you are the sole member. If other members remain, those rides or clubs are kept with anonymized organizer attribution.',
      'Aggregated or de-identified usage metrics that cannot reasonably be used to identify you may be retained.',
      'Records we must keep for legal, security, or fraud-prevention purposes are retained only as long as required by applicable law.',
    ],
  },
  {
    id: 'device-data',
    title: 'Data on your device',
    paragraphs: [
      'After your account is deleted, sign out of the app, uninstall the RYDO app if you use it, and clear site data in your browser if you use the web app. Authentication tokens and preferences may remain in local storage or on-device secure storage until you remove them.',
    ],
  },
  {
    id: 'contact',
    title: 'Questions',
    paragraphs: [
      `If you have questions about account deletion, contact us at ${LEGAL_META.contactEmail}.`,
      `For more detail on how we handle personal data, see our Privacy Policy. Our Terms of Service also describe account termination.`,
    ],
  },
];

export const DELETE_ACCOUNT_TITLE = 'Delete your RYDO account';
