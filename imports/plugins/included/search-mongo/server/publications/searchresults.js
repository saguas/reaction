import _ from "lodash";
import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Reaction, Logger } from "/server/api";
import { ProductSearch, OrderSearch, AccountSearch } from "/lib/collections";

const supportedCollections = ["products", "orders", "accounts"];

function getProductFindTerm(searchTerm, searchTags, userId) {
  const shopId = Reaction.getShopId();
  const findTerm = {
    shopId: shopId,
    $text: {$search: searchTerm}
  };
  if (searchTags.length) {
    findTerm.hastags = {$all: searchTags};
  }
  if (!Roles.userIsInRole(userId, ["admin", "owner"], shopId)) {
    findTerm.isVisible = true;
  }
  return findTerm;
}

export const getResults = {};

getResults.products = function (searchTerm, facets, maxResults, userId) {
  const searchTags = facets || [];
  const findTerm = getProductFindTerm(searchTerm, searchTags, userId);
  // Logger.info(`Using findTerm ${JSON.stringify(findTerm, null, 4)}`);
  const productResults = ProductSearch.find(findTerm,
    {
      fields: {
        score: {$meta: "textScore"},
        title: 1,
        hashtags: 1,
        description: 1,
        handle: 1,
        price: 1
      },
      sort: {score: {$meta: "textScore"}},
      limit: maxResults
    }
  );
  Logger.info(`Found ${productResults.count()} products`);
  // const verboseProducts = productResults.fetch();
  // Logger.info(JSON.stringify(verboseProducts, null, 4));
  return productResults;
};

getResults.orders = function (searchTerm, facets, maxResults, userId) {
  let orderResults;
  const shopId = Reaction.getShopId();
  if (Roles.userIsInRole(userId, ["admin", "owner"], shopId)) {
    orderResults = OrderSearch.find({
      shopId: shopId, $text: {$search: searchTerm}
    }, {
      fields: {
        score: {$meta: "textScore"}
      },
      sort: {score: {$meta: "textScore"}},
      limit: maxResults
    }
    );
    Logger.info(`Found ${orderResults.count()} orders`);
  }
  return orderResults;
};

getResults.accounts = function (searchTerm, facets, maxResults, userId) {
  let accountResults;
  const shopId = Reaction.getShopId();
  if (Roles.userIsInRole(userId, ["admin", "owner"], shopId)) {
    accountResults = AccountSearch.find({
// <<<<<<< Updated upstream
      shopId: shopId,
      emails: searchTerm
    });
    Logger.info(`Found ${accountResults.count()} accounts searching for ${searchTerm}`);
    // const verboseResults = accountResults.fetch();
    // Logger.info(JSON.stringify(verboseResults, null, 4));
// =======
//       shopId: shopId, $text: {$search: searchTerm}
//     }, {
//       fields: {
//         score: {$meta: "textScore"}
//       },
//       limit: maxResults
//     });
//     Logger.info(`Found ${accountResults.count()} account`);
// >>>>>>> Stashed changes
  }
  return accountResults;
};

Meteor.publish("SearchResults", function (collection, searchTerm, facets, maxResults = 99) {
  check(collection, String);
  check(collection, Match.Where((coll) => {
    return _.includes(supportedCollections, coll);
  }));
  check(searchTerm, Match.Optional(String));
  check(facets, Match.OneOf(Array, undefined));
  Logger.info(`Returning search results on ${collection}. SearchTerm: |${searchTerm}|. Facets: |${facets}|.`);
  if (!searchTerm) {
    return this.ready();
  }
  return getResults[collection](searchTerm, facets, maxResults, this.userId);
});