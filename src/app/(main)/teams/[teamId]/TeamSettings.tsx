import { Column, Heading, Row } from '@umami/react-zen';
import { TeamLeaveButton } from '@/app/(main)/teams/TeamLeaveButton';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useLoginQuery, useMessages, useNavigation, useTeam } from '@/components/hooks';
import { Users } from '@/components/icons';
import { ROLES } from '@/lib/constants';
import { TeamsMemberAddButton } from '../TeamsMemberAddButton';
import { TeamEditForm } from './TeamEditForm';
import { TeamManage } from './TeamManage';
import { TeamMembersDataTable } from './TeamMembersDataTable';

export function TeamSettings({ teamId }: { teamId: string }) {
  const team: any = useTeam();
  const { user } = useLoginQuery();
  const { pathname } = useNavigation();
  const { t, labels } = useMessages();

  const isAdmin = pathname.includes('/admin');
  const { isTeamOwner, canManageTeam } = getTeamPermissions(team?.members, user.id);

  const allowOwnerActions = isTeamOwner && user.role !== ROLES.viewOnly;
  const canEdit = user.isAdmin || (canManageTeam && user.role !== ROLES.viewOnly);

  return (
    <Column gap="6">
      <PageHeader title={team?.name} icon={<Users />}>
        {!allowOwnerActions && !isAdmin && (
          <TeamLeaveButton teamId={team.id} teamName={team.name} />
        )}
      </PageHeader>
      <Panel>
        <TeamEditForm teamId={teamId} allowEdit={canEdit} showAccessCode={canEdit} />
      </Panel>
      <Panel>
        <Row alignItems="center" justifyContent="space-between">
          <Heading size="base">{t(labels.members)}</Heading>
          {isAdmin && <TeamsMemberAddButton teamId={teamId} />}
        </Row>
        <TeamMembersDataTable teamId={teamId} allowEdit={canEdit} />
      </Panel>
      {allowOwnerActions && (
        <Panel>
          <TeamManage teamId={teamId} />
        </Panel>
      )}
    </Column>
  );
}

function getTeamPermissions(members: any[] = [], userId: string) {
  let isTeamOwner = false;
  let canManageTeam = false;

  for (const member of members) {
    if (member.userId !== userId) {
      continue;
    }

    isTeamOwner = member.role === ROLES.teamOwner;
    canManageTeam = isTeamOwner || member.role === ROLES.teamManager;
    break;
  }

  return { isTeamOwner, canManageTeam };
}
