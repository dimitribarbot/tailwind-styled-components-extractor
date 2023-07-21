import {
  collectUnboundComponents,
  Component,
  getComponentsSortedByClassNameOffsets,
  extractUnboundComponentNames,
  generateDeclarations,
  getUnderlyingComponent,
  UnboundComponent
} from "./extractor";

describe("collectUnboundComponents", () => {
  it("should return collected unbound components", async () => {
    const code = `
  const Def = 1 as any
  
  const TestComponent: React.FC = ({ a, className }) => {
    const b = a?.b
    const c = b ?? a?.d
    return (
      <Fih className={className}>
        <Abc className="flex flex-col">
          <Def>
            <Efg className={c ? "justify-center" : "justify-start"} />
            <Ghi className={\`flex flex-col \${c(a?.e) && "flex"} \${(a && b) || c ? "justify-center" : "justify-start"}\`} b={b} />
            <Efg className="justify-center" />
            <Efg className={{ ...(a || {}) }.b ?? ""} />
            <Ghi />
            <section />
          </Def>
          <ul>
            <li>123</li>
            <li>456</li>
            <li>789</li>
          </ul>
        </Abc>
      </Fih>
    )
  }
    `;

    const expectedUnboundComponents: UnboundComponent[] = [
      {
        name: "Fih",
        propNames: ["className"],
        className: "",
        classNameOffsets: { start: 152, end: 173 }
      },
      {
        name: "Abc",
        propNames: [],
        className: "flex flex-col",
        classNameOffsets: { start: 188, end: 213 }
      },
      {
        name: "Efg",
        propNames: ["c"],
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 248, end: 298 }
      },
      {
        name: "Ghi",
        propNames: ["c", "a"],
        className:
          '${({ c, a }) => c(a?.e) && "flex"} ${({ c, a, b }) => (a && b) || c ? "justify-center" : "justify-start"} flex flex-col',
        classNameOffsets: { start: 319, end: 421 }
      },
      {
        name: "Efg",
        propNames: [],
        className: "justify-center",
        classNameOffsets: { start: 448, end: 474 }
      },
      {
        name: "Efg",
        propNames: ["a"],
        className: '${({ a }) => { ...(a || {}) }.b ?? ""}',
        classNameOffsets: { start: 495, end: 531 }
      },
      {
        name: "Ghi",
        propNames: [],
        className: ""
      }
    ];

    expect(collectUnboundComponents(code)).toEqual(expectedUnboundComponents);
  });

  it("should return collected unbound components in case of syntax error", async () => {
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
});

describe("generateDeclarations", () => {
  it("should return declarations without export for unbound components", async () => {
    const unboundComponents: UnboundComponent[] = [
      {
        name: "Abc",
        propNames: [],
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
        propNames: ["c"],
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 176, end: 226 }
      }
    ];

    const declarations = await generateDeclarations({
      components: unboundComponents,
      exportIdentifier: false
    });
    expect(declarations).toEqual(
      "const Abc = tw.div`flex flex-col`\n\n" +
        'const Xyz = tw.div`${({ c }) => c ? "justify-center" : "justify-start"}`'
    );
  });

  it("should return declarations with export for unbound components", async () => {
    const unboundComponents: UnboundComponent[] = [
      {
        name: "Abc",
        propNames: [],
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
        propNames: ["c"],
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 176, end: 226 }
      }
    ];

    const declarations = await generateDeclarations({
      components: unboundComponents,
      exportIdentifier: true
    });
    expect(declarations).toEqual(
      "export const Abc = tw.div`flex flex-col`\n\n" +
        'export const Xyz = tw.div`${({ c }) => c ? "justify-center" : "justify-start"}`'
    );
  });

  it("should return declarations without export for components", async () => {
    const components: Component[] = [
      {
        name: "Abc",
        propNames: [],
        type: "span",
        className: "flex flex-col",
        classNameOffsets: {
          start: 124,
          end: 149
        },
        openingTagOffsets: {
          start: 120,
          end: 123
        },
        selfClosing: false,
        closingTagOffsets: {
          start: 527,
          end: 530
        }
      },
      {
        name: "Xyz",
        propNames: ["c"],
        type: "Efg",
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: {
          start: 356,
          end: 382
        },
        openingTagOffsets: {
          start: 352,
          end: 355
        },
        selfClosing: true,
        closingTagOffsets: undefined
      }
    ];

    const declarations = await generateDeclarations({
      components,
      exportIdentifier: false
    });
    expect(declarations).toEqual(
      "const Abc = tw.span`flex flex-col`\n\n" +
        'const Xyz = tw(Efg)`${({ c }) => c ? "justify-center" : "justify-start"}`'
    );
  });

  it("should return declarations with export for components", async () => {
    const components: Component[] = [
      {
        name: "Abc",
        propNames: [],
        type: "span",
        className: "flex flex-col",
        classNameOffsets: {
          start: 124,
          end: 149
        },
        openingTagOffsets: {
          start: 120,
          end: 123
        },
        selfClosing: false,
        closingTagOffsets: {
          start: 527,
          end: 530
        }
      },
      {
        name: "Xyz",
        propNames: ["c"],
        type: "Efg",
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: {
          start: 356,
          end: 382
        },
        openingTagOffsets: {
          start: 352,
          end: 355
        },
        selfClosing: true,
        closingTagOffsets: undefined
      }
    ];

    const declarations = await generateDeclarations({
      components,
      exportIdentifier: true
    });
    expect(declarations).toEqual(
      "export const Abc = tw.span`flex flex-col`\n\n" +
        'export const Xyz = tw(Efg)`${({ c }) => c ? "justify-center" : "justify-start"}`'
    );
  });
});

