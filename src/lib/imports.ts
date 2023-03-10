export const getImportInsertion = (
  existingText: string,
  importPath: string,
  modulesToImport: string[]
) => {
  const importRegex = new RegExp(
    `(import {[^}]*?)[\\s\\n]+} from "${importPath}"[;]?`,
    "gm"
  );
  const importAlreadyPresent = importRegex.exec(existingText);
  if (importAlreadyPresent) {
    const matchIndex = importAlreadyPresent.index;
    const upToImportList = importAlreadyPresent[1];
    const insertionOffset = matchIndex + upToImportList.length;

    return {
      insertionText: `, ${modulesToImport.join(", ")}`,
      insertionOffset
    };
  }

  return {
    insertionText: `import { ${modulesToImport.join(
      ", "
    )} } from "${importPath}"\n`,
    insertionOffset: 0
  };
};

export const getTailwindStyledImportInsertion = (existingText: string) => {
  // we can use babel or `https://classic.yarnpkg.com/en/package/es-module-lexer` to parse the imports,
  // but for now we'll just use a regex
  const importRegex =
    /import.*\btw\b.*\bfrom\b.*["']tailwind-styled-components["'][;]?/;
  const importAlreadyPresent = importRegex.test(existingText);
  if (!importAlreadyPresent) {
    return {
      insertionText: `import tw from "tailwind-styled-components"\n`,
      insertionOffset: 0
    };
  }

  return null;
};
