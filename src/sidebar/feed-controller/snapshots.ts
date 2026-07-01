import type { FeedTab, SubsFilter } from "../../browse/types";
import {
  feedCacheKey,
  feedSnapshots,
  feedState,
  requireFeedControllerDeps,
} from "./state";
import { buildSnapshotFields } from "./snapshot-fields";

export function saveFeedSnapshot(tab: FeedTab, subsFilter: SubsFilter, query: string): void {
  const key = feedCacheKey(tab, subsFilter, query);
  const deps = requireFeedControllerDeps();
  feedSnapshots.set(
    key,
    buildSnapshotFields(
      tab,
      feedState.feedItems,
      feedState.shortsContinuation,
      feedState.selectedIndex,
      deps.formatFeedCount,
      feedState.feedEmptyHint,
    ),
  );
}
