import { ATraverser } from "./atraverser";
import { ParserList, ParserNull } from "../../parser/ast";
import { ExIfNode } from "../ast/if";
import { ExNullNode } from "../ast/primitives";

export class WhenTraverser extends ATraverser {
  get fnName() {
    return "when";
  }

  traverse(node: ParserList): ExIfNode {
    const args = this.args(node);
    const [cond, truthy] = this.traverseArgs(args);

    return new ExIfNode(node.loc, cond, truthy, new ExNullNode(node.loc));
  }

  validate(node: ParserList): boolean {
    return this.validateEqualLength(node, 2);
  }
}
