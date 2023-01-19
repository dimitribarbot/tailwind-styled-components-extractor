import { collectUnboundComponents, generateDeclarations } from "./extractor";

test("collectUnboundComponents", async () => {
  const code = `

type Props = {
  a: {
    b?: string
  }
}

const Def = 1 as any

const TestComponent: React.FC = ({ a }) => {
  const b = a?.b
  const c = b ?? c
  return (
    <Abc className="flex flex-col">
      <Def>
        <Efg className={c ? "justify-center" : "justify-start"} />
        <Ghi className={\`flex flex-col \${c && "flex"} \${(a && b) || c ? "justify-center" : "justify-start"}\`} />
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
    { name: "Abc", className: "flex flex-col" },
    {
      name: "Efg",
      className: '${({ c }) => c ? "justify-center" : "justify-start"}'
    },
    {
      name: "Ghi",
      className:
        '${({ c }) => c && "flex"} ${({ a, b, c }) => (a && b) || c ? "justify-center" : "justify-start"} flex flex-col'
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
      { name: "Abc", className: "flex flex-col" },
      { name: "Xyz", className: "" }
    ],
    exportIdentifier: false
  });
  expect(declarations).toEqual(
    "const Abc = tw.div`flex flex-col`\n" + "const Xyz = tw.div``"
  );
});

test("generateDeclarations yes export", async () => {
  const declarations = await generateDeclarations({
    unboundComponents: [
      { name: "Abc", className: "" },
      { name: "Xyz", className: "" }
    ],
    exportIdentifier: true
  });
  expect(declarations).toEqual(
    "export const Abc = tw.div``\n" + "export const Xyz = tw.div``"
  );
});
