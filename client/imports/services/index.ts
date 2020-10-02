import {EventEmitterService} from "./EventEmitter.service";
import {ObservablesService} from "./Observables.service";
// import {GroupsPermissionsService} from "./GroupsPermissions.service";
import {GlobalVariablesService} from "./GlobalVariables.service";
import {CanActivateDashboard} from "./CanActivateDashboard";
import {CanActivateTeam} from "./CanActivateTeam";

export const SERVICE_PROVIDERS = [
  EventEmitterService,
  ObservablesService,
  // GroupsPermissionsService,
  GlobalVariablesService,
  CanActivateTeam,
  CanActivateDashboard
];

export {
  EventEmitterService,
  ObservablesService,
  // GroupsPermissionsService,
  GlobalVariablesService,
  CanActivateTeam,
  CanActivateDashboard

}