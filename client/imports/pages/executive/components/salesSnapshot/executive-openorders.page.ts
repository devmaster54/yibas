import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {
  parseAll,
  runAggregate,
  setObjectValue,
} from '../../../../../../both/functions/common';
import * as funcs from '../../../../../../both/functions/common';
import * as pdfFuncs from '../../../../../../both/functions/lookupPdf';
import { MeteorObservable } from "meteor-rxjs";
import { Observable } from "rxjs/Observable";
import * as moment from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import * as pdfMake from 'pdfmake/build/pdfmake';
import {UserService} from "../../../../services/UserService";
import { AllCollections } from "../../../../../../both/collections/index";
import { jsonize } from '@ngui/map/dist/services/util';
import {SystemLookup} from "../../../../../../both/models/systemLookup.model";
import { merge } from 'rxjs';

@Component({
  selector: 'executive-openorders',
  template: `
    <mat-card class='fullHeight'>
      <h2 style='margin-top: 0px; float: left;'>Open Orders Totals</h2>
      <span style="float: right; cursor: pointer;">
        <i class="material-icons" (click)="changeView('openOrders')">exit_to_app</i>
        <i class="material-icons" (click)="pdf('openOrdersReport')">picture_as_pdf</i>
      </span>
      <mat-progress-bar *ngIf="pdfLoading" mode="indeterminate"></mat-progress-bar>
      <hr style='clear: both;'>
      <div style="overflow-x:auto;">
        <table id='tables' *ngIf="!loading">
          <tr>
            <th class="rowHead">Today Open Sales</th>
            <td class="alignRight">{{openOrdersTotals.todayTotal | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr>
            <th class="rowHead">Open Sales</th>
            <td class="alignRight">{{openOrdersTotals.openSales | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr>
            <th class="rowHead">This Month</th>
            <td class="alignRight">{{openOrdersTotals.currentMonth | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr>
            <th class="rowHead">Open Backorders</th>
            <td class="alignRight">{{openOrdersTotals.backOrdered | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr>
            <th class="rowHead">Open Future</th>
            <td class="alignRight">{{openOrdersTotals.futureOrders | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
        </table>
        <mat-spinner *ngIf="loading" style="height: 50px; width: 50px; float: left;" [hidden]="" class="app-spinner"></mat-spinner>
      </div>
    </mat-card>
  `,
  styleUrls: ['../executive-dashboard.page.scss'],
})

export class ExecutiveOpenordersPage implements OnInit {

