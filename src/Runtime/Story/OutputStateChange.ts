// Assumption: prevText is the snapshot where we saw a newline, and we're checking whether we're really done
//             with that line. Therefore prevText will definitely end in a newline.
//
// We take tags into account too, so that a tag following a content line:
//   Content
//   # tag
// ... doesn't cause the tag to be wrongly associated with the content above.
export enum OutputStateChange {
  NoChange,
  ExtendedBeyondNewline,
  NewlineRemoved,
}
