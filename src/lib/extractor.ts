import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import {
  Expression,
  isCallExpression,
  isConditionalExpression,
  isExpression,
  isIdentifier,
  isJSXAttribute,
  isJSXClosingElement,
  isJSXEmptyExpression,
  isJSXIdentifier,
  isJSXOpeningElement,
  isLogicalExpression,
  isMemberExpression,
  isOptionalMemberExpression,
  isStringLiteral,
  isTemplateLiteral,
  JSXAttribute,
  JSXElement,
  JSXOpeningElement,
  Node
} from "@babel/types";

const parseOptions: parser.ParserOptions = {
  sourceType: "module",
  plugins: [
    "jsx",
    "typescript",
    "objectRestSpread",
    "asyncGenerators",
    "classProperties",
    "dynamicImport",
    "decorators-legacy",
    "optionalCatchBinding",
    "optionalChaining",
    "nullishCoalescingOperator"
  ]
};

const knownJSXTags = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "menuitem",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "slot",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "template",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
  "webview"
];

export interface Offsets {
  start: number;
  end: number;
}

export interface UnboundComponent {
  name: string;
  className?: string;
  classNameOffsets?: Offsets;
}

export interface Component extends UnboundComponent {
  type: string;
  selfClosing: boolean;
  openingTagOffsets: Offsets;
  closingTagOffsets?: Offsets;
}

const isComponent = (
  component: UnboundComponent | Component
): component is Component =>
  typeof (component as Component).type !== "undefined";

const isDefined = (number: number | null | undefined): number is number =>
  typeof number !== "undefined" && number !== null;

const fillExpressionIdentifiers = (
  expression: Expression,
  identifiers: string[]
) => {
  if (isIdentifier(expression) && !identifiers.includes(expression.name)) {
    identifiers.push(expression.name);
  } else if (
    isOptionalMemberExpression(expression) ||
    isMemberExpression(expression)
  ) {
    fillExpressionIdentifiers(expression.object, identifiers);
    if (expression.computed && isExpression(expression.property)) {
      fillExpressionIdentifiers(expression.property, identifiers);
    }
  } else if (isCallExpression(expression) && isExpression(expression.callee)) {
    fillExpressionIdentifiers(expression.callee, identifiers);
    for (const argument of expression.arguments) {
      if (isExpression(argument)) {
        fillExpressionIdentifiers(argument, identifiers);
      }
    }
  } else if (isConditionalExpression(expression)) {
    fillExpressionIdentifiers(expression.test, identifiers);
  } else if (isLogicalExpression(expression)) {
    fillExpressionIdentifiers(expression.left, identifiers);
    fillExpressionIdentifiers(expression.right, identifiers);
  } else if (!isStringLiteral(expression)) {
    console.log("Unknown expression:", expression);
  }
};

const buildExpressionText = (code: string, expression: Expression) => {
  if (isDefined(expression.start) && isDefined(expression.end)) {
    const identifiers: string[] = [];
    fillExpressionIdentifiers(expression, identifiers);
    return `\${({ ${identifiers.join(", ")} }) => ${code.slice(
      expression.start,
      expression.end
    )}}`;
  }
  return "";
};

const extractClassNameAttribute = (jsxOpeningNode: JSXOpeningElement) =>
  jsxOpeningNode.attributes.find(
    attribute =>
      isJSXAttribute(attribute) && attribute.name.name === "className"
  ) as JSXAttribute | undefined;

const extractClassName = (
  code: string,
  classNameAttribute: JSXAttribute | null | undefined
) => {
  if (!classNameAttribute?.value) return "";
  if (classNameAttribute.value.type === "StringLiteral") {
    return classNameAttribute.value.value?.trim() || "";
  }
  if (classNameAttribute.value.type === "JSXExpressionContainer") {
    const expression = classNameAttribute.value.expression;
    if (isJSXEmptyExpression(expression)) {
      return "";
    }

    if (isTemplateLiteral(expression)) {
      const expressionText = expression.expressions
        .filter(expr => isExpression(expr))
        .map(expr => buildExpressionText(code, expr as Expression))
        .join(" ");
      const quasisText = expression.quasis
        .map(quasi => quasi.value.raw?.trim() || "")
        .filter(Boolean)
        .join(" ");
      return `${expressionText} ${quasisText}`;
    }

    return buildExpressionText(code, expression);
  }
  return "";
};

