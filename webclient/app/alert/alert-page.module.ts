/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the IBM License, a copy of which may be obtained at:
 *
 * http://www14.software.ibm.com/cgi-bin/weblap/lap.pl?li_formnum=L-DDIN-AHKPKY&popup=n&title=IBM%20IoT%20for%20Automotive%20Sample%20Starter%20Apps%20%28Android-Mobile%20and%20Server-all%29
 *
 * You may not use this file except in compliance with the license.
 */
import { NgModule }       from '@angular/core';
import { BrowserModule }  from '@angular/platform-browser';
import { FormsModule }    from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpModule }    from '@angular/http';

import { UtilsModule } from '../utils/utils.module';

import { AlertListComponent } from './alert-list/alert-list.component';
import { AlertPageComponent } from './alert-page.component';
import { routing } from './alert-page.routing';

@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule,
    UtilsModule,
    routing
  ],
  declarations: [
    AlertListComponent,
    AlertPageComponent,
  ],
  exports: [
    AlertPageComponent,
  ],
  providers: []
})
export class AlertPageModule {}
