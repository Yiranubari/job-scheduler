import { JobStatus } from "@prisma/client";

export interface DependencyEdge {
  jobId: string;
  dependsOnJobId: string;
}

export function areDependenciesMet(statuses: JobStatus[]): boolean {
  return statuses.every((status) => status === "completed");
}

export function hasCycle(edges: DependencyEdge[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.jobId) ?? [];
    list.push(edge.dependsOnJobId);
    adjacency.set(edge.jobId, list);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();

  const visit = (node: string): boolean => {
    color.set(node, GRAY);
    for (const next of adjacency.get(node) ?? []) {
      const state = color.get(next) ?? WHITE;
      if (state === GRAY) return true;
      if (state === WHITE && visit(next)) return true;
    }
    color.set(node, BLACK);
    return false;
  };

  for (const node of adjacency.keys()) {
    if ((color.get(node) ?? WHITE) === WHITE && visit(node)) {
      return true;
    }
  }

  return false;
}
