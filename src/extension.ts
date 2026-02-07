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

  context.subscriptions.push(registration);
}

export function deactivate(): void {
  // Cleanup if needed
}
