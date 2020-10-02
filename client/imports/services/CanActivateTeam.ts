import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, NavigationEnd, Resolve, Router, RouterStateSnapshot} from "@angular/router";
import {Observable} from "rxjs/Observable";
import * as funcs from "../../../both/functions/common";
import {MeteorObservable} from "meteor-rxjs";
import {UserPermissionsService} from "./UserPermissions.service";
import {SystemOptionsService} from "./SystemOptions.service";

@Injectable()
export class CanActivateTeam implements CanActivate {
  constructor(private userPermissionsService: UserPermissionsService,
    private systemOptionsService: SystemOptionsService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean>|Promise<boolean> | boolean{
    // console.log('route', _route.url[0].path, this.systemOptionsService.modulesRoutes, this.userPermissionsService.userPermissions);
    // return new Promise(resolve => {

    //
    //   resolve(true);
    // })
    if (this.userPermissionsService.userPermissions) {
      let modulePermission = this._getModuleRoutePermission(_route);
      if (modulePermission) {
        // console.log('allow access', this.userPermissionsService.userPermissions[modulePermission.permissionId] == 'enabled');
        return this.userPermissionsService.userPermissions[modulePermission.permissionId] == 'enabled';
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  _getModuleRoutePermission( _route) {
    return this.systemOptionsService.modulesRoutes.find(route => route.url === _route.url[0].path);
  }
}