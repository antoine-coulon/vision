import React from "react";
import "ninja-keys";
import { NinjaKeys } from "ninja-keys";

import { useEventStore } from "../EventChannels.js";

export default function GlobalSearch() {
  const eventStore = useEventStore();
  const containerRef = React.useRef<NinjaKeys | null>(null);

  function focusOnNode(id: string) {
    eventStore.uiEvents$.next({ action: "focus", payload: { nodeId: id } });
  }

  React.useEffect(() => {
    const uiEventsSubscription = eventStore.uiEvents$.subscribe((event) => {
      if (event.action === "open_search") {
        containerRef.current?.open();
        containerRef.current?.focus();
      }
    });

    const dataStoreSubscription = eventStore.dataStore$.subscribe(
      (dataStore) => {
        if (containerRef.current) {
          containerRef.current.data = Object.values(dataStore.graph)
            .map((value) => ({
              id: value.id,
              title: value.id,
              mdIcon: "file_open",
              handler: ({ id }: { id: string }) => focusOnNode(id),
            }))
            .sort(({ id: f1 }, { id: f2 }) => {
              const f1BaseDir = f1.split("/").slice(0, -1).join("/");
              const f2BaseDir = f2.split("/").slice(0, -1).join("/");
              if (f1BaseDir.startsWith(f2BaseDir)) return 1;
              if (f2BaseDir.startsWith(f1BaseDir)) return -1;
              return 0;
            });
        }
      }
    );

    return () => {
      uiEventsSubscription.unsubscribe();
      dataStoreSubscription.unsubscribe();
    };
  }, []);

  return (
    // @ts-ignore
    <ninja-keys
      placeholder="Search for a node..."
      hideBreadcrumbs="true"
      ref={containerRef}
    />
  );
}
