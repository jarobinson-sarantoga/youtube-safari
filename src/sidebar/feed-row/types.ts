import type { FeedItem } from "../../browse/types";

export type FeedRowClickHandler = (item: FeedItem, index: number) => void;

export type FeedRowBackgroundHandler = (item: FeedItem, index: number) => void;

export interface FeedRowOptions {
  item: FeedItem;
  index?: number;
  selected?: boolean;
  rowClassName?: string;
  rowIdPrefix?: string;
  showDuration?: boolean;
  showResume?: boolean;
  showExtra?: boolean;
  showBackgroundPlay?: boolean;
  portrait?: boolean;
  onClick: FeedRowClickHandler;
  onBackgroundPlay?: FeedRowBackgroundHandler;
}
