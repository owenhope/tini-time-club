import { count, dayCounts, record } from "./model.mjs";

const activity = (value) => {
  const row = record(value);
  return {
    members: count(row.members),
    reviews: count(row.reviews),
    places: count(row.places),
    follows: count(row.follows),
    likes: count(row.likes),
    comments: count(row.comments),
    shares: count(row.shares),
    indexInteractions: count(row.indexInteractions),
  };
};

export const resolveOverview = (value) => {
  const row = record(value);
  const totals = record(row.totals);
  return {
    totals: {
      members: count(totals.members),
      reviews: count(totals.reviews),
      places: count(totals.places),
    },
    current: activity(row.current),
    previous: activity(row.previous),
    membersByDay: dayCounts(row.membersByDay),
    reviewsByDay: dayCounts(row.reviewsByDay),
    placesByDay: dayCounts(row.placesByDay),
  };
};
