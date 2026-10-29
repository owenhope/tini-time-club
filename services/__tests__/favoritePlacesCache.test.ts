import {
  clearFavoritePlacesCache,
  knownFavorite,
  rememberFavorite,
  rememberFavoriteList,
} from "@/services/favoritePlacesCache";

beforeEach(() => clearFavoritePlacesCache());

it("knows nothing until a list or an answer arrives", () => {
  expect(knownFavorite("member", 1)).toBeNull();
});

it("treats a whole list as saying every other place is not liked", () => {
  rememberFavoriteList("member", ["1", 2]);
  expect(knownFavorite("member", 1)).toBe(true);
  expect(knownFavorite("member", "2")).toBe(true);
  expect(knownFavorite("member", 3)).toBe(false);
  expect(knownFavorite("someone-else", 1)).toBeNull();
});

it("lets a newer single answer override the list until the next list", () => {
  rememberFavoriteList("member", [1]);
  rememberFavorite("member", 1, false);
  rememberFavorite("member", 3, true);
  expect(knownFavorite("member", 1)).toBe(false);
  expect(knownFavorite("member", 3)).toBe(true);

  rememberFavoriteList("member", [1]);
  expect(knownFavorite("member", 1)).toBe(true);
  expect(knownFavorite("member", 3)).toBe(false);
});
