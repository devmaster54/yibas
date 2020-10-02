import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import * as funcs from '../.././../../../../both/functions/common';
import * as moment from 'moment';
import { MeteorObservable } from "meteor-rxjs";
import { Observable } from "rxjs/Observable";
import {ActivatedRoute, Router} from '@angular/router';
import { AllCollections } from "../../../../../../both/collections/index";
import { merge } from 'rxjs';

@Component({
  selector: 'executive-monthlySales',
  template: `
      <mat-card class='fullHeight'>
        <h2>Sales Dashboard (Monthly)</h2>
        <hr>
        <div style="overflow-x:auto;">
          <table id='tables' *ngIf="!loading">
            <tr>
              <th class="rowHead"></th>
              <th *ngFor="let header of horizontalHeadersMonth" class="col">{{header}}</th>
            </tr>
            <tr *ngFor="let row of rows" (click)='changeView(row)' [ngClass]="{pointer: row.sideHeader.title === 'Expenses' || row.sideHeader.title === 'PPV'}">
              <th class="rowHead">{{row.sideHeader.title}}</th>
                <td class='alignRight'>{{row.thisMonth}}</td>
                <td class='alignRight'>{{row.thisMonthLastYear}}</td>
                <td class='alignRight'>{{row.thisWholeMonthLastYear}}</td>
            </tr>
          </table>
          <mat-spinner *ngIf="loading" style="height: 50px; width: 50px; float: left;" [hidden]="" class="app-spinner"></mat-spinner>
        </div>
      </mat-card>
  `,
  styleUrls: ['../executive-dashboard.page.scss'],
})

export class ExecutiveMonthlySalesPage implements OnInit{

