import { Injectable } from "@angular/core";
import * as ol from "openlayers";

@Injectable()
export abstract class MapItemHelper<T extends Item> {
  itemListChangedListeners = [];
  loadingHandle = null;
  itemMap = {};

  constructor(public map: ol.Map, public itemLayer: ol.layer.Vector) {
    this.map.getView().on("change:center", this.viewChanged.bind(this));
    this.map.getView().on("change:resolution", this.viewChanged.bind(this));
    setTimeout(this.updateView.bind(this), 100);
  }

  // callback function to be called when view position is changed
  public viewChanged() {
    if (this.loadingHandle) {
      clearTimeout(this.loadingHandle);
      this.loadingHandle = null;
    }
    this.loadingHandle = setTimeout(this.updateView.bind(this), 1000);
  }

  // add a listener to be called when view items are changed
  public addItemChangedListener(listener: Function) {
    let index = this.itemListChangedListeners.indexOf(listener);
    if (index < 0) {
      this.itemListChangedListeners.push(listener);
    }
  }

  // remove a listener to be called when view items are changed
  public removeItemChangedListener(listener: Function) {
    let index = this.itemListChangedListeners.indexOf(listener);
    if (index >= 0) {
      this.itemListChangedListeners.splice(index, 1);
    }
  }

  // update view items according to the current location
  public updateView() {
    let size = this.map.getSize();
    if (!size) {
      return;
    }
    let ext = this.map.getView().calculateExtent(size);
    let extent = ol.proj.transformExtent(ext, "EPSG:3857", "EPSG:4326");
    this.queryItems(extent[0], extent[1], extent[2], extent[3]).subscribe(data => {
      this.updateItems(data);
    });
  }

  // query items within given area
  public abstract queryItems(min_longitude: number, min_latitude: number, max_longitude: number, max_latitude: number);

  // Show items on a view
  public updateItems(items: T[]) {
    if (!items) {
      return;
    }

    let itemsToAdd = [];
    let itemsToRemoveMap = {};

    for (let key in this.itemMap) {
      itemsToRemoveMap[key] = this.itemMap[key].item;
    }

    items.forEach(function(item: T) {
      let id = item.getId();

      if (!this.itemMap[id]) {
        itemsToAdd.push(item);
      }
      if (itemsToRemoveMap[id]) {
        delete itemsToRemoveMap[id];
      }
    }.bind(this));

    if (itemsToAdd.length > 0) {
      this.addItemsToView(itemsToAdd);
    }

    let itemsToRemove = [];
    for (let key in itemsToRemoveMap) {
      itemsToRemove.push(itemsToRemoveMap[key]);
    }
    if (itemsToRemove.length > 0) {
      this.removeItemsFromView(itemsToRemove);
    }

    if (itemsToAdd.length > 0 || itemsToRemove.length > 0) {
      this.itemListChangedListeners.forEach(function(listener) {
        listener(items);
      });
    }
  }

  addItemsToView(items: T[]) {
    items.forEach(function(item: T) {
      let id = item.getId();
      if (!this.itemMap[id]) {
        let features = this.createItemFeatures(item);
        if (features) {
          this.itemLayer.getSource().addFeatures(features);
          this.itemMap[id] = {item: item, feature: features};
        }
      }
    }.bind(this));
  }

  removeItemsFromView(items: T[]) {
    items.forEach(function(item: T) {
      let id = item.getId();
      if (this.itemMap[id]) {
        let features = this.itemMap[id].features;
        this.itemLayer.getSource().removeFeatures(features);
        delete this.itemMap[id];
      }
    }.bind(this));
  }

  getItemForFeature(feature) {
    for (let key in this.itemMap) {
      if (this.itemMap[key].feature === feature) {
        return this.itemMap[key].item;
      }
    }
    return null;
  }

  public abstract createItemFeatures(item: T);
}

@Injectable()
export abstract class Item {
  constructor(params) {
    for (let key in params) {
      this[key] = params[key];
    }
  }

  public abstract getId();
}
