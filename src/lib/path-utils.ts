import * as path from "path/posix";

export const relativeImportPathFromFile = (from: string, to: string) => {
  // TODO is this OK on Windows?
  let relative = path.relative(path.dirname(from), to);

  if (relative === path.basename(to)) {
    relative = `./${relative}`;
  }

  return stripExtension(relative);
};

export const stripExtension = (inputPath: string) => {
  const parsed = path.parse(inputPath);
  return `${parsed.dir}/${parsed.name}`; // removes extension
};

export const getExtension = (inputPath: string) => {
  const parsed = path.parse(inputPath);
  return parsed.ext;
};
