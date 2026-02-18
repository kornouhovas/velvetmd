import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './providers/markdownEditorProvider';
import { scrollStateToLine } from './utils/scrollUtils';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new MarkdownEditorProvider(context);

  const registration = vscode.window.registerCustomEditorProvider(
    'velvetMd.editor',
    provider,
    {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }
  );

  const openWithVelvetCommand = vscode.commands.registerCommand(
    'velvetMd.openWithVelvet',
    async () => {
      const textEditor = vscode.window.activeTextEditor;
      if (textEditor) {
        const line = textEditor.visibleRanges[0]?.start.line ?? 0;
        provider.setPendingScrollLine(textEditor.document.uri.toString(), line);
      }
      await vscode.commands.executeCommand('reopenActiveEditorWith', 'velvetMd.editor');
    }
  );

  const openWithTextEditorCommand = vscode.commands.registerCommand(
    'velvetMd.openWithTextEditor',
    async () => {
      // Capture document URI and scroll state before switching away from custom editor.
      // TabInputCustom is available when a custom editor tab is active.
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      const tabInput = activeTab?.input;
      const documentUri =
        tabInput instanceof vscode.TabInputCustom
          ? tabInput.uri.toString()
          : undefined;

      const scrollState = documentUri
        ? provider.getLastScrollState(documentUri)
        : undefined;

      await vscode.commands.executeCommand('workbench.action.reopenTextEditor');

      if (!documentUri || !scrollState) {
        return;
      }

      // Wait one event-loop tick for the text editor to become active after reopen.
      await new Promise<void>(resolve => setTimeout(resolve, 100));

      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.uri.toString() !== documentUri) {
        return;
      }

      const line = scrollStateToLine(
        scrollState.scrollTop,
        scrollState.scrollHeight,
        scrollState.viewportHeight,
        editor.document.lineCount
      );

      editor.revealRange(
        new vscode.Range(line, 0, line, 0),
        vscode.TextEditorRevealType.AtTop
      );
    }
  );

  context.subscriptions.push(registration, openWithVelvetCommand, openWithTextEditorCommand);
}

export function deactivate(): void {
  // Cleanup if needed
}
