// in this transformer we have to split up classes and function declarations
// from their exports. why? because sometimes we need to replace classes with
// nodes that aren't allowed in the same contexts. also, if you're exporting
// a generator function as a default then regenerator will destroy the export
// declaration and leave a variable declaration in it's place... yeah, handy.

import clone from "lodash/lang/clone";
import * as t from "../../../types";

export var metadata = {
  group: "builtin-setup"
};

export function ImportDeclaration(node, parent, scope, file) {
  if (node.source) {
    node.source.value = file.resolveModuleSource(node.source.value);
  }
}

export { ImportDeclaration as ExportAllDeclaration };

export function ExportDefaultDeclaration(node, parent, scope) {
  ImportDeclaration.apply(this, arguments);

  var declar = node.declaration;

  var getDeclar = function () {
    declar._ignoreUserWhitespace = true;
    return declar;
  };

  if (t.isClassDeclaration(declar)) {
    // export default class Foo {};
    node.declaration = declar.id;
    return [getDeclar(), node];
  } else if (t.isClassExpression(declar)) {
    // export default class {};
    var temp = scope.generateUidIdentifier("default");
    declar = t.variableDeclaration("var", [
      t.variableDeclarator(temp, declar)
    ]);
    node.declaration = temp;
    return [getDeclar(), node];
  } else if (t.isFunctionDeclaration(declar)) {
    // export default function Foo() {}
    node._blockHoist = 2;
    node.declaration = declar.id;
    return [getDeclar(), node];
  }
}

function buildExportSpecifier(id) {
  return t.exportSpecifier(clone(id), clone(id));
}

export function ExportNamedDeclaration(node, parent, scope) {
  ImportDeclaration.apply(this, arguments);

  var declar = node.declaration;

  var getDeclar = function () {
    declar._ignoreUserWhitespace = true;
    return declar;
  };

  if (t.isClassDeclaration(declar)) {
    // export class Foo {}
    node.specifiers  = [buildExportSpecifier(declar.id)];
    node.declaration = null;
    return [getDeclar(), node];
  } else if (t.isFunctionDeclaration(declar)) {
    // export function Foo() {}
    node.specifiers  = [buildExportSpecifier(declar.id)];
    node.declaration = null;
    node._blockHoist = 2;
    return [getDeclar(), node];
  } else if (t.isVariableDeclaration(declar)) {
    // export var foo = "bar";
    var specifiers = [];
    var bindings = this.get("declaration").getBindingIdentifiers();
    for (var key in bindings) {
      specifiers.push(buildExportSpecifier(bindings[key]));
    }
    return [declar, t.exportNamedDeclaration(null, specifiers)];
  }
}

export function Program(node) {
  var imports = [];
  var rest = [];

  for (var i = 0; i < node.body.length; i++) {
    var bodyNode = node.body[i];
    if (t.isImportDeclaration(bodyNode)) {
      imports.push(bodyNode);
    } else {
      rest.push(bodyNode);
    }
  }

  node.body = imports.concat(rest);
}
