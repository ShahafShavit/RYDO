import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSavedRoutes } from '@/features/routes/hooks/useSavedRoutes';
import { useFormatDistance } from '@/features/account/hooks/useFormatDistance';
import Card from '@/shared/components/ui/card/Card';

export function DashboardCards() {
    const { user } = useAuth();
    const { formatKm } = useFormatDistance();
    const { savedRoutes = [] } = useSavedRoutes({ skip: 0, take: 50 });
    const totalKm = savedRoutes.reduce((s, r) => s + (r.distanceKm || 0), 0);

    const stats = [
        { label: 'Saved Routes', value: savedRoutes.length, color: 'text-blue-400' },
        { label: 'User Type', value: user?.role === 'admin' ? 'Administrator' : 'Cyclist', color: 'text-purple-400' },
        { label: 'Total Distance', value: formatKm(totalKm), color: 'text-green-400' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
                <Card key={stat.label} className="p-6">
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </Card>
            ))}
        </div>
    );
}
