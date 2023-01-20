import * as vscode from "vscode";

import { Offsets } from "./extractor";
import {
  getImportInsertion,
  getTailwindStyledImportInsertion
} from "./imports";
import { relativeImportPathFromFile } from "./path-utils";
import { endOfFile } from "./vscode-utils";

const convertOffsetsToRanges = (
  editor: vscode.TextEditor,
  offsetsToConvert: Offsets[]
) =>
  offsetsToConvert.map(offsets => {
    const startPosition = editor.document.positionAt(offsets.start);
    const endPosition = editor.document.positionAt(offsets.end);
    return new vscode.Range(startPosition, endPosition);
  });

export const executeFormatCommand = () =>
  vscode.commands.executeCommand("editor.action.formatDocument");

export const modifyImports = async (
  editor: vscode.TextEditor,
  fileToImport: string,
  modulesToImport: string[]
) => {
  const importPath = relativeImportPathFromFile(
    editor.document.uri.path,
    fileToImport
  );

  const { insertionText, insertionOffset } = getImportInsertion(
    editor.document.getText(),
    importPath,
    modulesToImport
  );

  const insertionPosition = editor.document.positionAt(insertionOffset);
  await editor.edit(editBuilder => {
    editBuilder.insert(insertionPosition, insertionText);
  });
};

export const renameTag = async (
  editor: vscode.TextEditor,
  newName: string,
  tagOffsetsToRename: Offsets[]
) => {
  const tagRangesToRename = convertOffsetsToRanges(editor, tagOffsetsToRename);

  await editor.edit(editBuilder => {
    tagRangesToRename.forEach(tagRangeToRename => {
      editBuilder.replace(tagRangeToRename, newName);
    });
  });
};

export const removeClassNames = async (
  editor: vscode.TextEditor,
  classNameOffsetsToRemove: Offsets[]
) => {
  const classNameRangesToRemove = convertOffsetsToRanges(
    editor,
    classNameOffsetsToRemove
  );

  await editor.edit(editBuilder => {
    classNameRangesToRemove.forEach(classNameRangeToRemove => {
      editBuilder.delete(classNameRangeToRemove);
    });
  });
};

export const insertTailwindStyledImport = async (editor: vscode.TextEditor) => {
  const tailwindStyledImportInsertion = getTailwindStyledImportInsertion(
    editor.document.getText()
  );

  if (tailwindStyledImportInsertion) {
    const { insertionText, insertionOffset } = tailwindStyledImportInsertion;

    const insertionPosition = editor.document.positionAt(insertionOffset);
    await editor.edit(editBuilder => {
      editBuilder.insert(insertionPosition, insertionText);
    });
  }
};

export const insertStyles = async (
  editor: vscode.TextEditor,
  declarations: string
) => {
  const end = endOfFile(editor);
  const declarationsToInsert = `\n\n${declarations}`;
  await editor.edit(editBuilder => {
    editBuilder.insert(end, declarationsToInsert);
  });

  const newEnd = editor.document.positionAt(
    editor.document.offsetAt(end) + declarationsToInsert.length
  );
  await editor.revealRange(new vscode.Range(end, newEnd));
};
