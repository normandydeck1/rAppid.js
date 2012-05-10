/***
 *
 * Filters items inside a list
 *
 * @class js.data.ListView
 */
define(["js/data/DataView"], function (DataView) {

    return DataView.inherit("js.data.FilterListView", {
        _onItemAdded: function (e) {
            var ret = this._filterItem(e.$.item, e.index);
            if (ret === true) {
                this.$.list.add(e.$.item, e.index);
            }
        },
        _onItemRemoved: function (e) {
            this.$.list.remove(e.$.item, e.$.index);
        },
        _onItemChanged: function (e) {
            var keep = this._filterItem(e.$.item, e.$.index);
            var included = _.include(this.$.baseList.$items, e.$.item);
            if (included && keep === false) {
                this.$.list.remove(e.$.item, e.$.index);
            } else if (!included && keep === true) {
                this.$.list.add(e.$.item, e.$.index);
            }
        },
        _innerReset: function(items){
            var filtered = [], item;
            for (var i = 0; i < items.length; i++) {
                item = items[i];
                if (this._filterItem(item, i) === true) {
                    filtered.push(item);
                }
            }
            this.$.list.reset(filtered);
        },
        _filterItem: function (item, index) {
            return this.$.filterFnc.call(this, item, index, this.$.list);
        }
    });
});