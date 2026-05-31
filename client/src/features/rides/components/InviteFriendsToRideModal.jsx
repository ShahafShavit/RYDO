import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { rideInvitesApi } from '@/features/rides/api/ride-invites-api';
import { useFriendsList } from '@/features/social/hooks/useFriendsList';
import Button from '@/shared/components/ui/button/Button';
import AnimatedModal from '@/shared/components/ui/modal/AnimatedModal';
import { ModalHeader, ModalPanel } from '@/shared/components/ui/modal/ModalPrimitives';
import UserAvatar from '@/shared/components/user/UserAvatar';
import { cn } from '@/shared/lib/cn';

export default function InviteFriendsToRideModal({ open, onClose, rideId, rideName }) {
  const { user } = useAuth();
  const handle = user?.handle ?? '';
  const { data: friendsData, isLoading } = useFriendsList(handle, { enabled: open && handle.length > 0 });
  const friends = friendsData?.items ?? [];
  const [selected, setSelected] = useState(() => new Set());

  const sendMut = useMutation({
    mutationFn: (userIds) => rideInvitesApi.sendInvites(rideId, userIds),
    onSuccess: () => {
      setSelected(new Set());
      onClose?.();
    },
  });

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedIds = useMemo(() => [...selected], [selected]);

  const handleSend = () => {
    if (!rideId || selectedIds.length === 0) return;
    sendMut.mutate(selectedIds);
  };

  return (
    <AnimatedModal open={open} onClose={onClose}>
      <ModalPanel className="max-h-[85vh] w-full overflow-y-auto" role="dialog" aria-modal="true">
        <ModalHeader title="Invite friends" onClose={onClose} />
        <p className="rydo-subtle mt-2 text-sm">
          {rideName ? (
            <>
              Share <span className="font-semibold text-fg">{rideName}</span> with friends.
            </>
          ) : (
            'Choose friends to invite to your ride.'
          )}
        </p>

        {isLoading ? (
          <p className="rydo-subtle mt-6 text-sm">Loading friends…</p>
        ) : friends.length === 0 ? (
          <p className="rydo-subtle mt-6 text-sm">Add friends first — they will appear here.</p>
        ) : (
          <ul className="mt-4 max-h-[40vh] space-y-2 overflow-y-auto">
            {friends.map((f) => {
              const checked = selected.has(f.id);
              return (
                <li key={f.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors',
                      checked ? 'border-accent/50 bg-accent/10' : 'border-border bg-surface-strong/40',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(f.id)}
                    />
                    <UserAvatar
                      avatarUrl={f.avatarUrl}
                      displayName={f.fullName}
                      sizeClass="h-10 w-10"
                      textClass="text-sm"
                    />
                    <span className="min-w-0 flex-1 font-medium text-fg">{f.fullName || 'Member'}</span>
                    <span
                      className={cn(
                        'h-5 w-5 shrink-0 rounded-md border-2',
                        checked ? 'border-accent bg-accent' : 'border-fg-subtle',
                      )}
                      aria-hidden
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {sendMut.isError ? (
          <p className="mt-3 text-sm text-red-400">{sendMut.error?.message || 'Could not send invites.'}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            disabled={sendMut.isPending || selectedIds.length === 0}
            onClick={handleSend}
          >
            {sendMut.isPending ? 'Sending…' : `Send invite${selectedIds.length === 1 ? '' : 's'}`}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={sendMut.isPending}>
            Skip for now
          </Button>
        </div>
      </ModalPanel>
    </AnimatedModal>
  );
}
