import * as vscode from "vscode";

import { ClassNameOffsets } from "./extractor";
import {
  getImportInsertion,
  getTailwindStyledImportInsertion
} from "./imports";
import { relativeImportPathFromFile } from "./path-utils";
import { endOfFile } from "./vscode-utils";

export async function modifyImports(
  editor: vscode.TextEditor,
  fileToImport: string,
  modulesToImport: string[]
) {
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
  await editor.document.save();
}

export async function removeClassNames(
  editor: vscode.TextEditor,
  classNameOffsetsToRemove: ClassNameOffsets[]
) {
  const classNameRangesToRemove = classNameOffsetsToRemove.map(offsets => {
    const startPosition = editor.document.positionAt(offsets.start);
    const endPosition = editor.document.positionAt(offsets.end);
    return new vscode.Range(startPosition, endPosition);
  });

  await editor.edit(editBuilder => {
    classNameRangesToRemove.forEach(classNameRangeToRemove => {
      editBuilder.delete(classNameRangeToRemove);
    });
  });
  await editor.document.save();
}

export async function insertTailwindStyledImport(editor: vscode.TextEditor) {
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
}

export async function insertStyles(
  editor: vscode.TextEditor,
  declarations: string
) {
  const end = endOfFile(editor);
  const declarationsToInsert = `\n\n${declarations}`;
  await editor.edit(editBuilder => {
    editBuilder.insert(end, declarationsToInsert);
  });

  const newEnd = editor.document.positionAt(
    editor.document.offsetAt(end) + declarationsToInsert.length
  );
  await editor.revealRange(new vscode.Range(end, newEnd));
}
