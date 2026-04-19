import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/app/router/route-paths';
import { clubsApi } from '@/features/clubs/api/clubs-api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/shared/lib/cn';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel, modalHintClass } from '@/shared/components/ui/modal/ModalPrimitives';
import Input from '@/shared/components/ui/input/Input';

export default function RedeemClubInviteModal({ isOpen, onClose }) {
  const titleId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [token, setToken] = useState('');

  const redeemMut = useMutation({
    mutationFn: () => clubsApi.redeemInvite(token.trim()),
    onSuccess: (data) => {
      const clubId = data?.clubId;
      setToken('');
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      onClose();
      if (clubId != null) {
        navigate(ROUTES.clubDetails.replace(':clubId', String(clubId)));
      }
    },
  });

  return (
    <AnimatedModal open={isOpen} onClose={onClose} maxWidthClassName="max-w-md">
      <ModalPanel className="w-full" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <ModalHeader title="Join with invite code" titleId={titleId} onClose={onClose} />
        {!user ? (
          <p className={cn('mt-4', modalHintClass)}>
            <Link to={ROUTES.login} className="text-rydo-purple hover:underline">
              Sign in
            </Link>{' '}
            to redeem an invite code.
          </p>
        ) : (
          <>
            <p className={cn('mt-3', modalHintClass)}>Paste the code from your club admin.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Invite code" className="flex-1 min-w-[12rem]" />
              <Button
                variant="neon"
                type="button"
                onClick={() => redeemMut.mutate()}
                disabled={!token.trim() || redeemMut.isPending}
              >
                {redeemMut.isPending ? 'Redeeming…' : 'Redeem'}
              </Button>
            </div>
            {redeemMut.isError ? (
              <p className="mt-3 text-sm text-red-400">Could not redeem this code. Check it and try again.</p>
            ) : null}
          </>
        )}
        <div className="mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </ModalPanel>
    </AnimatedModal>
  );
}
