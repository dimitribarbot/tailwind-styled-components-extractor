import * as vscode from "vscode";

const capitalizeFirstLetter = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const normalizeComponentName = (name: string) =>
  name
    .split(/[\s-_]+/)
    .map(capitalizeFirstLetter)
    .join("");

export const openFileInEditor = async (path: string) => {
  let document: vscode.TextDocument;
  try {
    document = await vscode.workspace.openTextDocument(path);
  } catch {
    const untitledDocument = await vscode.workspace.openTextDocument(
      vscode.Uri.file(path).with({ scheme: "untitled" })
    );
    // Wacky workaround, see https://github.com/microsoft/vscode/issues/25729
    await untitledDocument.save();
    document = await vscode.workspace.openTextDocument(path);
  }
  await vscode.window.showTextDocument(document);
  // We know there is an active editor, we just opened one
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return vscode.window.activeTextEditor!;
};

export const endOfFile = (editor: vscode.TextEditor) => {
  const line = editor.document.lineAt(editor.document.lineCount - 1);
  return line.range.end;
};

export const askForName = async () => {
  const name = await vscode.window.showInputBox({
    prompt: "Component name"
  });
  if (!name) {
    return false;
  }
  return normalizeComponentName(name);
};
