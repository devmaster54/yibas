import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { MeteorObservable } from 'meteor-rxjs';

import {trigger, state, style, animate, transition, query} from '@angular/animations';
import { UserGroups } from '../../../../../both/collections/userGroups.collection';
import * as funcs from '../../../../../both/functions/common';
import {concatMap, defaultIfEmpty, delay, filter, map, mergeMap, switchMap} from "rxjs/operators";
import {UserFilter, UserFilterModel} from "../../../../../both/models/userFilter.model";
import {SystemOptionsService} from "../../../services/SystemOptions.service";
import {EventEmitterService} from "../../../services";

@Component({
  selector: 'sidenav',
  templateUrl: 'sidenav.component.html',
  styleUrls: ['sidenav.component.scss'],
  animations: [
    trigger('sidenavState', [
      state('collapse', style({
        backgroundColor: '#eee',
        transform: 'scale(1)'
      })),
      state('expand', style({
        backgroundColor: '#cfd8dc',
        transform: 'scale(1.1)'
      })),
      transition('collapse => expand', animate('100ms ease-in')),
      transition('expand => collapse', animate('100ms ease-out'))
    ])
  ]
})

export class SidenavComponent implements OnInit, OnDestroy {
  menus: any = [];
  subMenus: any;
  selectedMenu: any = {};
  subscriptions: Subscription[] = [];

  constructor(private _router: Router, private systemOptionsService: SystemOptionsService) {}

  ngOnInit() {
    this.getMenus();
    // subscribe to collections to get updated automatically.
  }

  getMenus() {

    let query = {
      name: 'sidenav',
      default: true
    };

    MeteorObservable.subscribe('userGroups', {parentTenantId: Session.get('parentTenantId')}, {}).subscribe();

    this.subscriptions[0] = MeteorObservable.subscribe('systemOptions', query, {}, '').subscribe(() => {
      this.subscriptions[1] = MeteorObservable.autorun().subscribe(async () => {
        // let options = SystemOptions.collection.find({}).fetch();
        let groups =  UserGroups.collection.find().fetch();

        if (Meteor.user()) {
          funcs.consoleLog('menus start ' + Meteor.user().username);
          let parentTenantId = Session.get("parentTenantId");
          if (parentTenantId && parentTenantId != '') {
            this.menus = await funcs.callbackToPromise(MeteorObservable.call('getMenus', Session.get('parentTenantId')));
            funcs.consoleLog('menus end ' + Meteor.user().username);
          }
        }
      });
    });
  }

  getSelectedMenuName() {
    let selectedMenu = this._router.url.split('/');
    if (selectedMenu[1] !== '') {
      return selectedMenu[1];
    } else
      return 'customer';
  }

  onSelect(event) {
  }

  navigateTo(url) {
    let query = {
      url,
      isDefault: true,
      tenantId: Session.get('tenantId'),
    };
    UserFilter._findDefaultFilterByQuery$(query)
      .pipe(
        filter((filter) => !!filter),
        map((filter: UserFilterModel) => new UserFilter(filter)),
        map((filter: UserFilter) => filter._getQueryParams()),
        defaultIfEmpty({})
      )
      .subscribe(queryParams => {
        this._router.navigate([url], {queryParams});
      });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => {
      if (typeof subscription === 'object') {
        // subscription.unsubscribe();
      }
    })
  }
}
