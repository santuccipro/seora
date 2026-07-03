import { WorkspaceShell } from "@/components/workspace/sidebar";

/**
 * Shared layout for every logged-in feature page. Injects the workspace
 * sidebar so navigation between features stays consistent.
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