const getNodeOffsets = (node: Node | null | undefined) => {
  if (node && isDefined(node.start) && isDefined(node.end)) {
    return {
      start: node.start,
      end: node.end
    };
  }
  return undefined;
};

const sortOffsets = (offsetsA: Offsets, offsetsB: Offsets) => {
  if (offsetsA.start < offsetsB.start) return 1;
  if (offsetsA.start > offsetsB.start) return -1;
  return 0;
};

const isKnownJSXTag = (tagName: string) => knownJSXTags.includes(tagName);

const getUnderlyingJSXNode = (
  code: string,
  index: number
): JSXElement | null => {
  const ast = parser.parse(code, parseOptions);

  let deepestNode: Node | null = null;

  traverse(ast, {
    enter(path) {
      const node = path.node;

      if (
        isDefined(node.start) &&
        node.start <= index &&
        isDefined(node.end) &&
        node.end >= index &&
        (isJSXOpeningElement(node) || isJSXClosingElement(node)) &&
        isJSXIdentifier(node.name)
      ) {
        deepestNode = path.parentPath.node;
      }
    }
  });

  return deepestNode;
};

export const hasUnboundComponents = (code: string) => {
  const ast = parser.parse(code, parseOptions);

  let hasUnboundComponents = false;

  traverse(ast, {
    enter(path) {
      const node = path.node;

      if (isJSXIdentifier(node) && isJSXOpeningElement(path.parentPath?.node)) {
        if (isKnownJSXTag(node.name)) {
          return;
        }
        if (!path.scope.hasBinding(node.name)) {
          hasUnboundComponents = true;
          path.stop();
        }
      }
    }
  });

  return hasUnboundComponents;
};

export const collectUnboundComponents = (code: string) => {
  const ast = parser.parse(code, parseOptions);

  const unboundJSXIdentifiers = new Set<UnboundComponent>();

  traverse(ast, {
    enter(path) {
      const node = path.node;

      if (isJSXIdentifier(node) && isJSXOpeningElement(path.parentPath?.node)) {
        if (isKnownJSXTag(node.name)) {
          return;
        }

        if (!path.scope.hasBinding(node.name)) {
          const jsxOpeningNode = path.parentPath.node;
          const classNameAttribute = extractClassNameAttribute(jsxOpeningNode);
          const className = extractClassName(code, classNameAttribute);
          const classNameOffsets = getNodeOffsets(classNameAttribute);
          unboundJSXIdentifiers.add({
            name: node.name,
            className,
            classNameOffsets
          });
        }
      }
    }
  });

  return [...unboundJSXIdentifiers];
};

export const extractUnboundComponentNames = (
  unboundComponents: UnboundComponent[]
) => unboundComponents?.map(component => component.name);

export const extractUnboundComponentClassNameOffsets = (
  unboundComponents: Component[] | UnboundComponent[]
) =>
  unboundComponents
    ?.filter(component => !!component.classNameOffsets)
    .map(component => component.classNameOffsets as Offsets)
    .sort(sortOffsets) || [];

export const generateDeclarations = ({
  components,
  exportIdentifier
}: {
  components: Component[] | UnboundComponent[];
  exportIdentifier: boolean;
}): string =>
  components
    .map(component => {
      const isBasicComponent =
        !isComponent(component) || isKnownJSXTag(component.type);
      return `${exportIdentifier ? "export " : ""}const ${component.name} = tw${
        isBasicComponent
          ? `.${isComponent(component) ? component.type : "div"}`
          : `(${component.type})`
      }\`${component.className}\``;
    })
    .join("\n\n");

export const getUnderlyingComponent = (
  code: string,
  index: number
): Component | undefined => {
  const node = getUnderlyingJSXNode(code, index);
  if (!node || !isJSXIdentifier(node.openingElement?.name)) {
    return;
  }

  const openingTagOffsets = getNodeOffsets(node.openingElement.name);
  if (!openingTagOffsets) {
    return;
  }

  const classNameAttribute = extractClassNameAttribute(node.openingElement);
  const className = extractClassName(code, classNameAttribute);
  const classNameOffsets = getNodeOffsets(classNameAttribute);
  const closingTagOffsets = getNodeOffsets(node.closingElement?.name);

  return {
    name: "",
    type: node.openingElement.name.name,
    selfClosing: !!node.openingElement.selfClosing,
    openingTagOffsets,
    closingTagOffsets,
    className,
    classNameOffsets
  };
};

export const isInJSX = (code: string, index: number): boolean =>
  !!getUnderlyingJSXNode(code, index);
