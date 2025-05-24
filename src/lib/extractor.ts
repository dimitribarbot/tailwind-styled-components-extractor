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
  isObjectExpression,
  isOptionalMemberExpression,
  isSpreadElement,
  isStringLiteral,
  isTemplateLiteral,
  JSXAttribute,
  JSXElement,
  JSXIdentifier,
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
  "animate",
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
  "circle",
  "cite",
  "clipPath",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "defs",
  "del",
  "desc",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "ellipse",
  "em",
  "embed",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "fieldset",
  "figcaption",
  "figure",
  "filter",
  "footer",
  "foreignObject",
  "form",
  "g",
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
  "image",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "legend",
  "li",
  "line",
  "linearGradient",
  "link",
  "main",
  "map",
  "mark",
  "marker",
  "mask",
  "menu",
  "menuitem",
  "meta",
  "metadata",
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
  "path",
  "pattern",
  "picture",
  "polygon",
  "polyline",
  "pre",
  "progress",
  "q",
  "radialGradient",
  "rect",
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
  "stop",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "svg",
  "switch",
  "symbol",
  "table",
  "template",
  "tbody",
  "td",
  "text",
  "textarea",
  "textPath",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "tspan",
  "u",
  "ul",
  "use",
  "var",
  "video",
  "view",
  "wbr",
  "webview"
];

export interface Offsets {
  start: number;
  end: number;
}

export interface UnboundComponent {
  name: string;
  propNames: string[];
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
  identifiers: Set<string>
) => {
  if (isIdentifier(expression)) {
    identifiers.add(expression.name);
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
      } else if (isSpreadElement(argument)) {
        fillExpressionIdentifiers(argument.argument, identifiers);
      }
    }
  } else if (isObjectExpression(expression)) {
    for (const property of expression.properties) {
      if (isSpreadElement(property)) {
        fillExpressionIdentifiers(property.argument, identifiers);
      }
    }
  } else if (isConditionalExpression(expression)) {
    fillExpressionIdentifiers(expression.test, identifiers);
  } else if (isLogicalExpression(expression)) {
    fillExpressionIdentifiers(expression.left, identifiers);
    fillExpressionIdentifiers(expression.right, identifiers);
  } else if (isTemplateLiteral(expression)) {
    expression.expressions
      .filter(expr => isExpression(expr))
      .forEach(expr =>
        fillExpressionIdentifiers(expr as Expression, identifiers)
      );
  } else if (!isStringLiteral(expression)) {
    console.log("Unknown expression:", expression);
  }
};

const buildExpressionText = (
  code: string,
  expression: Expression,
  identifiers: Set<string>
) => {
  if (isDefined(expression.start) && isDefined(expression.end)) {
    fillExpressionIdentifiers(expression, identifiers);
    return `\${({ ${Array.from(identifiers).join(", ")} }) => ${code.slice(
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

const filterExistingAttributesFromClassNameIdentifiers = (
  jsxOpeningNode: JSXOpeningElement,
  classNameIdentifiers: Set<string>
) => {
  const attributeNames = jsxOpeningNode.attributes
    .filter(
      attribute => isJSXAttribute(attribute) && isJSXIdentifier(attribute.name)
    )
    .map(attribute => ((attribute as JSXAttribute).name as JSXIdentifier).name)
    .filter(name => name !== "className");
  return Array.from(classNameIdentifiers).filter(
    classNameIdentifier => !attributeNames.includes(classNameIdentifier)
  );
};

const extractClassName = (
  code: string,
  classNameAttribute: JSXAttribute | null | undefined,
  identifiers: Set<string>
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

    if (isIdentifier(expression)) {
      identifiers.add(expression.name);
      return "";
    }

    if (isTemplateLiteral(expression)) {
      const expressionText = expression.expressions
        .filter(expr => isExpression(expr))
        .map(expr => buildExpressionText(code, expr as Expression, identifiers))
        .join(" ");
      const quasisText = expression.quasis
        .map(quasi => quasi.value.raw?.trim() || "")
        .filter(Boolean)
        .join(" ");
      return `${expressionText} ${quasisText}`;
    }

    return buildExpressionText(code, expression, identifiers);
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

const sortComponentByOffsets = (
  componentA: Component | UnboundComponent,
  componentB: Component | UnboundComponent
) => {
  if (!componentA.classNameOffsets) {
    if (componentB.classNameOffsets) {
      return -1;
    }
    return 0;
  }
  if (!componentB.classNameOffsets) {
    if (componentA.classNameOffsets) {
      return 1;
    }
    return 0;
  }
  if (componentA.classNameOffsets.start < componentB.classNameOffsets.start) {
    return 1;
  }
  if (componentA.classNameOffsets.start > componentB.classNameOffsets.start) {
    return -1;
  }
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
        isJSXIdentifier(node.name) &&
        path.parentPath
      ) {
        deepestNode = path.parentPath.node;
      }
    }
  });

  return deepestNode;
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
          const classNameIdentifiers = new Set<string>();
          const className = extractClassName(
            code,
            classNameAttribute,
            classNameIdentifiers
          );
          const propNames = filterExistingAttributesFromClassNameIdentifiers(
            jsxOpeningNode,
            classNameIdentifiers
          );
          const classNameOffsets = getNodeOffsets(classNameAttribute);
          unboundJSXIdentifiers.add({
            name: node.name,
            propNames,
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

export const getComponentsSortedByClassNameOffsets = (
  components: Component[] | UnboundComponent[]
) => [...components].sort(sortComponentByOffsets);

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
  const classNameIdentifiers = new Set<string>();
  const className = extractClassName(
    code,
    classNameAttribute,
    classNameIdentifiers
  );
  const propNames = filterExistingAttributesFromClassNameIdentifiers(
    node.openingElement,
    classNameIdentifiers
  );
  const classNameOffsets = getNodeOffsets(classNameAttribute);
  const closingTagOffsets = getNodeOffsets(node.closingElement?.name);

  return {
    name: "",
    propNames,
    type: node.openingElement.name.name,
    selfClosing: !!node.openingElement.selfClosing,
    openingTagOffsets,
    closingTagOffsets,
    className,
    classNameOffsets
  };
};
