import * as vscode from "vscode";

interface TabState {
  openedAt: Date;
  isActive: boolean;
  isPinned: boolean;
}

type TabKey = string;
function tabKey(tab: vscode.Tab): string {
  return JSON.stringify([tab.label, tab.input]);
}

const recentlyOpenedTabStatesByKey = new Map<TabKey, TabState>();

function onDidChangeTabs(e: vscode.TabChangeEvent): void {
  const enabled = vscode.workspace.getConfiguration().get<boolean>("keep-it-pinned.enable");
  if (!enabled) return;

  const now = new Date();
  for (const [key, state] of recentlyOpenedTabStatesByKey) {
    if (+state.openedAt - +now > 1000) recentlyOpenedTabStatesByKey.delete(key);
  }

  for (const closedTab of e.closed) {
    const recentlyOpenedTabState = recentlyOpenedTabStatesByKey.get(tabKey(closedTab));
    if (!recentlyOpenedTabState) continue;

    if (recentlyOpenedTabState.isActive && closedTab.isPinned && !recentlyOpenedTabState.isPinned) {
      vscode.commands.executeCommand("workbench.action.pinEditor");
    }
  }

  for (const tab of e.opened) {
    recentlyOpenedTabStatesByKey.set(tabKey(tab), {
      openedAt: now,
      isActive: tab.isActive,
      isPinned: tab.isPinned,
    });
  }

  for (const tab of e.changed) {
    const state = recentlyOpenedTabStatesByKey.get(tabKey(tab));
    if (!state) continue;

    Object.assign(state, {
      isActive: tab.isActive,
      isPinned: tab.isPinned,
    });
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.tabGroups.onDidChangeTabs(onDidChangeTabs), // prettier-ignore
  );
}
