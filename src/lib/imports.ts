export const getImportInsertion = (
  existingText: string,
  importPath: string,
  modulesToImport: string[]
) => {
  const importToInsertRegex = new RegExp(
    `(import {[^}]*?)[\\s\\n]+} from "${importPath}"[;]?`,
    "gm"
  );
  const importToInsertAlreadyPresent = importToInsertRegex.exec(existingText);
  if (importToInsertAlreadyPresent) {
    const matchIndex = importToInsertAlreadyPresent.index;
    const upToImportToInsertList = importToInsertAlreadyPresent[1];
    const insertionOffset = matchIndex + upToImportToInsertList.length;

    return {
      insertionText: `, ${modulesToImport.join(", ")}`,
      insertionOffset
    };
  }

  const importRegex = new RegExp(`import .+ from ".+"[;]?`);
  const importAlreadyPresent = importRegex.exec(existingText);
  const insertionOffset = importAlreadyPresent?.index ?? 0;

  return {
    insertionText: `import { ${modulesToImport.join(
      ", "
    )} } from "${importPath}"\n`,
    insertionOffset
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
