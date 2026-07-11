/*
  Reading order for the PDF exporter, per the settled rule (build
  instructions, PDF export step): depth-first traversal of the scene
  graph. Roots are scenes with no incoming links, ordered by sort_index.
  From each node, outgoing links are followed in order of the target
  scene's sort_index. A scene already visited is not re-emitted, so
  cycles and merge points (a scene reachable from more than one parent)
  emit on first visit only. After the traversal, any scene the DFS never
  reached (a cycle with no entry point from any root) is appended at the
  end, ordered by sort_index.

  Deterministic: the same graph and sort_index values always produce the
  same order.
*/

export interface ReadingOrderScene {
  id: string;
  sortIndex: number;
}

export interface ReadingOrderLink {
  fromSceneId: string;
  toSceneId: string;
}

export function computeReadingOrder(scenes: ReadingOrderScene[], links: ReadingOrderLink[]): string[] {
  const sortIndexById = new Map(scenes.map((scene) => [scene.id, scene.sortIndex]));
  const sceneIds = new Set(scenes.map((scene) => scene.id));

  const outgoingByFrom = new Map<string, string[]>();
  const hasIncoming = new Set<string>();
  for (const link of links) {
    if (!sceneIds.has(link.fromSceneId) || !sceneIds.has(link.toSceneId)) continue;
    if (!outgoingByFrom.has(link.fromSceneId)) outgoingByFrom.set(link.fromSceneId, []);
    outgoingByFrom.get(link.fromSceneId)!.push(link.toSceneId);
    hasIncoming.add(link.toSceneId);
  }
  for (const targets of outgoingByFrom.values()) {
    targets.sort((a, b) => sortIndexById.get(a)! - sortIndexById.get(b)!);
  }

  const roots = scenes
    .filter((scene) => !hasIncoming.has(scene.id))
    .sort((a, b) => a.sortIndex - b.sortIndex);

  const visited = new Set<string>();
  const order: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    order.push(id);
    for (const target of outgoingByFrom.get(id) ?? []) {
      visit(target);
    }
  }

  for (const root of roots) visit(root.id);

  const remaining = scenes.filter((scene) => !visited.has(scene.id)).sort((a, b) => a.sortIndex - b.sortIndex);
  for (const scene of remaining) order.push(scene.id);

  return order;
}
