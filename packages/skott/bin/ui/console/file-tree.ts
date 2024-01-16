import path from "node:path";

import { makeTreeStructure, type TreeStructure } from "fs-tree-structure";
import kleur from "kleur";

import type { SkottStructure } from "../../../index.js";

import { kLeftSeparator, makeIndents } from "./shared.js";

function isDirectory(nodePath: string): boolean {
  return path.extname(nodePath) === "";
}

function renderFileTree(
  treeStructure: TreeStructure,
  filesInvolvedInCycles: string[],
  whitespaces = 0
): void {
  const leftLevelSeparator = whitespaces === 0 ? "" : kLeftSeparator;
  const indents = makeIndents(whitespaces);
  for (const [nodeId, subNodes] of Object.entries(treeStructure)) {
    if (isDirectory(nodeId)) {
      console.log(
        `${indents} ${leftLevelSeparator} ${kleur.bold().yellow(nodeId)}/`
      );
    } else {
      console.log(
        `${indents} ${leftLevelSeparator} ${kleur.bold().blue(nodeId)}`
      );
    }
    renderFileTree(subNodes, filesInvolvedInCycles, whitespaces + 2);
  }
}

export function displayAsFileTree(
  graph: SkottStructure["graph"],
  filesInvolvedInCircularDependencies: string[]
) {
  const flattenedFilesPaths = Object.values(graph).flatMap((rootValue) => [
    rootValue.id,
    ...rootValue.adjacentTo
  ]);
  const treeStructure = makeTreeStructure(flattenedFilesPaths);
  console.log();
  renderFileTree(treeStructure, filesInvolvedInCircularDependencies, 0);
}
