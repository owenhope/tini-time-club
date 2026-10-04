import assert from "node:assert/strict";
import test from "node:test";
import {
  appStoreUrl,
  isMetaAdVisit,
  META_AD_CAMPAIGN,
} from "../appStoreLink.mjs";

test("Meta ad visits are recognised by fbclid or a Meta UTM source", () => {
  assert.equal(isMetaAdVisit("?fbclid=IwAR123"), true);
  assert.equal(isMetaAdVisit("?utm_source=Instagram&utm_medium=paid"), true);
  assert.equal(isMetaAdVisit("?utm_source=facebook"), true);
  assert.equal(isMetaAdVisit("?utm_source=google"), false);
  assert.equal(isMetaAdVisit(""), false);
});

test("campaign links carry the provider token, campaign and media type", () => {
  const url = new URL(
    appStoreUrl({ providerToken: "118000", campaign: META_AD_CAMPAIGN })
  );
  assert.equal(url.origin, "https://apps.apple.com");
  assert.equal(url.pathname, "/app/tini-time-club/id6741620393");
  assert.equal(url.searchParams.get("pt"), "118000");
  assert.equal(url.searchParams.get("ct"), "Meta Web");
  assert.equal(url.searchParams.get("mt"), "8");
});

test("campaign names are percent-encoded like App Store Connect links", () => {
  assert.equal(
    appStoreUrl({ providerToken: "119407106", campaign: META_AD_CAMPAIGN }),
    "https://apps.apple.com/app/tini-time-club/id6741620393?pt=119407106&ct=Meta%20Web&mt=8"
  );
});

test("without a provider token the plain store URL is used", () => {
  for (const providerToken of [undefined, "", "  "]) {
    assert.equal(
      appStoreUrl({ providerToken, campaign: META_AD_CAMPAIGN }),
      "https://apps.apple.com/app/tini-time-club/id6741620393"
    );
  }
});
