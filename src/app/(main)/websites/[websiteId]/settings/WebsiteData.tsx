import { Button, Column, Dialog, DialogTrigger, Modal } from '@umami/react-zen';
import { ActionForm } from '@/components/common/ActionForm';
import {
  useLoginQuery,
  useMessages,
  useModified,
  useNavigation,
  useUserTeamsQuery,
} from '@/components/hooks';
import { ROLES } from '@/lib/constants';
import { WebsiteDeleteForm } from './WebsiteDeleteForm';
import { WebsiteResetForm } from './WebsiteResetForm';
import { WebsiteTransferForm } from './WebsiteTransferForm';

const TRANSFER_ROLES = new Set([ROLES.teamOwner, ROLES.teamManager]);

export function WebsiteData({ websiteId, onSave }: { websiteId: string; onSave?: () => void }) {
  const { t, labels, messages } = useMessages();
  const { user } = useLoginQuery();
  const { touch } = useModified();
  const { router, pathname, teamId, renderUrl } = useNavigation();
  const { data: teams } = useUserTeamsQuery(user.id);
  const isAdmin = pathname.startsWith('/admin');

  const canTransferWebsite = canTransfer(teams?.data, teamId, user.id);

  const handleSave = () => {
    touch('websites');
    onSave?.();
    router.push(renderUrl(`/websites`));
  };

  const handleReset = async () => {
    onSave?.();
  };

  return (
    <Column gap="6">
      {!isAdmin && (
        <ActionForm label={t(labels.transferWebsite)} description={t(messages.transferWebsite)}>
          <DialogTrigger>
            <Button isDisabled={!canTransferWebsite}>{t(labels.transfer)}</Button>
            <Modal>
              <Dialog title={t(labels.transferWebsite)} style={{ width: 400 }}>
                {({ close }) => (
                  <WebsiteTransferForm websiteId={websiteId} onSave={handleSave} onClose={close} />
                )}
              </Dialog>
            </Modal>
          </DialogTrigger>
        </ActionForm>
      )}

      <ActionForm label={t(labels.resetWebsite)} description={t(messages.resetWebsiteWarning)}>
        <DialogTrigger>
          <Button>{t(labels.reset)}</Button>
          <Modal>
            <Dialog title={t(labels.resetWebsite)} style={{ width: 400 }}>
              {({ close }) => (
                <WebsiteResetForm websiteId={websiteId} onSave={handleReset} onClose={close} />
              )}
            </Dialog>
          </Modal>
        </DialogTrigger>
      </ActionForm>

      <ActionForm label={t(labels.deleteWebsite)} description={t(messages.deleteWebsiteWarning)}>
        <DialogTrigger>
          <Button data-test="button-delete" variant="danger">
            {t(labels.delete)}
          </Button>
          <Modal>
            <Dialog title={t(labels.deleteWebsite)} style={{ width: 400 }}>
              {({ close }) => (
                <WebsiteDeleteForm websiteId={websiteId} onSave={handleSave} onClose={close} />
              )}
            </Dialog>
          </Modal>
        </DialogTrigger>
      </ActionForm>
    </Column>
  );
}

function canTransfer(teams: any[] = [], teamId: string | null | undefined, userId: string) {
  for (const { id, members = [] } of teams) {
    if (teamId && id !== teamId) {
      continue;
    }

    for (const { role, userId: memberUserId } of members) {
      if (memberUserId !== userId) {
        continue;
      }

      if (teamId) {
        return role === ROLES.teamOwner;
      }

      if (TRANSFER_ROLES.has(role)) {
        return true;
      }
    }
  }

  return false;
}
