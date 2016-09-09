import _ from "lodash";
import { IconButton } from "/imports/plugins/core/ui/client/components";
import { Template } from "meteor/templating";
import { ProductSearch, Tags } from "/lib/collections";


Template.searchModal.onCreated(function () {
  this.state = new ReactiveDict();
  this.state.setDefault({
    initialLoad: true,
    slug: "",
    canLoadMoreProducts: false,
    searchQuery: "",
    productSearchResults: [],
    tagSearchResults: []
  });

  this.autorun(() => {
    const searchQuery = this.state.get("searchQuery");
    const facets = this.state.get("facets") || [];

    const sub = this.subscribe("SearchResults", "products", searchQuery, facets); // collection, searchTerm, facets

    if (sub.ready()) {
      const results = ProductSearch.find().fetch();
      this.state.set("productSearchResults", results);
      const hashtags = [];
      for (const product of results) {
        if (product.hashtags) {
          for (const hashtag of product.hashtags) {
            if (!_.includes(hashtags, hashtag)) {
              hashtags.push(hashtag);
            }
          }
        }
      }
      const tagResults = Tags.find({
        _id: { $in: hashtags }
      }).fetch();
      this.state.set("tagSearchResults", tagResults);
    }
  });
});


Template.searchModal.helpers({
  IconButtonComponent() {
    const instance = Template.instance();
    const view = instance.view;

    return {
      component: IconButton,
      icon: "fa fa-times",
      kind: "flat",
      onClick() {
        $(".js-search-modal").fadeOut(400, () => {
          $("body").css("overflow-y", "inherit");
          Blaze.remove(view);
        });
      }
    };
  },
  productSearchResults() {
    const instance = Template.instance();
    const results = instance.state.get("productSearchResults");
    // console.log("productSearchResults", results);
    return results;
  },
  tagSearchResults() {
    const instance = Template.instance();
    const results = instance.state.get("tagSearchResults");
    // console.log("tagSearchResults", results);
    return results;
  }
});


Template.searchModal.events({
  // on type, reload Reaction.SaerchResults
  "keyup input": (event, templateInstance) => {
    event.preventDefault();
    if (event.keyCode === 27) {
      const instance = Template.instance();
      const view = instance.view;
      $(".js-search-modal").fadeOut(400, () => {
        $("body").css("overflow-y", "inherit");
        Blaze.remove(view);
      });
    }
    const searchQuery = templateInstance.find("#search-input").value;
    templateInstance.state.set("searchQuery", searchQuery);
    $(".search-modal-header:not(.active-search)").addClass(".active-search");
    if (!$(".search-modal-header").hasClass("active-search")) {
      $(".search-modal-header").addClass("active-search");
    }
  },
  "click [data-event-action=filter]": function (event, templateInstance) {
    event.preventDefault();
    const instance = Template.instance();
    const facets = instance.state.get("facets") || [];
    const newFacet = $(event.target).data("event-value");

    tagToggle(facets, newFacet);

    $(event.target).toggleClass("active-tag");

    templateInstance.state.set("facets", facets);
  },
  "click [data-event-action=productClick]": function () {
    const instance = Template.instance();
    const view = instance.view;
    $(".js-search-modal").delay(400).fadeOut(400, () => {
      $("body").css("overflow-y", "inherit");
      Blaze.remove(view);
    });
  }
});

function tagToggle(arr, val) {
  if (arr.length === _.pull(arr, val).length) {
    arr.push(val);
  }
  return arr;
}