  @Input() data: any;
  filterConditions: any;
  objLocal: any = {};
  openOrdersReport: any = {};
  openOrderData: any = {};
  openOrdersTotals: any = {};
  loading: boolean = true;
  pdfLoading: boolean = false;
  pdfParsedAggregate: any;
  // rows: any;
  @Output() rows = new EventEmitter<any>();
  @Output() lookupView = new EventEmitter<any>();

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private userService: UserService) {
  }

  async init() {
    this.objLocal.parentTenantId = Session.get('parentTenantId');
    this.objLocal.tenantId = Session.get('tenantId');
    this.objLocal.documentId = Meteor.userId();

    // this.data.firstOfMonth = moment().startOf('month').format();
    // this.data.endOfMonth = moment().endOf('month').format();
    this.openOrderData.firstOfMonth = moment().startOf('month').format();
    this.openOrderData.endOfMonth = moment().endOf('month').format();
    //openOrders
    let id
    SystemLookup._GetReferredLookup$(UserService.user, 'openOrders')

      .subscribe(lookup => {
        id = lookup._id;
        this.getOpenOrdersAggregate(lookup._id);
      })
    // let id = await funcs.getReferredLookupId(UserService.user, 'openOrders');

    const sub = MeteorObservable.subscribe('customerOrders', { status: 'Open' });
    const autorun = MeteorObservable.autorun();
    merge(sub, autorun).subscribe(() => {
      // this.data.firstOfMonth = moment().startOf('month').format();
      // this.data.endOfMonth = moment().endOf('month').format();
      this.openOrderData.firstOfMonth = moment().startOf('month').format();
      this.openOrderData.endOfMonth = moment().endOf('month').format();
      
      let result = AllCollections['customerOrders'].collection.find().fetch();
      if (this.openOrdersReport['totals']) {
        this.getOpenOrdersAggregate(id)
      }
    })
  }

  ngOnInit() {
    this.init();
  }

  async getOpenOrdersAggregate(id) {
    let sub = MeteorObservable.call('findOne', 'systemLookups', { _id: id }).subscribe(lookup => {
      this.openOrdersReport['lookup'] = lookup;
      let method = lookup['methods'][0]
      let parsed = parseAll(lookup['methods'][0].args, this.objLocal);
      let totalLogic = parseAll(lookup['totalLogic'], this.objLocal);
      let date;
      if ('datePaths' in method.args[0]) {
        method.args[0].datePaths.forEach(datePath => {
          if (datePath.indexOf('$gte') !== -1) {
            date = this.openOrderData.firstOfMonth
          } else if (datePath.indexOf('$lte') !== -1 || datePath.indexOf('$lt') !== -1) {
            date = this.openOrderData.endOfMonth
          }
          setObjectValue(parsed[0], datePath, new Date(date));
        })
      }

      parsed = this.removeLimitAndSkipAndSort(parsed[0]);
      this.pdfParsedAggregate = parsed;
      let totalAggragate = parsed.concat(totalLogic[0]);
      this.getOpenOrders('customerOrders', parsed, totalAggragate)
    });
  }

  async getOpenOrders(collection, pipeline, totalAggragate) {
    pipeline = this.removeLimitAndSkipAndSort(pipeline)

    let openOrdersTotals = {
      openSales: 0,
      currentMonth: 0,
      backOrdered: 0,
      futureOrders: 0,
      cogs: 0,
      grossProfit: 0,
      grossProfitPercentage: 0,
      orderTotal: 0,
    }
    let index = totalAggragate.findIndex(step => {
        if ('$lookup' in step) {
          return step['$lookup']['from'] === 'customerInvoices'
        }
      }
    );
    totalAggragate.splice(index, 1);
    let totalResults = await runAggregate(collection, totalAggragate);
    let start = moment().startOf('day').format();
    let end = moment().endOf('day').format();
    let todayOpenOrdersTotalPipeline = [
      {
        "$match": {
          "status": "Open",
          "date": {
            "$gte": new Date(start),
            "$lte": new Date(end)
          }
        }
      },
      {
        "$unwind": "$lineItems"
      },
      {
        "$match": {
          "lineItems.total": {
            "$gt": 0
          }
        }
      },
      {
        "$group": {
          "_id": "000",
          "total": {
            "$sum": "$lineItems.total"
          },
        }
      },
    ]

    let todayOpenOrdersTotal = await runAggregate(collection, todayOpenOrdersTotalPipeline);
    if (totalResults['result'].length > 0) {
      openOrdersTotals = totalResults['result'][0];
    }

    this.openOrdersTotals = openOrdersTotals;
    if (todayOpenOrdersTotal['result'].length > 0) {
      this.openOrdersTotals['todayTotal'] = todayOpenOrdersTotal['result'][0].total;
    } else {
      this.openOrdersTotals['todayTotal'] = 0;
    }

    this.openOrdersReport['totals'] = openOrdersTotals;
    this.loading = false;

    // let result = await runAggregate(collection, pipeline);
    // console.log(result);
    // this.openOrdersReport['result'] = result['result'];
  }

  changeView(lookup) {
    let lookupData = this.openOrderData;
    lookupData = Object.assign({
      view: 'openOrders',
      // lookup: 'openOrders',
    }, lookupData);
    this.lookupView.emit(lookupData);
  }

  async pdf(report) {
    this.pdfLoading = true;
    let result = await runAggregate('customerOrders', this.pdfParsedAggregate);
    console.log(result);
    this.openOrdersReport['result'] = result['result'];
    let pdfInfo = this.openOrdersReport;
    let docDefinition: any = await pdfFuncs.reportPdf(pdfInfo, [], []);
    pdfMake.createPdf(docDefinition).open();
    this.pdfLoading = false;
  }

  getFilterConditions(action) {
    this.reducers(action);
  }

  removeLimitAndSkipAndSort(pipeline) {
    let removeValFromIndex = [];
    let arr = pipeline;
    arr.forEach((element, index, object) => {
      if ('$limit' in element || '$skip' in element || '$sort' in element) {
        removeValFromIndex.push(index)
      }
    });
    for (let i = removeValFromIndex.length - 1; i >= 0; i--) {
      arr.splice(removeValFromIndex[i], 1)
    }
    return arr;
  }

  reducers(action) {
    switch (action.type) {
      case 'UPDATE_FILTERCONDITIONS':
        this.filterConditions = action.value;
        return;
      case 'ADD_FILTER':
        this.filterConditions = action.value;
        return;
      default:
        return;
    }
  }

  getRows(rows) {
    this.rows.emit(rows);
  }

  select(event) {
    this.router.navigate(['customers/orders/' + event['_id']]);
    // window.location.href = 'https://app.yibas.com/orders/' + event._id;
  }
}
