import AgentManagement from '@/components/agentManagement/AgentDashboard';
import RoleGuard from '@/components/auth/RoleGuard';

export default function AgentsPage() {
  return (
    <RoleGuard allowedRoles={['manager']}>
      <AgentManagement />
    </RoleGuard>
  );
}