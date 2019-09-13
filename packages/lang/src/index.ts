import "source-map-support/register";
import * as compiler from "./compiler";
import { IrFile, IrMeta } from "./ir";
import * as loader from "./loader";
import { loadProject, SheerConfig, Project } from "./project";
import * as resolver from "./resolver";
import * as utils from "./utils";

import moment = require("moment");

type Meta = { name: string; file: IrFile; meta: IrMeta };

export const compileToIr = (path: string, project: Project): any => {
  return loader.loadFile(path, project.config);
};

export const fromNsToIr = (ns: string, project: Project) => {
  const path = utils.nameToPath(ns, project.config);
  return compileToIr(path, project);
};

export const loadFolder = async (
  metas: IrMeta[],
  folderName: string,
  project: Project
): Promise<IrFile[]> => {
  const files = await utils.traverseFolder(folderName);

  const compiledFiles = files
    .filter(([path, stat]) => {
      const meta = metas.find(meta => meta.path === path);

      if (!meta) {
        return true;
      }

      if (moment(stat.mtime).isAfter(meta.createdAt)) {
        return true;
      }

      return false;
    })
    .map(([path]) => compileToIr(path, project));

  return Promise.all(compiledFiles);
};

const resolveFileSymbols = (name: string, file: IrFile, metas: any) => {
  const resolvedFile = resolver.transform(file, metas);

  return { name, file: resolvedFile, meta: resolvedFile.meta() };
};

const resolveSymbols = (sortedFiles: IrFile[], metas: IrMeta[]): Meta[] => {
  let _metas = metas;
  let parsed = [];

  for (let file of sortedFiles) {
    const meta = resolveFileSymbols(file.ns, file, _metas);
    parsed.push(meta);
    _metas = [..._metas, meta.meta];
  }

  return parsed;
};

const sortFiles = (files: IrFile[]) => {
  const genDep = (file: IrFile): [string, string][] => {
    return file.requires().map(([name, req]) => [file.ns, req.ns.value]);
  };

  return utils
    .tsort(
      files
        .map(file => genDep(file))
        .reduce((acc, curr) => acc.concat(curr), [])
    )
    .reverse()
    .map(name => files.find(file => file.ns === name))
    .filter(e => e);
};

export const compile = async () => {
  const project = await loadProject();

  try {
    const filesToCompile = await loadFolder(
      project.metas,
      project.config.rootSource,
      project
    );

    const compilations = resolveSymbols(
      sortFiles(filesToCompile),
      project.metas
    ).map(async meta => {
      const compiled = await compiler.compile(meta.file, meta.name, project);
      const filePath = utils.nameToPath(meta.name, project.config, true);
      const metaPath = utils.nameToMetaPath(meta.name, project.config);

      return Promise.all([
        loader.writeFile(filePath, compiled.code),
        loader.writeFile(metaPath, JSON.stringify(meta.meta, null, 2))
      ]);
    });

    await Promise.all(compilations);

    return project.config;
  } catch (e) {
    console.log(e);
    process.exit();
  }
};