describe("extractUnboundComponentNames", () => {
  it("should return component names", async () => {
    const unboundComponentNames = extractUnboundComponentNames([
      {
        name: "Abc",
        propNames: [],
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
        propNames: ["c"],
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 176, end: 226 }
      }
    ]);
    expect(unboundComponentNames).toEqual(["Abc", "Xyz"]);
  });
});

describe("getComponentsSortedByClassNameOffsets", () => {
  it("should return class name offsets", async () => {
    const componentsSortedByClassNameOffsets =
      getComponentsSortedByClassNameOffsets([
        {
          name: "Abc",
          propNames: [],
          className: "flex flex-col",
          classNameOffsets: { start: 124, end: 149 }
        },
        {
          name: "Xyz",
          propNames: ["c"],
          className: '${({ c }) => c ? "justify-center" : "justify-start"}',
          classNameOffsets: { start: 176, end: 226 }
        }
      ]);
    expect(componentsSortedByClassNameOffsets).toEqual([
      {
        name: "Xyz",
        propNames: ["c"],
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 176, end: 226 }
      },
      {
        name: "Abc",
        propNames: [],
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      }
    ]);
  });
});

describe("getUnderlyingComponent", () => {
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

  it("should return no underlying component if not in JSX", () => {
    expect(getUnderlyingComponent(code, 13)).toEqual(undefined);
  });

  it("should return underlying component without self closing tag", () => {
    const expectedComponent: Component = {
      name: "",
      propNames: [],
      type: "Abc",
      className: "flex flex-col",
      classNameOffsets: {
        start: 124,
        end: 149
      },
      openingTagOffsets: {
        start: 120,
        end: 123
      },
      selfClosing: false,
      closingTagOffsets: {
        start: 527,
        end: 530
      }
    };

    expect(getUnderlyingComponent(code, 140)).toEqual(expectedComponent);
  });

  it("should return underlying component with self closing tag", () => {
    const expectedComponent: Component = {
      name: "",
      propNames: [],
      type: "Efg",
      className: "justify-center",
      classNameOffsets: {
        start: 356,
        end: 382
      },
      openingTagOffsets: {
        start: 352,
        end: 355
      },
      selfClosing: true,
      closingTagOffsets: undefined
    };

    expect(getUnderlyingComponent(code, 380)).toEqual(expectedComponent);
  });
});
