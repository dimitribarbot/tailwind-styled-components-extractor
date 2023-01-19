import {
  collectUnboundComponents,
  extractUnboundComponentClassNameOffsets,
  extractUnboundComponentNames,
  generateDeclarations
} from "./extractor";

test("collectUnboundComponents", async () => {
  const code = `
const Def = 1 as any

const TestComponent: React.FC = ({ a }) => {
  const b = a?.b
  const c = b ?? c
  return (
    <Abc className="flex flex-col">
      <Def>
        <Efg className={c ? "justify-center" : "justify-start"} />
        <Ghi className={\`flex flex-col \${c && "flex"} \${(a && b) || c ? "justify-center" : "justify-start"}\`} />
        <Efg className="justify-center" />
        <Ghi />
        <section />
      </Def>
      <ul>
        <li>123</li>
        <li>456</li>
        <li>789</li>
      </ul>
    </Abc>
  )
}
  `;

  expect(collectUnboundComponents(code)).toEqual([
    {
      name: "Abc",
      className: "flex flex-col",
      classNameOffsets: { start: 124, end: 149 }
    },
    {
      name: "Efg",
      className: '${({ c }) => c ? "justify-center" : "justify-start"}',
      classNameOffsets: { start: 176, end: 226 }
    },
    {
      name: "Ghi",
      className:
        '${({ c }) => c && "flex"} ${({ a, b, c }) => (a && b) || c ? "justify-center" : "justify-start"} flex flex-col',
      classNameOffsets: { start: 243, end: 339 }
    },
    {
      name: "Efg",
      className: "justify-center",
      classNameOffsets: { start: 356, end: 382 }
    },
    {
      name: "Ghi",
      className: ""
    }
  ]);
});

test("collectUnboundComponents syntax error", async () => {
  const code = `
const Def = 1 as any

const TestComponent: React.SFC = () => {
  const c = a?.b ?? c
  return (
    <Abc someAttrs>
      <Def>
        <Ghi />
        <section />
      </Def>
      <ul>
        <li>123</li>
        <li>456</li>
        <li>789</li>
      </ul>
    </Xyz>
  )
}
  `;

  try {
    collectUnboundComponents(code);
    fail("Should have thrown an error");
  } catch (e) {
    expect(
      e instanceof Error && Object.getPrototypeOf(e).name === "SyntaxError"
    ).toBe(true);
  }
});

test("generateDeclarations no export", async () => {
  const declarations = await generateDeclarations({
    unboundComponents: [
      {
        name: "Abc",
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 176, end: 226 }
      }
    ],
    exportIdentifier: false
  });
  expect(declarations).toEqual(
    "const Abc = tw.div`flex flex-col`\n" +
      'const Xyz = tw.div`${({ c }) => c ? "justify-center" : "justify-start"}`'
  );
});

test("generateDeclarations yes export", async () => {
  const declarations = await generateDeclarations({
    unboundComponents: [
      {
        name: "Abc",
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 176, end: 226 }
      }
    ],
    exportIdentifier: true
  });
  expect(declarations).toEqual(
    "export const Abc = tw.div`flex flex-col`\n" +
      'export const Xyz = tw.div`${({ c }) => c ? "justify-center" : "justify-start"}`'
  );
});

test("extractUnboundComponentNames", async () => {
  const unboundComponentNames = extractUnboundComponentNames([
    {
      name: "Abc",
      className: "flex flex-col",
      classNameOffsets: { start: 124, end: 149 }
    },
    {
      name: "Xyz",
      className: '${({ c }) => c ? "justify-center" : "justify-start"}',
      classNameOffsets: { start: 176, end: 226 }
    }
  ]);
  expect(unboundComponentNames).toEqual(["Abc", "Xyz"]);
});

test("extractUnboundComponentClassNameOffsets", async () => {
  const unboundComponentClassNameOffsets =
    extractUnboundComponentClassNameOffsets([
      {
        name: "Abc",
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 176, end: 226 }
      }
    ]);
  expect(unboundComponentClassNameOffsets).toEqual([
    { start: 176, end: 226 },
    { start: 124, end: 149 }
  ]);
});
