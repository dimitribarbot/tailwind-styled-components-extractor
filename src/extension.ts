import * as vscode from "vscode";

import { getCorrespondingStyleFile } from "./lib/corresponding-file";
import { collectUnbound, generateDeclarations } from "./lib/extractor";
import { getTailwindStyledImportInsertion } from "./lib/imports";
import {
  insertTailwindStyledImport,
  insertStyles,
  modifyImports
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

    const document = editor.document;

    const config = vscode.workspace.getConfiguration(
      "tailwindStyledComponentsExtractor"
    );

    const text = document.getText();
    const unbound = collectUnbound(text);
    if (!unbound.length) {
      vscode.window.showWarningMessage(
        "[SCE] Nothing to extract: There are no unbound components"
      );
      return;
    }

    const exportIdentifier =
      type == "extractExportedToClipboard" || type == "extractToSeparateFile";

    const declarations = generateDeclarations({
      unbound,
      exportIdentifier
    });

    if (type == "extractToClipboard" || type == "extractExportedToClipboard") {
      let clipboardText = declarations;
      if (config.get("addImportStatement", true)) {
        const tailwindStyledImportInsertion = getTailwindStyledImportInsertion(
          editor.document.getText()
        );
        if (tailwindStyledImportInsertion) {
          clipboardText = tailwindStyledImportInsertion.insertionText + declarations;
        }
      }

      await vscode.env.clipboard.writeText(clipboardText);

      vscode.window.showInformationMessage(
        `[SCE] Copied to clipboard! (Found: ${unbound.length}) `
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

      await modifyImports(editor, styleFile, unbound);

      const styleFileEditor = await openFileInEditor(styleFile);
      await insertStyles(styleFileEditor, declarations);
      await insertTailwindStyledImport(styleFileEditor);

      await editor.document.save();
      await styleFileEditor.document.save();
    } else if (type == "extractToSameFile") {
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
