import * as vscode from "vscode";

import { getCorrespondingStyleFile } from "./lib/corresponding-file";
import {
  collectUnboundComponents,
  Component,
  getComponentsSortedByClassNameOffsets,
  extractUnboundComponentNames,
  generateDeclarations,
  getUnderlyingComponent,
  UnboundComponent
} from "./lib/extractor";
import { getTailwindStyledImportInsertion } from "./lib/imports";
import {
  insertTailwindStyledImport,
  insertStyles,
  modifyImports,
  replaceComponentClassNamesWithPropAttributes,
  executeFormatCommand,
  renameTag
} from "./lib/modify-vscode-editor";
import { askForName, openFileInEditor } from "./lib/vscode-utils";

const supportedLangs = ["javascript", "javascriptreact", "typescriptreact"];

type ExtractType =
  | "extractCurrentToSameFile"
  | "extractCurrentToSeparateFile"
  | "extractUnboundToClipboard"
  | "extractExportedUnboundToClipboard"
  | "extractUnboundToSameFile"
  | "extractUnboundToSeparateFile";

const extractCurrentToSeparateFile = async (
  editor: vscode.TextEditor,
  config: vscode.WorkspaceConfiguration,
  component: Component,
  declarations: string
) => {
  const styleFile = getCorrespondingStyleFile(
    editor.document.uri.path,
    config.get("separateFile.outputFile", "$name.styles"),
    config.get(
      "tailwindStyledComponentsExtractor.separateFile.advanced.inputFileRegex",
      ""
    )
  );
  if (!styleFile) {
    vscode.window.showWarningMessage(
      "[TSCE] This file does not match the pattern in your configuration."
    );
    return;
  }

  await renameTag(
    editor,
    component.name,
    component.closingTagOffsets ? [component.closingTagOffsets] : []
  );
  await replaceComponentClassNamesWithPropAttributes(editor, [component]);
  await renameTag(editor, component.name, [component.openingTagOffsets]);
  await modifyImports(editor, styleFile, [component.name]);
  await executeFormatCommand();

  const styleFileEditor = await openFileInEditor(styleFile);
  await insertStyles(styleFileEditor, declarations);
  await insertTailwindStyledImport(styleFileEditor);
  await executeFormatCommand();

  await editor.document.save();
  await styleFileEditor.document.save();
};

const extractCurrentToSameFile = async (
  editor: vscode.TextEditor,
  component: Component,
  declarations: string
) => {
  await renameTag(
    editor,
    component.name,
    component.closingTagOffsets ? [component.closingTagOffsets] : []
  );
  await replaceComponentClassNamesWithPropAttributes(editor, [component]);
  await renameTag(editor, component.name, [component.openingTagOffsets]);

  await insertStyles(editor, declarations);
  await insertTailwindStyledImport(editor);
  await executeFormatCommand();

  await editor.document.save();
};

const extractUnboundToClipboard = async (
  editor: vscode.TextEditor,
  config: vscode.WorkspaceConfiguration,
  components: UnboundComponent[],
  declarations: string
) => {
  let clipboardText = declarations;
  if (config.get("addImportStatement", true)) {
    const tailwindStyledImportInsertion = getTailwindStyledImportInsertion(
      editor.document.getText()
    );
    if (tailwindStyledImportInsertion) {
      clipboardText =
        tailwindStyledImportInsertion.insertionText + declarations;
    }
  }

  await vscode.env.clipboard.writeText(clipboardText);

  vscode.window.showInformationMessage(
    `[TSCE] Copied to clipboard! (Found: ${components.length}) `
  );
};

const extractUnboundToSeparateFile = async (
  editor: vscode.TextEditor,
  config: vscode.WorkspaceConfiguration,
  components: UnboundComponent[],
  declarations: string
) => {
  const styleFile = getCorrespondingStyleFile(
    editor.document.uri.path,
    config.get("separateFile.outputFile", "$name.styles"),
    config.get(
      "tailwindStyledComponentsExtractor.separateFile.advanced.inputFileRegex",
      ""
    )
  );
  if (!styleFile) {
    vscode.window.showWarningMessage(
      "[TSCE] This file does not match the pattern in your configuration."
    );
    return;
  }

  const unboundComponentNames = extractUnboundComponentNames(components);
  const componentsSortedByClassNameOffsets =
    getComponentsSortedByClassNameOffsets(components);
  await replaceComponentClassNamesWithPropAttributes(
    editor,
    componentsSortedByClassNameOffsets
  );
  await modifyImports(editor, styleFile, unboundComponentNames);
  await executeFormatCommand();

  const styleFileEditor = await openFileInEditor(styleFile);
  await insertStyles(styleFileEditor, declarations);
  await insertTailwindStyledImport(styleFileEditor);
  await executeFormatCommand();

  await editor.document.save();
  await styleFileEditor.document.save();
};

