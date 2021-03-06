/**
 * Copyright 2016,2019 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Component, OnInit, ViewChild } from '@angular/core';
import { Http, Request, Response } from '@angular/http';

import { VehicleListComponent } from './vehicle-list/vehicle-list.component';
import { VendorListComponent } from './vendor-list/vendor-list.component';

@Component({
  moduleId: module.id,
  selector: 'fmdash-vehicle-page',
  templateUrl: 'vehicle-page.component.html',
})
export class VehiclePageComponent implements OnInit {

  @ViewChild(VehicleListComponent)
  private vehicleList: VehicleListComponent;

  @ViewChild(VendorListComponent)
  private vendorList: VendorListComponent;

  isWorkingWithVendor: boolean;
  isIoTPAvailable: boolean = false;

  constructor(public http: Http) {

  }

  ngOnInit() {
    this.http.get("/user/capability/device")
      .subscribe((response: any) => {
        let res = response.json();
        this.isIoTPAvailable = res.available;
      });
  }

  onSyncWithIoTPlatform() {
    this.vehicleList.onSyncWithIoTPlatform();
  }

  onCreateVehicle() {
    this.vehicleList.onCreate();
  }

  onCreateVendor() {
    this.vendorList.onReload();
    this.isWorkingWithVendor = true;
  }

  onClose() {
    this.isWorkingWithVendor = false;
  }
}
