import {
  collectUnboundComponents,
  Component,
  extractUnboundComponentClassNameOffsets,
  extractUnboundComponentNames,
  generateDeclarations,
  getUnderlyingComponent,
  hasUnboundComponents,
  isInJSX,
  UnboundComponent
} from "./extractor";

describe("hasUnboundComponents", () => {
  it("should return true if unbound components are found", async () => {
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

    expect(hasUnboundComponents(code)).toBe(true);
  });

  it("should return false if no collected unbound components are found", async () => {
    const code = `
  const Def = 1 as any
  
  const TestComponent: React.SFC = () => {
    const c = a?.b ?? c
    return (
      <Def>
        <section />
      </Def>
    )
  }
    `;

    expect(hasUnboundComponents(code)).toBe(false);
  });
});

describe("collectUnboundComponents", () => {
  it("should return collected unbound components", async () => {
    const code = `
  const Def = 1 as any
  
  const TestComponent: React.FC = ({ a }) => {
    const b = a?.b
    const c = b ?? a?.d
    return (
      <Abc className="flex flex-col">
        <Def>
          <Efg className={c ? "justify-center" : "justify-start"} />
          <Ghi className={\`flex flex-col \${c(a?.e) && "flex"} \${(a && b) || c ? "justify-center" : "justify-start"}\`} />
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
        classNameOffsets: { start: 141, end: 166 }
      },
      {
        name: "Efg",
        className: '${({ c }) => c ? "justify-center" : "justify-start"}',
        classNameOffsets: { start: 197, end: 247 }
      },
      {
        name: "Ghi",
        className:
          '${({ c, a }) => c(a?.e) && "flex"} ${({ a, b, c }) => (a && b) || c ? "justify-center" : "justify-start"} flex flex-col',
        classNameOffsets: { start: 266, end: 368 }
      },
      {
        name: "Efg",
        className: "justify-center",
        classNameOffsets: { start: 387, end: 413 }
      },
      {
        name: "Ghi",
        className: ""
      }
    ]);
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
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
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
        className: "flex flex-col",
        classNameOffsets: { start: 124, end: 149 }
      },
      {
        name: "Xyz",
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
});

describe("extractUnboundComponentClassNameOffsets", () => {
  it("should return class name offsets", async () => {
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

  it("should return underlying component without self closing tag", () => {
    expect(getUnderlyingComponent(code, 140)).toEqual({
      name: "",
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
    });
  });

  it("should return underlying component with self closing tag", () => {
    expect(getUnderlyingComponent(code, 380)).toEqual({
      name: "",
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
    });
  });
});

describe("isInJSX", () => {
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

  it("should return true", () => {
    expect(isInJSX(code, 119)).toBe(true);
    expect(isInJSX(code, 120)).toBe(true);
    expect(isInJSX(code, 129)).toBe(true);
    expect(isInJSX(code, 140)).toBe(true);
    expect(isInJSX(code, 149)).toBe(true);
    expect(isInJSX(code, 150)).toBe(true);
    expect(isInJSX(code, 190)).toBe(true);
    expect(isInJSX(code, 400)).toBe(true);
    expect(isInJSX(code, 420)).toBe(true);
    expect(isInJSX(code, 421)).toBe(true);
    expect(isInJSX(code, 430)).toBe(true);
  });

  it("should return false", () => {
    expect(isInJSX(code, 13)).toBe(false);
    expect(isInJSX(code, 100)).toBe(false);
    expect(isInJSX(code, 151)).toBe(false);
  });
});
