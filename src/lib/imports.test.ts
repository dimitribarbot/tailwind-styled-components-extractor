import {
  getImportInsertion,
  getTailwindStyledImportInsertion
} from "./imports";

test("getImportInsertion no existing import", async () => {
  const code = `
import { foo } from "./bar"
import { baz } from "./qux"`;

  const insertion = getImportInsertion(code, "./styles", ["Abc", "Xyz"]);
  expect(insertion).toEqual({
    insertionText: 'import { Abc, Xyz } from "./styles"\n',
    insertionOffset: 1
  });
});

test("getImportInsertion no existing import with using directive", async () => {
  const code = `
"using client"

import { foo } from "./bar"
import { baz } from "./qux"`;

  const insertion = getImportInsertion(code, "./styles", ["Abc", "Xyz"]);
  expect(insertion).toEqual({
    insertionText: 'import { Abc, Xyz } from "./styles"\n',
    insertionOffset: 17
  });
});

test("getImportInsertion with existing import", async () => {
  const code = `
import { foo } from "./bar"
import { Def } from "./styles"
import { baz } from "./qux"
  `;

  const insertion = getImportInsertion(code, "./styles", ["Abc", "Xyz"]);
  expect(insertion).toEqual({
    insertionText: ", Abc, Xyz",
    insertionOffset: 41
  });
});

test("getImportInsertion with existing import, custom external file and multiple import lines", async () => {
  const code = `
import { foo } from "./bar"
import {
  Bar,
  Def
} from "./Component.styles"
import { baz } from "./qux"
  `;

  const insertion = getImportInsertion(code, "./Component.styles", [
    "Abc",
    "Xyz"
  ]);
  expect(insertion).toEqual({
    insertionText: ", Abc, Xyz",
    insertionOffset: 50
  });
});

test("getTailwindStyledImportInsertion no existing import", async () => {
  const code = `
import { foo } from "./bar"
import { baz } from "./qux"
  `;

  const insertion = getTailwindStyledImportInsertion(code);
  expect(insertion).toEqual({
    insertionText: 'import tw from "tailwind-styled-components"\n',
    insertionOffset: 0
  });
});

test("getTailwindStyledImportInsertion no existing import, but with other named imports ", async () => {
  const code = `
import { foo } from "./bar"
import { css }  from 'styled-components'
import { baz } from "./qux"
  `;

  const insertion = getTailwindStyledImportInsertion(code);
  expect(insertion).toEqual({
    insertionText: 'import tw from "tailwind-styled-components"\n',
    insertionOffset: 0
  });
});

test("getTailwindStyledImportInsertion with existing import", async () => {
  const code = `
import { foo } from "./bar"
import  tw from 'tailwind-styled-components'
import { baz } from "./qux"
  `;

  const insertion = getTailwindStyledImportInsertion(code);
  expect(insertion).toEqual(null);
});
