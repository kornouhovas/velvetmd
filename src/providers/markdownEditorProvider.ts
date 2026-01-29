import * as vscode from 'vscode';

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly context: vscode.ExtensionContext) {
    // Context will be used in Task 2 for webview resources
  }

  public async resolveCustomTextEditor(
    _document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    try {
      // TODO(Task-2): Implement webview content and message handling
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
          vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ]
      };

      webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to open Markdown editor: ${message}`);
      throw error;
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = this.getNonce();
    const cspSource = webview.cspSource;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data:;">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Markdown Live Editor</title>
      </head>
      <body>
        <h1>Markdown Live Editor - Coming Soon</h1>
        <p>Task 2 will implement the full editor provider.</p>
      </body>
      </html>
    `;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
