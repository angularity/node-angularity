'use strict';

var esprimaTools = require('./browserify-esprima-tools');

/**
 * Esprima based explicity @ngInject annotation with sourcemaps.
 * @param {object} opt An options hash
 */
function browserifyNgInject(opt) {
  return esprimaTools.createTransform(updater, opt);
}

module.exports = browserifyNgInject;

/**
 * The updater function for the esprima transform
 * @param {string} file The filename for the Browserify transform
 * @param {object} ast The esprima syntax tree
 * @returns {object} The transformed esprima syntax tree
 */
function updater(file, ast) {
  if (ast.comments) {
    ast.comments
      .filter(testNgInject)
      .map(getAnnotatedNode)
      .forEach(processNode);
  } else {
    throw new Error('Esprima AST is required to have top-level comments array');
  }
  return ast;
}

/**
 * Test the comment content for the <code>@ngInject</code> doctag.
 * @param {object} comment The comment node
 */
function testNgInject(comment) {
  return /@ngInject/i.test(comment.value);
}

/**
 * Get the node that is annotated by the comment or throw if not present.
 * @throws {Error} Where comment does not annotate a node
 * @param {object} comment The comment node
 */
function getAnnotatedNode(comment) {

  // find the first function declaration or expression following the annotation
  var result;
  if (comment.annotates) {
    var children = esprimaTools.orderNodes(comment.annotates);
    result = [comment.annotates]
      .concat(children)
      .filter(testFunctionType)
      .shift();
  }

  // throw where not valid
  if (result) {
    return result;
  } else {
    throw new Error('Doctag @ngInject does not annotate anything');
  }
}

/**
 * Test whether the given esprima node is a function declaration or expression node.
 * @param {{type:string}} node An esprima AST node to test
 * @returns {boolean} True on match, else False
 */
function testFunctionType(node) {
  return /^Function(Declaration|Expression)$/.test(node.type);
}

/**
 * Add explicit dependency statements to the node.
 * @param {object} node An esprima AST function-type node
 */
function processNode(node) {

  // check if the function is part of a variable assignment
  var isVarAssignment = (node.parent.type === 'VariableDeclarator');

  // the parameters of the function, converted to literal strings
  var params = node.params.map(paramToLiteral);

  // [ 'arg', ..., function(arg) {} ]
  if ((node.type === 'FunctionExpression') && !isVarAssignment) {
    esprimaTools.nodeSplicer(node)({
      parent  : node.parent,
      type    : 'ArrayExpression',
      elements: params.concat(node)
    });
  }

  // fn.$inject = [ 'arg', ... ]
  else {
    var appendTo = isVarAssignment ? node.parent.parent : node;
    esprimaTools.nodeSplicer(appendTo, +1)({
      type      : 'ExpressionStatement',
      expression: {
        type    : 'AssignmentExpression',
        operator: '=',
        left    : {
          type    : 'MemberExpression',
          computed: false,
          object  : {
            type: 'Identifier',
            name: node.id.name
          },
          property: {
            type: 'Identifier',
            name: '$inject'
          }
        },
        right   : {
          type    : 'ArrayExpression',
          elements: params
        }
      }
    });
  }
}

/**
 * Clone a simple nodes with type and name.
 * @param {{type:string, name:string}} node The node to clone
 * @returns {{type:string, name:string}} A copy of the original node
 */
function paramToLiteral(node) {
  return {
    type : 'Literal',
    value: node.name
  };
}