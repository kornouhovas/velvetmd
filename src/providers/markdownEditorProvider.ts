import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { debounce } from '../utils/debounce';
import { WebviewMessage, ConfigMessage, ScrollSyncMessage, ScrollState } from '../types';
import { MAX_CONTENT_SIZE_BYTES, formatBytes } from '../constants';
import { isWithinCooldown, isEchoContent, isValidScrollDimension } from '../utils/providerUtils';

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
   * 1000ms accounts for:
   * - 30ms onUpdate debounce in webview
   * - ~50ms IPC latency
   * - 150ms document-change debounce
   * - Safety margin for slow systems / large documents
   *
   * Total round-trip is ~230ms, so 1000ms gives ~770ms safety buffer.
   *
   * Trade-off: external edits (git, other editors) made within 1 second of a
   * user keystroke are suppressed by this guard. The content-based echo check
   * (`isEchoContent`) provides a second layer for slow echoes, but cannot
   * distinguish a genuine external edit with identical content.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly WEBVIEW_UPDATE_COOLDOWN_MS = 1000;

  /**
   * Debounce delay for document change events (in milliseconds).
   * 150ms is fast enough for responsive external-edit detection while
   * keeping the total round-trip well within the cooldown window.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly DOCUMENT_CHANGE_DEBOUNCE_MS = 150;

  private readonly lastUpdates = new Map<string, UpdateMetadata>();
  private readonly lastWebviewContent = new Map<string, string>();
  private readonly lastScrollState = new Map<string, ScrollState>();
  private readonly pendingScrollLines = new Map<string, number>();
  private readonly logger: vscode.OutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.logger = vscode.window.createOutputChannel('Velvet MD');
    context.subscriptions.push(this.logger);
  }

  public setPendingScrollLine(uri: string, line: number): void {
    this.pendingScrollLines.set(uri, line);
  }

  public getLastScrollState(uri: string): ScrollState | undefined {
    return this.lastScrollState.get(uri);
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

      // Re-send config when VS Code settings change
      const configSubscription = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('velvetMd')) {
          this.sendConfigToWebview(webviewPanel.webview);
        }
      });

      // Cleanup on disposal
      webviewPanel.onDidDispose(() => {
        messageSubscription.dispose();
        changeSubscription.dispose();
        configSubscription.dispose();
        cancelDebounce();
        this.lastUpdates.delete(document.uri.toString());
        this.lastWebviewContent.delete(document.uri.toString());
        this.lastScrollState.delete(document.uri.toString());
        this.pendingScrollLines.delete(document.uri.toString());
        this.log('INFO', `Editor disposed for: ${document.uri.fsPath}`);
      });

      // Send initial content to webview
      this.sendDocumentToWebview(document, webviewPanel.webview);

      // Send initial config
      this.sendConfigToWebview(webviewPanel.webview);

      this.log('INFO', `Editor opened for: ${document.uri.fsPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log('ERROR', `Failed to open editor: ${message}`);
      vscode.window.showErrorMessage(`Failed to open Velvet MD editor: ${message}`);
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
          // SECURITY: Validate content size to prevent DoS attacks from compromised webview
          if (message.content.length > MAX_CONTENT_SIZE_BYTES) {
            this.log('WARN', `Content too large: ${formatBytes(message.content.length)} (max: ${formatBytes(MAX_CONTENT_SIZE_BYTES)})`);
            vscode.window.showWarningMessage(`Content size ${formatBytes(message.content.length)} exceeds maximum allowed size of ${formatBytes(MAX_CONTENT_SIZE_BYTES)}`);
            return;
          }
          await this.handleWebviewUpdate(document, message.content);
          break;
        case 'ready':
          this.log('INFO', 'Webview ready');
          this.sendDocumentToWebview(document, webview);
          this.sendConfigToWebview(webview);
          {
            const pendingLine = this.pendingScrollLines.get(document.uri.toString());
            if (pendingLine !== undefined) {
              this.pendingScrollLines.delete(document.uri.toString());
              webview.postMessage({
                type: 'scrollRestoreLine',
                line: pendingLine,
                totalLines: document.lineCount
              });
            }
          }
          break;
        case 'error':
          this.log('ERROR', `Webview error: ${message.message}`);
          vscode.window.showErrorMessage(`Velvet MD: ${message.message}`);
          break;
        case 'scrollSync': {
          const msg = message as ScrollSyncMessage;
          if (
            isValidScrollDimension(msg.scrollTop) &&
            isValidScrollDimension(msg.scrollHeight) &&
            isValidScrollDimension(msg.viewportHeight)
          ) {
            this.lastScrollState.set(document.uri.toString(), {
              scrollTop: msg.scrollTop,
              scrollHeight: msg.scrollHeight,
              viewportHeight: msg.viewportHeight
            });
          }
          break;
        }
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
      (
        message.type === 'update' ||
        message.type === 'ready' ||
        message.type === 'error' ||
        message.type === 'scrollSync'
      )
    );
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
    this.logger.appendLine(`[${new Date().toISOString()}] [${level}] ${message}`);
  }

  private getConfig(): { autoReloadOnExternalChanges: boolean; showSyntaxOnFocus: boolean } {
    const cfg = vscode.workspace.getConfiguration('velvetMd');
    return {
      autoReloadOnExternalChanges: cfg.get('autoReloadOnExternalChanges', true),
      showSyntaxOnFocus: cfg.get('showSyntaxOnFocus', true)
    };
  }

  private sendConfigToWebview(webview: vscode.Webview): void {
    const { showSyntaxOnFocus } = this.getConfig();
    webview.postMessage({ type: 'config', showSyntaxOnFocus } satisfies ConfigMessage);
  }

  private async handleWebviewUpdate(
    document: vscode.TextDocument,
    content: string
  ): Promise<void> {
    // Track update source to prevent loops
    // Update timestamp on EVERY update from webview, not just the first
    this.lastUpdates.set(document.uri.toString(), {
      source: 'webview',
      timestamp: Date.now()  // Always reflects MOST RECENT webview update
    });

    // Store content for content-based echo detection
    this.lastWebviewContent.set(document.uri.toString(), content);

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
        if (isWithinCooldown(lastUpdate.timestamp, Date.now(), MarkdownEditorProvider.WEBVIEW_UPDATE_COOLDOWN_MS)) {
          this.log(
            'INFO',
            `Skipping update - came from webview (${timeSinceUpdate}ms ago)`
          );
          // DON'T delete here - keep the entry to protect against subsequent debounced updates
          return;
        }
      }

      // Cooldown expired - check if content matches last webview update (slow echo)
      const lastContent = this.lastWebviewContent.get(doc.uri.toString());
      if (isEchoContent(doc.getText(), lastContent)) {
        this.log(
          'INFO',
          'Skipping update - content matches last webview update (slow echo)'
        );
        this.lastWebviewContent.delete(doc.uri.toString());
        this.lastUpdates.delete(doc.uri.toString());
        return;
      }

      // Genuine external change
      this.lastUpdates.delete(doc.uri.toString());
      this.lastWebviewContent.delete(doc.uri.toString());

      if (!this.getConfig().autoReloadOnExternalChanges) {
        this.log('INFO', 'autoReloadOnExternalChanges disabled, skipping reload');
        return;
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
    const scrollState = this.lastScrollState.get(document.uri.toString());
    webview.postMessage({
      type: 'documentChanged',
      content: document.getText(),
      ...(scrollState !== undefined ? { scrollTop: scrollState.scrollTop } : {})
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
        <!--
          SECURITY NOTE: 'unsafe-inline' is required for Tiptap/ProseMirror editor functionality.
          ProseMirror dynamically generates inline styles for editor behavior (cursor positioning,
          selections, decorations). This is a known limitation of ProseMirror-based editors.
          Alternative nonce-based CSP would require patching Tiptap's core, which is not feasible.
          This is an acceptable risk for a markdown editor operating on local files.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} https: data:; font-src ${cspSource};">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Velvet MD</title>
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
