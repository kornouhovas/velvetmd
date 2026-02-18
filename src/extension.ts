import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './providers/markdownEditorProvider';

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
      await vscode.commands.executeCommand('workbench.action.reopenTextEditor');
    }
  );

  context.subscriptions.push(registration, openWithVelvetCommand, openWithTextEditorCommand);
}

export function deactivate(): void {
  // Cleanup if needed
}