  @Input() data: any;
  filterConditions: any;
  objLocal: any = {};
  monthlyIncomeData: any = {};
  loading: boolean = true;
  currentYear: any = moment().format('YYYY');
  lastYear: any = moment().subtract(1, 'years').format('YYYY')
  rows = [];
  horizontalHeadersMonth = [
    moment().format('MMM, YYYY') + ' (To Date)',
    moment().subtract(1, 'years').format('MMM, YYYY') + ' (To Date)',
    moment().subtract(1, 'years').format('MMM, YYYY') + ' (All Month)',
  ];
  // rows: any;
  // @Output() rows = new EventEmitter<any>();
  @Output() lookupView = new EventEmitter<any>();

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}
  async init() {
    this.objLocal.parentTenantId = Session.get('parentTenantId');
    this.objLocal.tenantId = Session.get('tenantId');
    this.objLocal.documentId = Meteor.userId();
    this.monthlyIncomeData.monthIndexMonthly = moment().month();
    this.monthlyIncomeData.pastYearMonthly = parseInt(this.lastYear);
    this.monthlyIncomeData.currentYearMonthly = parseInt(this.currentYear);

    let query = {
      status: 'open',
      date: {
        $gte: new Date(moment().startOf('month').format()),
        $lte: new Date()
      }
    }
    const sub = MeteorObservable.subscribe('customerInvoices', query);
    const autorun = MeteorObservable.autorun();
    merge(sub, autorun).subscribe(() => {
      let result = AllCollections['customerInvoices'].collection.find().fetch();
      if (this.rows.length > 0) {
        this.getSalesDashBoardInfo();
      }
    })
  }

  ngOnInit() {
    this.init();
    this.getSalesDashBoardInfo();
  }   

  async getSalesDashBoardInfo() {
    let sales = {};
    let cost = {};
    let invoices = {};
    let profit = {};
    let profitPercent = {};
    let expenses = {};
    let netIncome = {};
    let ppv = {};
    let rows = [
      sales, cost, profit, profitPercent, invoices, expenses, netIncome, ppv
    ]
    let currentMonthRange = {
      gte: new Date(moment().startOf('month').format()),
      lte: new Date()
    }
    let lastYearMonthRange = {
      gte: new Date(moment().startOf('month').subtract(1, 'years').format()),
      lte: new Date(moment().subtract(1, 'years').format())
    }
    let lastYearWholeMonthRange = {
      gte: new Date(moment().startOf('month').subtract(1, 'years').format()),
      lte: new Date(moment().endOf('month').subtract(1, 'years').format())
    }

    sales['sideHeader'] = { title: 'Sales', type: 'dollar' };
    sales['thisMonth'] = await funcs.getTotalMonthSales(currentMonthRange);
    sales['thisMonthLastYear'] = await funcs.getTotalMonthSales(lastYearMonthRange);
    sales['thisWholeMonthLastYear'] = await funcs.getTotalMonthSales(lastYearWholeMonthRange);

    cost['sideHeader'] = { title: 'Cost', type: 'dollar' };
    cost['thisMonth'] = await funcs.getTotalMonthCost(currentMonthRange);
    cost['thisMonthLastYear'] = await funcs.getTotalMonthCost(lastYearMonthRange);
    cost['thisWholeMonthLastYear'] = await funcs.getTotalMonthCost(lastYearWholeMonthRange);

    invoices['sideHeader'] = { title: 'Invoices', type: 'number' };
    invoices['thisMonth'] = await funcs.countInvoices(currentMonthRange);
    invoices['thisMonthLastYear'] = await funcs.countInvoices(lastYearMonthRange);
    invoices['thisWholeMonthLastYear'] = await funcs.countInvoices(lastYearWholeMonthRange);

    expenses['sideHeader'] = { title: 'Expenses', type: 'dollar' };
    expenses['thisMonth'] = await funcs.getExpenses(this.currentYear, moment().month(), 1);
    expenses['thisMonthLastYear'] = await funcs.getExpenses(this.lastYear, moment().month(), 1);
    expenses['thisWholeMonthLastYear'] = await funcs.getExpenses(this.lastYear, moment().month(), 1);

    ppv['sideHeader'] = { title: 'PPV', type: 'dollar' };
    ppv['thisMonth'] = await funcs.ppv(this.currentYear, moment().month(), 1);
    ppv['thisMonthLastYear'] = await funcs.ppv(this.lastYear, moment().month(), 1);
    ppv['thisWholeMonthLastYear'] = await funcs.ppv(this.lastYear, moment().month(), 1);

    rows.forEach(element => {
      this.fixObject(element);
    });

    profit['sideHeader'] = { title: 'Profit', type: 'dollar' };
    profit['thisMonth'] = sales['thisMonth'] - cost['thisMonth'];
    profit['thisMonthLastYear'] = sales['thisMonthLastYear'] - cost['thisMonthLastYear'];
    profit['thisWholeMonthLastYear'] = sales['thisWholeMonthLastYear'] - cost['thisWholeMonthLastYear'];

    profitPercent['sideHeader'] = { title: 'Profit %', type: 'percent' };
    profitPercent['thisMonth'] = (profit['thisMonth'] / sales['thisMonth'] * 100);
    profitPercent['thisMonthLastYear'] = (profit['thisMonthLastYear'] / sales['thisMonthLastYear'] * 100);
    profitPercent['thisWholeMonthLastYear'] = (profit['thisWholeMonthLastYear'] / sales['thisWholeMonthLastYear'] * 100);

    netIncome['sideHeader'] = { title: 'Net Income', type: 'dollar' };
    netIncome['thisMonth'] = (profit['thisMonth'] - expenses['thisMonth']);
    netIncome['thisMonthLastYear'] = (profit['thisMonthLastYear'] - expenses['thisMonthLastYear']);
    netIncome['thisWholeMonthLastYear'] = (profit['thisWholeMonthLastYear'] - expenses['thisWholeMonthLastYear']);

    this.rows = rows;
    this.formatRows(rows);
  }

  fixObject(obj) {
    Object.keys(obj).forEach(function (key) {
      if (obj[key]['result']) {
        if (obj[key]['result'].length > 0) {
          if (obj[key]['result'][0]['total'] || obj[key]['result'][0]['total'] === 0) {
            obj[key] = obj[key]['result'][0]['total'] !== 0 ? obj[key]['result'][0]['total'] : 0.00;
          } else if (obj[key]['result'][0]['count'] || obj[key]['result'][0]['count'] === 0) {
            obj[key] = obj[key]['result'][0]['count'] !== 0 ? obj[key]['result'][0]['count'] : 0.00;
          }
        } else {
          obj[key] = 0.00;
        }
      }
    })
  }

  formatRows(rowArr) {
    for (var i = 0; i < rowArr.length; i++) {
      let obj = rowArr[i];
      let type = obj.sideHeader.type;
      Object.keys(obj).forEach(function (key) {
        if (key !== 'sideHeader') {
          switch (type) {
            case 'dollar':
              obj[key] = '$' + obj[key].toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
              break;
            case 'percent':
              obj[key] = isNaN(obj[key]) ? '0.00%' : obj[key].toFixed(2) + '%';
              break;
            default:
              obj[key] = obj[key]
          }
        }
      })
    }
    this.loading = false;
  }

  changeView(row) {
    if (row.sideHeader.title === 'Expenses' || row.sideHeader.title === 'PPV') {
      let lookupData = this.monthlyIncomeData
      let view
      switch (row.sideHeader.title) {
        case 'Expenses':
          view = {
            view: 'monthlyExpenses',
          }
          break;
        case 'PPV':
          view = {
            view: 'monthlyPPV',
          }
          break;
        default:
          
      }
      lookupData = Object.assign(view, lookupData);
      this.lookupView.emit(lookupData);
    }
  }

  getFilterConditions(action) {
    this.reducers(action);
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
    // console.log(rows);
    // this.rows.emit(rows);
  }

  select(event) {
    this.router.navigate(['customers/orders/' + event['_id']]);
    // window.location.href = 'https://app.yibas.com/orders/' + event._id;
  }
}
