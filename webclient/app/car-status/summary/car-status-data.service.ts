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
import { Injectable } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { RealtimeDeviceData, RealtimeDeviceDataProvider } from '../../shared/realtime-device';
import { RealtimeDeviceDataProviderService } from '../../shared/realtime-device-manager.service';

import * as _ from 'underscore';

export interface StatusGroup {
  label: string,
  predicate: (RealtimeDeviceData) => boolean,
}

var fuelStatusGroups = [
  {label: 'Low', predicate: (device => (device.latestSample.info.alerts.fuelStatus === 'critical'))},
  {label: 'Less than half', predicate: (device => (device.latestSample.info.alerts.fuelStatus === 'troubled'))},
  {label: 'No issue', predicate: (device => true)}
];

var engineTempStatusGroups = [
  {label: 'Over heated', predicate: (device => (device.latestSample.info.alerts.engineTempStatus === 'critical'))},
  {label: 'High', predicate: (device => (device.latestSample.info.alerts.engineTempStatus === 'troubled'))},
  {label: 'No issue', predicate: (device => true)}
];

@Injectable()
export class CarStatusDataService {
  realtimeDeviceDataProvider: RealtimeDeviceDataProvider;

  constructor(private realtimeDataProviderService: RealtimeDeviceDataProviderService ) {
    this.realtimeDeviceDataProvider = this.realtimeDataProviderService.getProvider();
  }

  getProbe(mo_id: string, nInterval: number = 1): Observable<any> {
    return interval(nInterval * 1000).pipe(startWith(0),
      map(x => {
        this.realtimeDataProviderService.scheduleVehicleDataLoading(mo_id);
        var device = this.realtimeDeviceDataProvider.getDevice(mo_id);
        return device && device.latestSample;
      }));
  }

  private getDevicesByConds(conds: StatusGroup[], nInterval: number = 1): Observable<any> {
    return interval(nInterval * 1000).pipe(startWith(0),
      map(x => {
        let devices = this.realtimeDeviceDataProvider.getDevices();
        let devicesByLabel  = _.groupBy(this.realtimeDeviceDataProvider.getDevices(), device => {
              this.realtimeDataProviderService.scheduleVehicleDataLoading(device.deviceID);
              for(var i=0; i<conds.length; i++){
                if (!conds[i].predicate || conds[i].predicate(device)){
                    return conds[i].label;
                }
              }
              return undefined;
            });
        return devicesByLabel;
      }));
  }

  private getCondsFromType(type: string){
    if(type === 'fuel'){
      return fuelStatusGroups;
    }else if (type === 'engineTemp'){
      return engineTempStatusGroups;
    }
    return null;
  }

  getColumns(type: string, interval = 1): Observable<any[][]>{
    let conds = this.getCondsFromType(type);
    return this.getDevicesByConds(conds, interval)
    .pipe(map(devicesByLabel => {
      var result = [];
      for (var i=0; i<conds.length; i++){
        let label = conds[i].label;
        let devices = devicesByLabel[label];
        result.push([label, (devices ? devices.length : 0) + 0]);
      }
      return result;
    }));
  }

  getDevices(type: string, selection: string, interval = 1): Observable<RealtimeDeviceData[]> {
    let conds = this.getCondsFromType(type);
    return this.getDevicesByConds(conds, interval)
      .pipe(map(devicesByLabel => {
        let r = devicesByLabel[selection];
        console.log('CarStatusDataService is returning ', r);
        return r ? r : [];
      }));
  }
}
