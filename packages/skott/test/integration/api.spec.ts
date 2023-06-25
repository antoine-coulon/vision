import { describe, expect, test } from "vitest";

import skott from "../../index.js";
import { FileSystemReader } from "../../src/filesystem/file-reader.js";
import { InMemoryFileWriter } from "../../src/filesystem/file-writer.js";
import { FakeLogger } from "../../src/logger.js";
import { ModuleWalkerSelector } from "../../src/modules/walkers/common.js";
import { Skott, defaultConfig } from "../../src/skott.js";

import { createRealFileSystem } from "./create-fs-sandbox.js";
describe("When running Skott using all real dependencies", () => {
  describe("When providing various configurations", () => {
    test("Should support empty config", async () => {
      const skottInstance = await skott();

      expect(skottInstance).toBeDefined();
    });

    test("Should not allow `includeBaseDir` to be truthy when no entrypoint is provided", async () => {
      function makeSkott() {
        return skott({
          cwd: "./",
          entrypoint: undefined,
          includeBaseDir: true
        });
      }

      await expect(makeSkott()).rejects.toThrow(
        "Illegal configuration: `includeBaseDir` can only be used when providing an entrypoint"
      );
    });

    test("Should not allow `cwd` to be customized when using an entrypoint", async () => {
      function makeSkott() {
        return skott({
          cwd: "./apps/some-app",
          verbose: false,
          entrypoint: "./anything.ts"
        });
      }

      await expect(makeSkott()).rejects.toThrow(
        "Illegal configuration: `cwd` can't be customized when providing an entrypoint"
      );
    });
  });

  describe("When traversing files using the root dir as a starting point", () => {
    test("Should ignore files listed in `.gitignore`", async () => {
      const fsRootDir = `skott-ignore-temp-fs`;

      const runSandbox = createRealFileSystem(fsRootDir, {
        "skott-ignore-temp-fs/.gitignore": `dist \r\n *.js`,
        "skott-ignore-temp-fs/dist/index.ts": `console.log("hello world")`,
        "skott-ignore-temp-fs/index.js": `console.log("hello world")`,
        "skott-ignore-temp-fs/blob.ts": `console.log("hello world")`
      });

      expect.assertions(1);

      const skott = new Skott(
        defaultConfig,
        new FileSystemReader({ cwd: fsRootDir, ignorePattern: "" }),
        new InMemoryFileWriter(),
        new ModuleWalkerSelector(),
        new FakeLogger()
      );

      await runSandbox(async () => {
        const { graph } = await skott
          .initialize()
          .then(({ getStructure }) => getStructure());

        expect(graph).toEqual({
          "skott-ignore-temp-fs/blob.ts": {
            id: "skott-ignore-temp-fs/blob.ts",
            adjacentTo: [],
            body: {
              builtinDependencies: [],
              size: 26,
              thirdPartyDependencies: []
            }
          }
        });
      });
    });

    describe("When using `ignorePattern` config option", () => {
      describe("When running bulk analysis", () => {
        test("Should ignore files listed in `ignorePattern` config option", async () => {
          const fsRootDir = `skott-ignore-temp-fs`;

          const runSandbox = createRealFileSystem(fsRootDir, {
            "skott-ignore-temp-fs/src/project-a/file.ts": `export interface File { name: string }`,
            "skott-ignore-temp-fs/src/project-b/file.ts": `export interface File { name: string }`,
            "skott-ignore-temp-fs/lib/index.ts": `console.log("hello world")`
          });

          expect.assertions(1);

          const skott = new Skott(
            defaultConfig,
            new FileSystemReader({
              cwd: fsRootDir,
              ignorePattern: `${fsRootDir}/**/project-b/**/*`
            }),
            new InMemoryFileWriter(),
            new ModuleWalkerSelector(),
            new FakeLogger()
          );

          await runSandbox(async () => {
            const { files } = await skott
              .initialize()
              .then(({ getStructure }) => getStructure());

            expect(files).toEqual([
              "skott-ignore-temp-fs/lib/index.ts",
              "skott-ignore-temp-fs/src/project-a/file.ts"
            ]);
          });
        });
      });

      describe("When running analysis starting from an entrypoint", () => {
        test("Should ignore files listed in `ignorePattern` config option relatively to the base dir as includeBaseDir is true", async () => {
          const fsRootDir = `skott-ignore-temp-fs`;

          const runSandbox = createRealFileSystem(fsRootDir, {
            "skott-ignore-temp-fs/project-a/file.ts": `
              import "../lib/index";
            `,
            "skott-ignore-temp-fs/lib/index.ts": `console.log("hello world")`
          });

          expect.assertions(1);

          const skott = new Skott(
            {
              ...defaultConfig,
              entrypoint: `${fsRootDir}/project-a/file.ts`,
              includeBaseDir: true
            },
            new FileSystemReader({
              cwd: fsRootDir,
              ignorePattern: `${fsRootDir}/lib/**/*`
            }),
            new InMemoryFileWriter(),
            new ModuleWalkerSelector(),
            new FakeLogger()
          );

          await runSandbox(async () => {
            const { files } = await skott
              .initialize()
              .then(({ getStructure }) => getStructure());

            expect(files).toEqual(["skott-ignore-temp-fs/project-a/file.ts"]);
          });
        });

        test("Should ignore files listed in `ignorePattern` config option without relying on the base dir as includeBaseDir is false", async () => {
          const fsRootDir = `skott-ignore-temp-fs`;

          const runSandbox = createRealFileSystem(fsRootDir, {
            "skott-ignore-temp-fs/project-a/file.ts": `
              import "../lib/index";
            `,
            "skott-ignore-temp-fs/lib/index.ts": `console.log("hello world")`
          });

          expect.assertions(1);

          const skott = new Skott(
            {
              ...defaultConfig,
              entrypoint: `${fsRootDir}/project-a/file.ts`,
              includeBaseDir: false
            },
            new FileSystemReader({
              cwd: fsRootDir,
              ignorePattern: `**/lib/**/*`
            }),
            new InMemoryFileWriter(),
            new ModuleWalkerSelector(),
            new FakeLogger()
          );

          await runSandbox(async () => {
            const { files } = await skott
              .initialize()
              .then(({ getStructure }) => getStructure());

            expect(files).toEqual(["file.ts"]);
          });
        });
      });
    });
  });
});
