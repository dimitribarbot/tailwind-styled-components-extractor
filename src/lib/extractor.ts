import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import type {
  ConditionalExpression,
  JSXAttribute,
  JSXOpeningElement,
  LogicalExpression
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

export interface ClassNameOffsets {
  start: number;
  end: number;
}

interface UnboundComponent {
  name: string;
  className?: string;
  classNameOffsets?: ClassNameOffsets;
}

const isDefined = (number: number | null | undefined): number is number =>
  typeof number !== "undefined" && number !== null;

const fillLogicalExpressionIdentifiers = (
  expression: LogicalExpression,
  identifiers: string[]
) => {
  if (expression.left.type === "Identifier") {
    identifiers.push(expression.left.name);
  } else if (expression.left.type === "LogicalExpression") {
    fillLogicalExpressionIdentifiers(expression.left, identifiers);
  }

  if (expression.right.type === "Identifier") {
    identifiers.push(expression.right.name);
  } else if (expression.right.type === "LogicalExpression") {
    fillLogicalExpressionIdentifiers(expression.right, identifiers);
  }
};

const fillConditionalExpressionIdentifiers = (
  expression: ConditionalExpression,
  identifiers: string[]
) => {
  if (expression.test.type === "Identifier") {
    identifiers.push(expression.test.name);
  } else if (expression.test.type === "LogicalExpression") {
    fillLogicalExpressionIdentifiers(expression.test, identifiers);
  }
  return identifiers;
};

const fillExpressionIdentifiers = (
  expression: ConditionalExpression | LogicalExpression,
  identifiers: string[]
) => {
  if (expression.type === "ConditionalExpression") {
    fillConditionalExpressionIdentifiers(expression, identifiers);
  } else if (expression.type === "LogicalExpression") {
    fillLogicalExpressionIdentifiers(expression, identifiers);
  }
};

const buildExpressionText = (
  code: string,
  expression: ConditionalExpression | LogicalExpression
) => {
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

const extractClassNameAttribute = (jsxOpeningNode: JSXOpeningElement) => {
  const attributes = jsxOpeningNode.attributes;
  return attributes.find(
    attribute =>
      attribute.type === "JSXAttribute" && attribute.name?.name === "className"
  ) as JSXAttribute | undefined;
};

const extractClassName = (code: string, classNameAttribute: JSXAttribute) => {
  if (!classNameAttribute.value) return "";
  if (classNameAttribute.value.type === "StringLiteral") {
    return classNameAttribute.value.value;
  }
  if (classNameAttribute.value.type === "JSXExpressionContainer") {
    const expression = classNameAttribute.value.expression;
    if (
      expression.type === "ConditionalExpression" ||
      expression.type === "LogicalExpression"
    ) {
      return buildExpressionText(code, expression);
    }
    if (expression.type === "TemplateLiteral") {
      const conditionalOrLogicalExpressions = expression.expressions.filter(
        expr =>
          expr.type === "ConditionalExpression" ||
          expr.type === "LogicalExpression"
      ) as ConditionalExpression[];
      const expressionText = conditionalOrLogicalExpressions
        .map(expr => buildExpressionText(code, expr))
        .join(" ");
      const quasisText = expression.quasis
        .map(quasi => quasi.value.raw?.trim() || "")
        .filter(Boolean)
        .join(" ");
      return `${expressionText} ${quasisText}`;
    }
  }
  return "";
};

const sortClassNameOffsets = (
  offsetsA: ClassNameOffsets,
  offsetsB: ClassNameOffsets
) => {
  if (offsetsA.start < offsetsB.start) return 1;
  if (offsetsA.start > offsetsB.start) return -1;
  return 0;
};

export const collectUnboundComponents = (code: string) => {
  const ast = parser.parse(code, parseOptions);

  const unboundJSXIdentifiers = new Set<UnboundComponent>();

  traverse(ast, {
    enter(path) {
      const node = path.node;

      switch (node.type) {
        case "JSXIdentifier": {
          if (path.parentPath?.node.type !== "JSXOpeningElement") {
            return;
          }
          const isComponent = /[A-Z]/.test(node.name);
          if (!isComponent) {
            return;
          }
          if (!path.scope.hasBinding(node.name)) {
            const jsxOpeningNode = path.parentPath.node;
            const classNameAttribute =
              extractClassNameAttribute(jsxOpeningNode);
            if (
              classNameAttribute &&
              isDefined(classNameAttribute.start) &&
              isDefined(classNameAttribute.end)
            ) {
              const className = extractClassName(code, classNameAttribute);
              unboundJSXIdentifiers.add({
                name: node.name,
                className,
                classNameOffsets: {
                  start: classNameAttribute.start,
                  end: classNameAttribute.end
                }
              });
            } else {
              unboundJSXIdentifiers.add({
                name: node.name,
                className: ""
              });
            }
          }

          break;
        }
        default:
          break;
      }
    }
  });

  return [...unboundJSXIdentifiers];
};

export const extractUnboundComponentNames = (
  unboundComponents: UnboundComponent[]
) => unboundComponents?.map(component => component.name);

export const extractUnboundComponentClassNameOffsets = (
  unboundComponents: UnboundComponent[]
) =>
  unboundComponents
    ?.filter(component => !!component.classNameOffsets)
    .map(component => component.classNameOffsets as ClassNameOffsets)
    .sort(sortClassNameOffsets) || [];

export const generateDeclarations = ({
  unboundComponents,
  exportIdentifier
}: {
  unboundComponents: UnboundComponent[];
  exportIdentifier: boolean;
}): string => {
  return unboundComponents
    .map(component => {
      return `${exportIdentifier ? "export " : ""}const ${
        component.name
      } = tw.div\`${component.className}\``;
    })
    .join("\n");
};
