import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProfile } from '@/features/account/hooks/useAccount';
import Card from '@/shared/components/ui/card/Card';
import { Mail, User } from 'lucide-react';

export const UserDataDisplay = () => {
    const { user } = useAuth();
    const { data: profile } = useProfile();
    const account = profile || user;

    if (!account) return <div className="text-white/60">No user data available.</div>;

    return (
        <div className="space-y-6 max-w-md w-full">
            <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>

                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-rydo-purple/20 flex items-center justify-center text-rydo-purple">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-white/60">Full Name</p>
                            <p className="text-white font-medium">{account.fullName || 'Not provided'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-rydo-purple/20 flex items-center justify-center text-rydo-purple">
                            <Mail size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-white/60">Email Address</p>
                            <p className="text-white font-medium">{account.email}</p>
                        </div>
                    </div>

                    <div className="pt-4 mt-6 border-t border-white/10">
                        <p className="text-xs text-white/40 mb-2">Account ID: {account.id}</p>
                        <p className="text-xs text-white/40">Role: <span className="capitalize">{account.role}</span></p>
                    </div>
                </div>
            </Card>

            <p className="text-xs text-white/40 text-center">
                To export or delete your account data, please contact support.
            </p>
        </div>
    );
};
