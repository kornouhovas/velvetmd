import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { debounce } from '../utils/debounce';
import { WebviewMessage } from '../types';

interface UpdateMetadata {
  source: 'webview' | 'external';
  timestamp: number;
}

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  /**
   * Time window (ms) after a webview update during which we assume
   * document changes originated from the webview itself.
   * This prevents the echo loop: webview -> document -> webview
   *
   * 500ms was chosen to account for:
   * - VS Code workspace edit latency (~50-100ms typical)
   * - Event propagation delays
   * - Safety margin for slower systems
   *
   * Values too low may cause update loops; too high may miss rapid external edits.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly WEBVIEW_UPDATE_COOLDOWN_MS = 500;

  /**
   * Debounce delay for document change events (in milliseconds)
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly DOCUMENT_CHANGE_DEBOUNCE_MS = 300;

  private readonly lastUpdates = new Map<string, UpdateMetadata>();
  private readonly logger: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.logger = vscode.window.createOutputChannel('Markdown Live Editor');
    context.subscriptions.push(this.logger);
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    try {
      // Setup webview options
      webviewPanel.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
          vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ]
      };

      // Set initial HTML content
      webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

      // Handle messages from webview
      const messageSubscription = this.setupMessageHandling(document, webviewPanel.webview);

      // Handle document changes (external edits)
      const { changeSubscription, cancelDebounce } = this.setupDocumentChangeHandling(
        document,
        webviewPanel
      );

      // Cleanup on disposal
      webviewPanel.onDidDispose(() => {
        messageSubscription.dispose();
        changeSubscription.dispose();
        cancelDebounce();
        this.lastUpdates.delete(document.uri.toString());
        this.log('INFO', `Editor disposed for: ${document.uri.fsPath}`);
      });

      // Send initial content to webview
      this.sendDocumentToWebview(document, webviewPanel.webview);

      this.log('INFO', `Editor opened for: ${document.uri.fsPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log('ERROR', `Failed to open editor: ${message}`);
      vscode.window.showErrorMessage(`Failed to open Markdown editor: ${message}`);
      throw error;
    }
  }

  private setupMessageHandling(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): vscode.Disposable {
    return webview.onDidReceiveMessage(async (message: unknown) => {
      if (!this.isValidWebviewMessage(message)) {
        this.log('WARN', 'Invalid message received from webview');
        return;
      }

      switch (message.type) {
        case 'update':
          if (typeof message.content !== 'string') {
            this.log('WARN', 'Invalid content type in update message');
            return;
          }
          await this.handleWebviewUpdate(document, message.content);
          break;
        case 'ready':
          this.log('INFO', 'Webview ready');
          this.sendDocumentToWebview(document, webview);
          break;
        case 'error':
          this.log('ERROR', `Webview error: ${message.message}`);
          vscode.window.showErrorMessage(`Markdown Editor: ${message.message}`);
          break;
        default:
          this.log('WARN', 'Unknown message type');
      }
    });
  }

  private isValidWebviewMessage(message: unknown): message is WebviewMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      (message.type === 'update' || message.type === 'ready' || message.type === 'error')
    );
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
    this.logger.appendLine(`[${new Date().toISOString()}] [${level}] ${message}`);
  }

  private async handleWebviewUpdate(
    document: vscode.TextDocument,
    content: string
  ): Promise<void> {
    // Track update source to prevent loops
    this.lastUpdates.set(document.uri.toString(), {
      source: 'webview',
      timestamp: Date.now()
    });

    this.log('INFO', `Update from webview: ${content.length} bytes`);

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    edit.replace(document.uri, fullRange, content);

    await vscode.workspace.applyEdit(edit);
  }

  private setupDocumentChangeHandling(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel
  ): { changeSubscription: vscode.Disposable; cancelDebounce: () => void } {
    const debouncedUpdate = debounce((doc: vscode.TextDocument) => {
      // Check if this change came from webview
      const lastUpdate = this.lastUpdates.get(doc.uri.toString());
      if (lastUpdate?.source === 'webview') {
        const timeSinceUpdate = Date.now() - lastUpdate.timestamp;
        if (timeSinceUpdate < MarkdownEditorProvider.WEBVIEW_UPDATE_COOLDOWN_MS) {
          this.log(
            'INFO',
            `Skipping update - came from webview (${timeSinceUpdate}ms ago)`
          );
          this.lastUpdates.delete(doc.uri.toString());
          return;
        }
      }

      this.log('INFO', 'External change detected, updating webview');
      this.sendDocumentToWebview(doc, webviewPanel.webview);
    }, MarkdownEditorProvider.DOCUMENT_CHANGE_DEBOUNCE_MS);

    const changeSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        debouncedUpdate(e.document);
      }
    });

    return {
      changeSubscription,
      cancelDebounce: () => debouncedUpdate.cancel()
    };
  }

  private sendDocumentToWebview(
    document: vscode.TextDocument,
    webview: vscode.Webview
  ): void {
    webview.postMessage({
      type: 'documentChanged',
      content: document.getText()
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js')
    );

    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview', 'styles.css')
    );

    const nonce = this.getNonce();
    const cspSource = webview.cspSource;
    const timestamp = Date.now();

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} https: data:; font-src ${cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Markdown Live Editor</title>
        <link href="${stylesUri}?t=${timestamp}" rel="stylesheet">
      </head>
      <body>
        <div id="editor"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;
  }


  private getNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }
}
