import EventEmitter from "node:events";
import { performance } from "node:perf_hooks";

import kleur from "kleur";

import type { SkottStructure } from "../../../index.js";
import type { InputConfig } from "../../config.js";
import { createRuntimeConfig, run } from "../../instance.js";

import { renderStaticFile } from "./static-file.js";
import {
  defaultTerminalConfig,
  ensureNoIllegalTerminalConfig
} from "./terminal-config.js";
import {
  displayCircularDependencies,
  displayDependenciesReport
} from "./ui/console/dependencies.js";
import { renderFileTree } from "./ui/renderers/file-tree.js";
import { renderGraph } from "./ui/renderers/graph.js";
import { RenderManager, CliComponent } from "./ui/renderers/render-manager.js";
import { renderWebApplication } from "./ui/renderers/webapp.js";
import { registerWatchMode } from "./watch-mode.js";

function displayInitialGetStructureTime(
  files: SkottStructure["files"],
  startTime: number
) {
  const filesWord = files.length > 1 ? "files" : "file";
  const timeTookStructure = `${(performance.now() - startTime).toFixed(3)}ms`;

  console.log(
    `\n Processed ${kleur.bold().green(files.length)} ${filesWord} (${kleur
      .magenta()
      .bold(timeTookStructure)})`
  );
}

export interface TerminalOptions {
  watch: boolean;
  displayMode: "file-tree" | "graph" | "webapp" | "raw";
  exitCodeOnCircularDependencies: number;
  showCircularDependencies: boolean;
  showUnusedDependencies: boolean;
}

export async function renderTerminalApplication<T>(
  apiConfig: InputConfig<T>,
  options = { ...defaultTerminalConfig, exitCodeOnCircularDependencies: 1 }
): Promise<void> {
  const terminalOptions: TerminalOptions = {
    watch: options.watch ?? defaultTerminalConfig.watch,
    displayMode: options.displayMode ?? defaultTerminalConfig.displayMode,
    exitCodeOnCircularDependencies: options.exitCodeOnCircularDependencies ?? 1,
    showCircularDependencies:
      options.showCircularDependencies ??
      defaultTerminalConfig.showCircularDependencies,
    showUnusedDependencies:
      options.showUnusedDependencies ??
      defaultTerminalConfig.showUnusedDependencies
  };

  const isTerminalConfigValid = ensureNoIllegalTerminalConfig(terminalOptions);

  if (isTerminalConfigValid._tag === "Left") {
    console.log(`\n ${kleur.bold().red(isTerminalConfigValid.left)}`);
    process.exit(1);
  }

  const runtimeConfig = createRuntimeConfig(apiConfig);

  function runSkott() {
    return run(runtimeConfig);
  }

  let skottInstance = await runSkott();

  const start = performance.now();
  const { graph, files } = skottInstance.getStructure();
  displayInitialGetStructureTime(files, start);

  let watcherEmitter: EventEmitter | undefined;
  let renderManager: RenderManager | undefined;

  if (terminalOptions.watch) {
    watcherEmitter = new EventEmitter();
    renderManager = new RenderManager(watcherEmitter);
  }

  if (terminalOptions.displayMode === "file-tree") {
    const fileTreeComponent = new CliComponent(() =>
      renderFileTree(skottInstance, {
        circularMaxDepth: runtimeConfig.circularMaxDepth,
        exitCodeOnCircularDependencies:
          terminalOptions.exitCodeOnCircularDependencies,
        showCircularDependencies: terminalOptions.showCircularDependencies
      })
    );

    renderManager?.renderOnChanges(fileTreeComponent);
  } else if (terminalOptions.displayMode === "graph") {
    const graphComponent = new CliComponent(() =>
      renderGraph(skottInstance, {
        circularMaxDepth: runtimeConfig.circularMaxDepth,
        exitCodeOnCircularDependencies:
          terminalOptions.exitCodeOnCircularDependencies,
        showCircularDependencies: terminalOptions.showCircularDependencies
      })
    );

    renderManager?.renderOnChanges(graphComponent);
  } else if (terminalOptions.displayMode === "webapp") {
    const circularDepsComponent = new CliComponent(() =>
      displayCircularDependencies(skottInstance, {
        circularMaxDepth: runtimeConfig.circularMaxDepth,
        exitCodeOnCircularDependencies:
          terminalOptions.exitCodeOnCircularDependencies,
        /**
         * We only want to display the overview that is whether the graph is
         * acyclic or not. Circular dependencies will be displayed within the webapp
         * itself.
         */
        showCircularDependencies: false
      })
    );

    renderManager?.renderOnChanges(circularDepsComponent);

    renderWebApplication({
      getSkottInstance: () => skottInstance,
      options: {
        entrypoint: runtimeConfig.entrypoint,
        includeBaseDir: runtimeConfig.includeBaseDir,
        tracking: runtimeConfig.dependencyTracking
      },
      watcherEmitter
    });
  } else if (terminalOptions.displayMode === "raw") {
    const circularDepsComponent = new CliComponent(() =>
      displayCircularDependencies(skottInstance, {
        circularMaxDepth: runtimeConfig.circularMaxDepth,
        exitCodeOnCircularDependencies:
          terminalOptions.exitCodeOnCircularDependencies,
        showCircularDependencies: terminalOptions.showCircularDependencies
      })
    );

    renderManager?.renderOnChanges(circularDepsComponent);
  } else {
    // @TODO: check if this is a valid display mode if the registered plugin
    // is registered.
    await renderStaticFile(graph, terminalOptions.displayMode);
  }

  // Additional information we want to display when using the console UI
  // To avoid redondant information, we don't display it when using the webapp
  if (terminalOptions.displayMode !== "webapp") {
    await new Promise((resolve) => {
      const depsReportComponent = new CliComponent(() =>
        displayDependenciesReport(skottInstance, {
          showUnusedDependencies: terminalOptions.showUnusedDependencies,
          trackBuiltinDependencies: runtimeConfig.dependencyTracking.builtin,
          trackThirdPartyDependencies:
            runtimeConfig.dependencyTracking.thirdParty
        }).then(resolve)
      );

      renderManager?.renderOnChanges(depsReportComponent);
    });
  }

  if (terminalOptions.watch) {
    registerWatchMode({
      cwd: runtimeConfig.cwd,
      ignorePattern: runtimeConfig.ignorePattern,
      fileExtensions: runtimeConfig.fileExtensions,
      onChangesDetected: (done) => {
        runSkott().then((newSkottInstance) => {
          skottInstance = newSkottInstance;
          watcherEmitter!.emit("change");
          renderManager!.afterRenderingPhase(done);
        });
      }
    });
  }
}

process.on("exit", (code) => {
  console.log(
    `\n ${kleur.bold().blue("skott")} exited with code ${kleur
      .bold()
      .yellow(code)}`
  );
});
