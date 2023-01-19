import * as vscode from "vscode";

import { getCorrespondingStyleFile } from "./lib/corresponding-file";
import {
  collectUnboundComponents,
  extractUnboundComponentClassNameOffsets,
  extractUnboundComponentNames,
  generateDeclarations
} from "./lib/extractor";
import { getTailwindStyledImportInsertion } from "./lib/imports";
import {
  insertTailwindStyledImport,
  insertStyles,
  modifyImports,
  removeClassNames
} from "./lib/modify-vscode-editor";
import { openFileInEditor } from "./lib/vscode-utils";

const supportedLangs = ["javascript", "javascriptreact", "typescriptreact"];

type ExtractType =
  | "extractToClipboard"
  | "extractExportedToClipboard"
  | "extractToSameFile"
  | "extractToSeparateFile";

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
        "[SCE] Only `.js`, `.ts`, `.jsx` and `.tsx` are supported"
      );
      return;
    }

    const config = vscode.workspace.getConfiguration(
      "tailwindStyledComponentsExtractor"
    );

    const text = editor.document.getText();
    const unboundComponents = collectUnboundComponents(text);
    if (!unboundComponents.length) {
      vscode.window.showWarningMessage(
        "[SCE] Nothing to extract: There are no unbound components"
      );
      return;
    }

    const exportIdentifier =
      type == "extractExportedToClipboard" || type == "extractToSeparateFile";

    const declarations = generateDeclarations({
      unboundComponents,
      exportIdentifier
    });

    if (type == "extractToClipboard" || type == "extractExportedToClipboard") {
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
        `[SCE] Copied to clipboard! (Found: ${unboundComponents.length}) `
      );
    } else if (type == "extractToSeparateFile") {
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
          "[SCE] This file does not match the pattern in your configuration."
        );
        return;
      }

      const unboundComponentNames =
        extractUnboundComponentNames(unboundComponents);
      const unboundComponentClassNameOffsets =
        extractUnboundComponentClassNameOffsets(unboundComponents);
      await removeClassNames(editor, unboundComponentClassNameOffsets);
      await modifyImports(editor, styleFile, unboundComponentNames);

      const styleFileEditor = await openFileInEditor(styleFile);
      await insertStyles(styleFileEditor, declarations);
      await insertTailwindStyledImport(styleFileEditor);

      await editor.document.save();
      await styleFileEditor.document.save();
    } else if (type == "extractToSameFile") {
      const unboundComponentClassNameOffsets =
        extractUnboundComponentClassNameOffsets(unboundComponents);
      await removeClassNames(editor, unboundComponentClassNameOffsets);

      await insertStyles(editor, declarations);
      await insertTailwindStyledImport(editor);

      await editor.document.save();
    }
  } catch (e) {
    if (e instanceof Error && Object.getPrototypeOf(e).name === "SyntaxError") {
      vscode.window.showErrorMessage(
        `[SCE] Failed to extract due to syntax error: ${e.message}`
      );
    } else {
      console.error("[SCE]", e);
      vscode.window.showErrorMessage("[SCE] Unexpected error while extracting");
    }
  }
};

export const activate = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractToClipboard",
      () => extract("extractToClipboard")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractExportedToClipboard",
      () => extract("extractExportedToClipboard")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractToSameFile",
      () => extract("extractToSameFile")
    ),
    vscode.commands.registerCommand(
      "tailwindStyledComponentsExtractor.extractToSeparateFile",
      () => extract("extractToSeparateFile")
    )
  );
};
