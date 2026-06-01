import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import BoldScrollArea from '@/shared/components/bold/BoldScrollArea';
import BoldScreen from '@/shared/components/bold/BoldScreen';

export default function AdminPageShell({
  title,
  eyebrow = 'Admin',
  description = null,
  headerActions = null,
  toolbar = null,
  desktop,
  mobile,
  banner = null,
}) {
  return (
    <>
      <section className="hidden min-w-0 space-y-6 pb-8 md:block">
        <AdminPageHeader title={title} eyebrow={eyebrow} description={description} actions={headerActions} />
        {banner}
        {toolbar}
        {desktop}
      </section>

      <div className="flex h-full min-h-0 flex-1 flex-col md:hidden">
        <BoldScreen className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0">
              <AdminPageHeader title={title} eyebrow={eyebrow} description={description} actions={headerActions} />
              {banner ? <div className="px-4 pt-3">{banner}</div> : null}
              {toolbar ? <div className="px-4 pt-3">{toolbar}</div> : null}
            </div>
            <BoldScrollArea className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain px-4 pt-2">
              {mobile}
            </BoldScrollArea>
          </div>
        </BoldScreen>
      </div>
    </>
  );
}
