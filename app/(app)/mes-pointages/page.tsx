import { requireNavigationAccessById } from "@/lib/navigation-guard";
import { getEmployeeRecentPointages } from "@/actions/employee/pointages";
import EmployeePointagesClient from "@/features/employee/pointages";

export default async function AppMyPointagesPage() {
  const auth = await requireNavigationAccessById("mes-pointages");
  const user = auth.user;

  const pointages = await getEmployeeRecentPointages(user.id, 30);

  return <EmployeePointagesClient pointages={pointages} canEdit={false} />;
}
