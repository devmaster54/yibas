import {Component, ViewChild, OnInit, OnDestroy, HostListener, ElementRef} from '@angular/core';
import { MeteorObservable } from "meteor-rxjs";
import {
  Router,
  ActivatedRoute,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  RouteConfigLoadStart, RouteConfigLoadEnd
} from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { MatSidenavModule } from '@angular/material';

import 'rxjs/add/operator/filter';

import * as funcs from "../../../../both/functions/common";
import {PageResolver} from "../../resolvers/PageResolver";
import {NotificationsService} from "angular2-notifications";
import {EventEmitterService} from "../../services";
import {GlobalVariablesService} from "../../services/GlobalVariables.service";
import {UserGroupsService} from "../../services/UserGroups.service";
import {SystemLogsService} from "../../services/SystemLogs.service";
import {SystemTenantService} from "../../services/SystemTenant.service";
import {UserService} from "../../services/UserService";
import {map, mergeMap, switchMap, tap} from "rxjs/operators";
import {of} from "rxjs";
import {forkJoin} from "rxjs/internal/observable/forkJoin";

@Component({
  selector: 'dashboard',
  templateUrl: 'dashboard.page.html',
  styleUrls: [ 'dashboard.page.scss' ],
})

export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav: MatSidenavModule;

  sub: Subscription;
  isInMaintenance:any = '';
  tenants: any;
  isTestWebsite: boolean = Meteor.settings.public.isTestWebsite;
  selectedCompany: any;
  label: string;
  isCompanyReady: boolean = false;
  placeholder: string = 'Select Your Company';
  pathname: string;
  isDim = false;
  text = '';

  public options = {
    timeOut: 5000,
    lastOnBottom: true,
    clickToClose: true,
    maxLength: 0,
    maxStack: 7,
    showProgressBar: true,
    pauseOnHover: true,
    preventDuplicates: false,
    rtl: false,
    animate: 'scale',
    position: ['bottom', 'right']
  };

  breadcrumbs: Array<Object> = [];
  showFabButton: boolean = true;
  data: any = {
    value: {
      $in: [null, false]
    },
    hidden: true
  };
  mobile: boolean = false;
  isloading = false;

  constructor(private _router: Router, private route: ActivatedRoute, 
              private _service: NotificationsService,
              private eRef: ElementRef,
              private userGroupService: UserGroupsService,
              private  systemLogService: SystemLogsService,
              private systemTenantService: SystemTenantService,
              private userService: UserService
              ) {
    this.mobile = funcs.checkMobile();
    this.systemLogService.loadCurrentUserSystemLog();
  }

  // @HostListener('document:wheel', ['$event'])
  // handleWheelEvent(event) {
  //   if (GlobalVariablesService.scrolling == false) {
  //     event.preventDefault();
  //   }
  // }

  // @HostListener('document:touchmove', ['$event'])
  // onTouchMove(event) {
  //   if (GlobalVariablesService.scrolling == false) {
  //     event.preventDefault();
  //   }
  // }


  test(){
    if (this.mobile) {
      (this.sidenav as any).close();
    }
  }

  hookEvents() {
    this.sub = EventEmitterService.Events.subscribe(res => {
      if (res.componentName == 'dashboard') {
        if (res.name == 'success') {
          this._service.success(
            res.title,
            res.content
          )
        } else if (res.name == 'error') {
          this._service.error(
            res.title,
            res.content
          )
        }
      }
    })
  }

  async ngOnInit() {

    this._router.events.subscribe(event => {
      if (event instanceof RouteConfigLoadStart) {
        this.isloading = true;
      }
      if (event instanceof RouteConfigLoadEnd) {
        this.isloading = false;
      }
    })

    let user = this.userService.currentUser;

    if (this._router.url === '/') {
      if (user.profile['landingUrl']) {
        this._router.navigate([user.profile['landingUrl']])
      } else {
        this._router.navigate(['customers/meetings']); 
      }
    }

    let systemConfig:any = await funcs.callbackToPromise(MeteorObservable.call('findOne', 'systemOptions', {name: 'systemConfig'}));

    if(systemConfig) {
      this.isInMaintenance = systemConfig.value.isInMaintenance;
      let isDeveloper = PageResolver.isDeveloper;
      if (isDeveloper === true) {
        this.isInMaintenance = false;
      }
    } else {
      this.isInMaintenance = false;
    }

    // setTimeout(() => {
    //   this._service.success('test11', 'test');
    //   this._service.success('test11', 'test');
    // }, 3000);
    // UserStatus.startMonitor({
    //   threshold: 60000,
    //   interval: 3000
    // });

    // this.setLandTime();
    // this.router.events.subscribe(event => {
    //   if (event instanceof NavigationEnd) {
    //     if (this.pathname != window.location.pathname) {
    //       // this.setLandTime();
    //     }
    //   }
    // });
    this.hookEvents();
    let subdomain = window.location.host.split('.')[0];

    if (Meteor.userId()) {
      this.tenants = this.systemTenantService.tenants;
      this.selectedCompany = this.tenants.find(_tenant => _tenant._id == Session.get('tenantId') );
      if (this.selectedCompany) {
        this.placeholder = undefined;
      }
    }
  }

  toggleFab(e) {
    setTimeout(() => {
      GlobalVariablesService.scrolling = e;
      this.isDim = !e;
    }, 0);
  }

  onSelect(event) {
    // change tenant, not finished
    Session.set('tenantId', event._id);
  }

  setLandTime() {
    this.pathname = window.location.pathname;
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
