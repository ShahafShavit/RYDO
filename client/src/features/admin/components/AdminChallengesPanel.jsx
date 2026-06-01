import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminChallengesApi } from '@/features/admin/api/admin-challenges-api';
import AdminChallengesTabs from '@/features/admin/components/challenges/AdminChallengesTabs';
import AdminChallengeInstancesView from '@/features/admin/components/challenges/AdminChallengeInstancesView';
import AdminChallengeTemplatesGrid from '@/features/admin/components/challenges/AdminChallengeTemplatesGrid';
import AdminChallengeCreateForm from '@/features/admin/components/challenges/AdminChallengeCreateForm';
import AdminConfirmModal from '@/features/admin/components/AdminConfirmModal';
import AdminInlineBanner from '@/features/admin/components/AdminInlineBanner';
import AdminErrorState from '@/features/admin/components/AdminErrorState';
import Loader from '@/shared/components/feedback/Loader';

const DEFAULT_FORM = {
  title: '',
  description: '',
  kind: 'quest',
  ruleType: 'Distance',
  targetValue: 400,
  lumpXp: 500,
  bonusPercent: 100,
  startDate: '',
  endDate: '',
  publish: true,
  isFeatured: false,
};

export default function AdminChallengesPanel({ variant = 'desktop' }) {
  const [tab, setTab] = useState('instances');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [skip, setSkip] = useState(0);
  const [take, setTake] = useState(20);
  const [progressSkip, setProgressSkip] = useState(0);
  const [progressTake, setProgressTake] = useState(20);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [confirm, setConfirm] = useState(null);
  const [banner, setBanner] = useState(null);
  const qc = useQueryClient();

  const instances = useQuery({
    queryKey: ['admin', 'challenges', 'instances', { skip, take, status: statusFilter }],
    queryFn: () => adminChallengesApi.getInstances({ skip, take, status: statusFilter || undefined }),
  });

  const templates = useQuery({
    queryKey: ['admin', 'challenges', 'templates'],
    queryFn: () => adminChallengesApi.getTemplates(),
  });

  const progress = useQuery({
    queryKey: ['admin', 'challenges', 'progress', selectedId, progressSkip, progressTake],
    queryFn: () => adminChallengesApi.getProgress(selectedId, { skip: progressSkip, take: progressTake }),
    enabled: selectedId != null,
  });

  const createMutation = useMutation({
    mutationFn: (body) => adminChallengesApi.createInstance(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      setTab('instances');
      setForm(DEFAULT_FORM);
      setBanner({ tone: 'success', message: 'Challenge instance published.' });
    },
    onError: (err) => {
      setBanner({ tone: 'error', message: err?.message || 'Could not publish instance.' });
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, body }) => adminChallengesApi.patchInstance(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      setBanner({ tone: 'success', message: 'Challenge updated.' });
    },
    onError: (err) => {
      setBanner({ tone: 'error', message: err?.message || 'Could not update challenge.' });
    },
  });

  async function handleConfirm() {
    if (!confirm) return;
    try {
      if (confirm.type === 'endEarly') {
        await patchMutation.mutateAsync({ id: confirm.row.id, body: { endEarly: true } });
      } else if (confirm.type === 'feature') {
        await patchMutation.mutateAsync({ id: confirm.row.id, body: { isFeatured: true } });
      }
      setConfirm(null);
    } catch (err) {
      setConfirm((prev) => ({ ...prev, error: err?.message || 'Action failed.' }));
    }
  }

  function handleSelect(id) {
    setSelectedId(id);
    setProgressSkip(0);
  }

  let content;
  if (tab === 'instances') {
    if (instances.isError) {
      content = <AdminErrorState message={instances.error?.message || 'Failed to load instances.'} />;
    } else {
      content = (
        <AdminChallengeInstancesView
          variant={variant}
          instancesQuery={instances}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setSkip(0);
          }}
          skip={skip}
          take={take}
          onSkipChange={setSkip}
          onTakeChange={(value) => {
            setTake(value);
            setSkip(0);
          }}
          selectedId={selectedId}
          onSelect={handleSelect}
          onEndEarly={(row) => setConfirm({ type: 'endEarly', row, error: null })}
          onFeature={(row) => setConfirm({ type: 'feature', row, error: null })}
          progressQuery={progress}
          progressSkip={progressSkip}
          onProgressSkipChange={setProgressSkip}
          progressTake={progressTake}
          onProgressTakeChange={(value) => {
            setProgressTake(value);
            setProgressSkip(0);
          }}
        />
      );
    }
  } else if (tab === 'templates') {
    if (templates.isLoading) content = <Loader />;
    else if (templates.isError) {
      content = <AdminErrorState message={templates.error?.message || 'Failed to load templates.'} />;
    } else {
      content = <AdminChallengeTemplatesGrid items={templates.data?.items ?? []} variant={variant} />;
    }
  } else {
    content = (
      <AdminChallengeCreateForm
        variant={variant}
        form={form}
        setForm={setForm}
        onSubmit={(body) => createMutation.mutate(body)}
        isPending={createMutation.isPending}
      />
    );
  }

  return (
    <>
      <AdminChallengesTabs tab={tab} onTabChange={setTab} className={variant === 'mobile' ? 'px-0' : undefined} />
      {banner ? (
        <AdminInlineBanner tone={banner.tone} message={banner.message} onDismiss={() => setBanner(null)} />
      ) : null}
      <div className={variant === 'desktop' ? 'mt-6' : 'mt-4'}>{content}</div>
      <AdminConfirmModal
        open={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.type === 'endEarly' ? 'End challenge early' : 'Feature challenge'}
        message={
          confirm
            ? confirm.type === 'endEarly'
              ? `End "${confirm.row.title}" before its scheduled end date?`
              : `Feature "${confirm.row.title}" on the challenges home screen?`
            : ''
        }
        confirmLabel={confirm?.type === 'endEarly' ? 'End early' : 'Feature'}
        variant="primary"
        isPending={patchMutation.isPending}
        error={confirm?.error}
      />
    </>
  );
}
