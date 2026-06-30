import { Suspense } from "react";
import { TasksView } from "@/components/tasks/tasks-view";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";

export default function TasksPage() {
  return (
    <Suspense fallback={<AppLoadingScreen label="Loading tasks…" />}>
      <TasksView />
    </Suspense>
  );
}
