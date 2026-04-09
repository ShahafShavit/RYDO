import { Link } from 'react-router-dom';
import Card from '@/shared/components/ui/card/Card';
import Button from '@/shared/components/ui/button/Button';
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData';

function ProgressBar({ value }) {
    return (
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#7B5CFF] transition-all" style={{ width: `${value}%` }} />
        </div>
    );
}

function DashboardGroupsCard({ groups }) {
    return (
        <Card>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-white/42">RYDO Groups</p>
                    <h3 className="mt-3 text-xl font-semibold">Recent chats</h3>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                {groups.map((group) => (
                    <div key={group.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-white">{group.name}</p>
                                <p className="mt-1 text-sm text-white/64">{group.lastMessage}</p>
                            </div>
                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#21F1A8]/10 text-sm text-[#21F1A8]">
                                {group.unread}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

function DashboardUpcomingRideCard({ ride }) {
    return (
        <Card>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.16em] text-white/42">{ride.title}</p>
                    <h3 className="mt-3 text-xl font-semibold">{ride.routeName}</h3>
                </div>
            </div>

            <div className="mt-6 space-y-4 text-white/64">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm">{ride.dateTime}</p>
                    <p className="mt-2 text-sm">Chat group: <span className="font-semibold text-white">{ride.chatGroup}</span></p>
                </div>
            </div>

            <div className="mt-6">
                <Button variant="secondary" className="w-full">Start ride</Button>
            </div>
        </Card>
    );
}

export default function DashboardHomeCards() {
    const { home } = useDashboardData();
    return (
        <><div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
            <div className="grid gap-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                        <p className="text-sm uppercase tracking-[0.16em] text-white/42">{home.awards.title}</p>
                        <h3 className="mt-4 text-2xl font-semibold">{home.awards.description}</h3>
                        <p className="mt-3 text-sm text-white/64">{home.awards.percentage}% complete</p>
                        <ProgressBar value={home.awards.percentage} />
                    </Card>

                    <Card>
                        <p className="text-sm uppercase tracking-[0.16em] text-white/42">{home.level.title}</p>
                        <div className="mt-4 flex items-end gap-2">
                            <span className="text-5xl font-semibold">{home.level.currentLevel}</span>
                            <span className="text-sm text-white/64">level</span>
                        </div>
                        <p className="mt-3 text-sm text-white/64">{home.level.nextLevelLabel}</p>
                        <ProgressBar value={home.level.progress} />
                    </Card>
                </div>

                <Card>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm uppercase tracking-[0.16em] text-white/42">{home.lastRide.title}</p>
                            <h3 className="mt-3 text-2xl font-semibold">{home.lastRide.routeName}</h3>
                        </div>
                        <span className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/64">{home.lastRide.difficulty}</span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Distance</p>
                            <p className="mt-2 text-lg font-semibold">{home.lastRide.distance}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Duration</p>
                            <p className="mt-2 text-lg font-semibold">{home.lastRide.duration}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Trail</p>
                            <p className="mt-2 text-lg font-semibold">{home.lastRide.mapLabel}</p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-4xl border border-white/10 bg-white/5 p-4 text-white/64">
                        <div className="h-40 rounded-3xl bg-white/5" />
                        <p className="mt-3 text-sm">Trail map preview placeholder</p>
                    </div>
                </Card>
            </div>

            <div className="grid gap-6">
                <DashboardGroupsCard groups={home.groups} />
                <DashboardUpcomingRideCard ride={home.upcomingRide} />
            </div>
        </div><div className="mt-8 flex gap-3">
                <Link to="?upload=true">
                    <Button variant="primary">
                        Upload New GPX Route
                    </Button>
                </Link>
            </div></>

    );
}
