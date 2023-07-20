import React from "react";
import { Subject, Subscription, combineLatest } from "rxjs";

import { DataSet } from "vis-data";
import { Edge, Network, Node } from "vis-network";

import {
  SkottStructureWithCycles,
  SkottStructureWithMetadata,
} from "../skott.js";
import { DataStore, UiEvents } from "../events.js";
import {
  defaultEdgeOptions,
  defaultNodeOptions,
  getAppropriateMassGivenDataset,
  isNetworkEdge,
  isNetworkNode,
  makeNodesAndEdges,
  networkOptions,
} from "./configuration.js";
import {
  circularEdgeOptions,
  circularNodeOptions,
  computeBuiltinDependencies,
  computeThirdPartyDependencies,
} from "./dependencies.js";
import { useEventStore } from "../EventChannels.js";

export function getMethodToApplyOnNetworkElement(enable: boolean) {
  return enable ? "update" : "remove";
}

export default function GraphNetwork() {
  const eventStore = useEventStore();
  const networkContainerRef = React.useRef(null);
  const [network, setNetwork] = React.useState<Network>();
  const [nodeDataset, setNodeDataset] = React.useState(
    new DataSet<Node, "id">([])
  );
  const [edgeDataset, setEdgeDataset] = React.useState(
    new DataSet<Edge, "id">([])
  );

  function focusOnNetworkNode(nodeId: string) {
    network?.selectNodes([nodeId], true);
    network?.focus(nodeId, {
      animation: {
        duration: 400,
        easingFunction: "easeInOutCubic",
      },
      scale: 1.1,
    });
  }

  function highlightEntrypoint(nodeId: string) {
    nodeDataset.update([
      {
        id: nodeId,
        color: {
          border: "#000000",
          background: "#ebde02",
          highlight: {
            border: "#000000",
            background: "#ebde02",
          },
        },
      },
    ]);
  }

  function highlightCircularDependencies(
    data: SkottStructureWithCycles,
    highlighted: boolean
  ) {
    const nodeOptions = !highlighted ? circularNodeOptions : defaultNodeOptions;
    const edgeOptions = !highlighted ? circularEdgeOptions : defaultEdgeOptions;

    for (const cycle of data.cycles) {
      for (let index = 0; index < cycle.length; index++) {
        const node1 = cycle[index];
        const node2 = cycle[index + 1] ? cycle[index + 1] : cycle[0];

        if (node1 && node2) {
          nodeDataset.update([
            {
              id: node1,
              ...nodeOptions,
            },
            {
              id: node2,
              ...nodeOptions,
            },
          ]);

          edgeDataset.update([
            {
              id: `${node1}-${node2}`,
              from: node1,
              to: node2,
              ...edgeOptions,
            },
          ]);
        }
      }
    }
  }

  function toggleDependencies(
    data: SkottStructureWithMetadata,
    type: "builtin" | "third_party",
    enabled: boolean
  ) {
    const dependencies =
      type === "builtin"
        ? computeBuiltinDependencies(data)
        : computeThirdPartyDependencies(data);

    const linkedNodes = dependencies.filter(isNetworkNode);
    const linkedEdges = dependencies.filter(isNetworkEdge);

    nodeDataset[getMethodToApplyOnNetworkElement(enabled)](linkedNodes);
    edgeDataset[getMethodToApplyOnNetworkElement(enabled)](linkedEdges);
  }

  function networkReducer(dataStore: DataStore, uiEvents: UiEvents) {
    switch (uiEvents.action) {
      case "focus": {
        focusOnNetworkNode(uiEvents.payload.nodeId);
        network?.stabilize();
        break;
      }
      case "toggle_circular": {
        highlightCircularDependencies(dataStore, uiEvents.payload.enabled);
        if (dataStore.entrypoint) {
          highlightEntrypoint(dataStore.entrypoint);
        }
        break;
      }
      case "toggle_builtin": {
        toggleDependencies(dataStore, "builtin", uiEvents.payload.enabled);
        network?.stabilize();
        break;
      }
      case "toggle_thirdparty": {
        toggleDependencies(dataStore, "third_party", uiEvents.payload.enabled);
        network?.stabilize();
        break;
      }
    }
  }

  React.useEffect(() => {
    let subscription: Subscription;

    if (networkContainerRef.current) {
      subscription = eventStore.dataStore$.subscribe((dataStore) => {
        console.log("SUBSCRIBE");

        const { graphNodes, graphEdges } = makeNodesAndEdges(
          Object.values(dataStore.graph),
          { entrypoint: dataStore.entrypoint }
        );

        setNodeDataset(new DataSet(graphNodes));
        setEdgeDataset(new DataSet(graphEdges));
      });
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const networkOptionsWithMass = {
      ...networkOptions,
      nodes: {
        ...networkOptions.nodes,
        mass: getAppropriateMassGivenDataset(nodeDataset.length),
      },
    };

    setNetwork(
      new Network(
        networkContainerRef.current!,
        { nodes: nodeDataset, edges: edgeDataset },
        networkOptionsWithMass
      )
    );

    return () => {
      network?.destroy();
    };
  }, [nodeDataset, edgeDataset]);

  React.useEffect(() => {
    const uiEventsSubscription = combineLatest([
      eventStore.dataStore$,
      eventStore.uiEvents$,
    ]).subscribe(([dataStore, uiEvents]) =>
      networkReducer(dataStore, uiEvents)
    );

    return () => {
      uiEventsSubscription.unsubscribe();
    };
  }, [network]);

  return (
    <div
      style={{
        height: "100%",
      }}
      ref={networkContainerRef}
    />
  );
}
