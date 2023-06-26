import { R_OK } from "node:constants";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import * as Context from "@effect/data/Context";
import ignoreWalk from "ignore-walk";
import * as memfs from "memfs";
import { minimatch } from "minimatch";

import {
  isDirSupportedByDefault,
  isFileSupportedByDefault,
  isManifestFile
} from "../modules/resolvers/base-resolver.js";

export interface FileReader {
  read: (filename: string) => Promise<string>;
  readSync: (filename: string) => string;
  readdir: (root: string, extensions: string[]) => AsyncGenerator<string>;
  stats: (filename: string) => Promise<number>;
  getCurrentWorkingDir: () => string;
}

export const FileReaderTag = Context.Tag<FileReader>();

interface FileSystemConfig {
  cwd: string;
  ignorePattern: string;
}

export class FileSystemReader implements FileReader {
  constructor(
    private readonly config: FileSystemConfig = {
      cwd: process.cwd(),
      ignorePattern: ""
    }
  ) {}

  private isFileIgnored(filename: string): boolean {
    if (this.config.ignorePattern === "") {
      return false;
    }

    return (
      minimatch(
        filename,
        path.join(this.config.cwd, path.sep, this.config.ignorePattern)
      ) || minimatch(filename, this.config.ignorePattern)
    );
  }

  read(filename: string): Promise<string> {
    if (this.isFileIgnored(filename)) {
      return Promise.reject(
        `File ${filename} is ignored due to the ignore pattern ${this.config.ignorePattern}`
      );
    }
    return fs.readFile(filename, { encoding: "utf-8", flag: R_OK });
  }

  readSync(filename: string): string {
    // eslint-disable-next-line no-sync
    return fsSync.readFileSync(filename, { encoding: "utf-8" });
  }

  stats(filename: string): Promise<number> {
    return fs
      .stat(filename, { bigint: false })
      .then((stats) => stats.size)
      .catch(() => 0);
  }

  getCurrentWorkingDir(): string {
    return this.config.cwd;
  }

  async *readdir(
    root: string,
    providedFileExtensions: string[]
  ): AsyncGenerator<string> {
    const filePaths = await ignoreWalk({
      path: root,
      ignoreFiles: [".gitignore"]
    });

    const filePathsWithRoot = filePaths.map((fp) => path.join(root, fp));

    for (const filePath of filePathsWithRoot) {
      const isFileMatchingExtensions = providedFileExtensions.includes(
        path.extname(filePath)
      );
      const isSupportedFile =
        isDirSupportedByDefault(path.dirname(filePath)) &&
        isFileSupportedByDefault(filePath) &&
        isFileMatchingExtensions;

      if (isSupportedFile || isManifestFile(filePath)) {
        if (!this.isFileIgnored(filePath)) {
          yield filePath;
        }
      }
    }
  }
}

/* eslint-disable no-sync */
export class InMemoryFileReader implements FileReader {
  constructor(
    private readonly config: FileSystemConfig = { cwd: "./", ignorePattern: "" }
  ) {}

  private isFileIgnored(filename: string): boolean {
    return minimatch(filename, this.config.ignorePattern);
  }

  read(filename: string): Promise<string> {
    if (this.isFileIgnored(filename)) {
      return Promise.reject("_discard_");
    }

    return new Promise((resolve) => {
      resolve(memfs.fs.readFileSync(filename, "utf-8") as string);
    });
  }

  readSync(filename: string): string {
    return memfs.fs.readFileSync(filename, { encoding: "utf-8" }) as string;
  }

  async *readdir(
    root: string,
    fileExtensions: string[]
  ): AsyncGenerator<string> {
    for (const dirent of memfs.fs.readdirSync(root)) {
      const _dirent = dirent as string;

      if (memfs.fs.lstatSync(path.join(root, _dirent)).isDirectory()) {
        if (isDirSupportedByDefault(path.join(root, _dirent))) {
          yield* this.readdir(path.join(root, _dirent), fileExtensions);
        }
      } else if (
        isManifestFile(_dirent) ||
        (isFileSupportedByDefault(_dirent) &&
          fileExtensions.includes(path.extname(_dirent)) &&
          !this.isFileIgnored(path.join(root, _dirent)))
      ) {
        yield path.join(root, _dirent);
      }
    }
  }

  stats(_filename: string): Promise<number> {
    return new Promise((resolve) => resolve(0));
  }

  getCurrentWorkingDir(): string {
    return this.config.cwd;
  }
}
