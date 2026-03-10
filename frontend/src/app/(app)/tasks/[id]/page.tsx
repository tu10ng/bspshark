import { notFound } from "next/navigation";
import { getTask } from "@/lib/api";
import { TaskDetailView } from "@/components/tasks/task-detail";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let task;
  try {
    task = await getTask(id);
  } catch {
    notFound();
  }

  return <TaskDetailView task={task} />;
}
