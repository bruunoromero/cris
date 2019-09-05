import { language } from "./language";
import { buildList, buildSymbol, buildKeyword, buildVector } from "./utils";

import { ParserConcreteNode } from "./ast";

import * as utils from "../utils";
import * as coreFns from "../../core/core_fns";

const requireCore = buildList([
  buildSymbol("require"),
  buildVector([
    buildSymbol(`${utils.EXT}.core`),
    buildKeyword("refer"),
    buildVector(coreFns.map(buildSymbol))
  ])
]);

export const parse = (source: string): ParserConcreteNode[] => {
  return [requireCore].concat(language.File.tryParse(source));
};