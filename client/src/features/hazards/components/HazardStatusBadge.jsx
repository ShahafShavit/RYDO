import Badge from '@/shared/components/ui/badge/Badge';

export default function HazardStatusBadge({ status = 'Live' }) {
  return <Badge variant="neon">{status}</Badge>;
}