const extractUnboundToSameFile = async (
  editor: vscode.TextEditor,
  components: UnboundComponent[],
  declarations: string
) => {
  const componentsSortedByClassNameOffsets =
    getComponentsSortedByClassNameOffsets(components);
  await replaceComponentClassNamesWithPropAttributes(
    editor,
    componentsSortedByClassNameOffsets
  );

  await insertStyles(editor, declarations);
  await insertTailwindStyledImport(editor);
  await executeFormatCommand();

  await editor.document.save();
};

const extract = async (type: ExtractType): Promise<void> => {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    if (
      supportedLangs.indexOf(editor.document.languageId) === -1 &&
      !/\.(js|ts)x?$/.test(editor.document.fileName)
    ) {
      vscode.window.showWarningMessage(
        "[TSCE] Only `.js`, `.ts`, `.jsx` and `.tsx` are supported"
      );
      return;
    }

    const config = vscode.workspace.getConfiguration(
      "tailwindStyledComponentsExtractor"
    );

    const text = editor.document.getText();
    const offset = editor.document.offsetAt(editor.selection.active);

    const exportIdentifier =
      type == "extractCurrentToSeparateFile" ||
      type == "extractExportedUnboundToClipboard" ||
      type == "extractUnboundToSeparateFile";

    if (
      type === "extractCurrentToSameFile" ||
      type === "extractCurrentToSeparateFile"
    ) {
      const component = getUnderlyingComponent(text, offset);
      if (!component) {
        vscode.window.showWarningMessage(
          "[TSCE] Nothing to extract: There is no underlying component"
        );
        return;
      }

      const componentName = await askForName();
      if (!componentName) {
        return;
      }

      component.name = componentName;

      const declarations = generateDeclarations({
        components: [component],
        exportIdentifier
      });

      if (type == "extractCurrentToSeparateFile") {
        await extractCurrentToSeparateFile(
          editor,
          config,
          component,
          declarations
        );
      } else if (type == "extractCurrentToSameFile") {
        await extractCurrentToSameFile(editor, component, declarations);
      }
    } else {
      const components = collectUnboundComponents(text);
      if (!components.length) {
        vscode.window.showWarningMessage(
          "[TSCE] Nothing to extract: There are no unbound components"
        );
        return;
      }

      const declarations = generateDeclarations({
        components,
        exportIdentifier
      });

      if (
        type == "extractUnboundToClipboard" ||
        type == "extractExportedUnboundToClipboard"
      ) {
        await extractUnboundToClipboard(
          editor,
          config,
          components,
          declarations
        );
      } else if (type == "extractUnboundToSeparateFile") {
        await extractUnboundToSeparateFile(
          editor,
          config,
          components,
          declarations
        );
      } else if (type == "extractUnboundToSameFile") {
        await extractUnboundToSameFile(editor, components, declarations);
      }
    }
  } catch (e) {
    if (e instanceof Error && Object.getPrototypeOf(e).name === "SyntaxError") {
      vscode.window.showErrorMessage(
        `[TSCE] Failed to extract due to syntax error: ${e.message}`
      );
    } else {
      console.error("[TSCE]", e);
      vscode.window.showErrorMessage(
        "[TSCE] Unexpected error while extracting"
      );
    }
  }
};

export const activate = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractCurrentToSameFile",
      () => extract("extractCurrentToSameFile")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractCurrentToSeparateFile",
      () => extract("extractCurrentToSeparateFile")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractUnboundToClipboard",
      () => extract("extractUnboundToClipboard")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractExportedUnboundToClipboard",
      () => extract("extractExportedUnboundToClipboard")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractUnboundToSameFile",
      () => extract("extractUnboundToSameFile")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractUnboundToSeparateFile",
      () => extract("extractUnboundToSeparateFile")
    )
  );
};
