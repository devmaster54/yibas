import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import * as funcs from '../../../../../../both/functions/common';
import * as pdfFuncs from '../../../../../../both/functions/lookupPdf';
import { FormControl } from '@angular/forms';
import { MeteorObservable } from "meteor-rxjs";
import * as moment from 'moment';
import {ActivatedRoute, Router} from '@angular/router';
import { merge } from 'rxjs';
import * as pdfMake from 'pdfmake/build/pdfmake';
import { Observable } from "rxjs/Observable";
import { AllCollections } from "../../../../../../both/collections/index";

@Component({
  selector: 'executive-inventory',
  template: `
    <mat-card class='fullHeight'>
      <h2 style='margin-top: 0px; float: left;'>Inventory Valuation</h2>
      <span style="float: right; cursor: pointer;">
        <i class="material-icons" (click)="changeView('inventory')">exit_to_app</i>
      </span>
      <hr style='clear: both;'>
        <div style="overflow-x:auto;" *ngIf="!loading.borrowingBase && !loading.projectedFutureSales">
          <table id='tables'>
            <tr>
              <th class="rowHead"></th>
              <th class="col">End of Month</th>
              <th class="col">End of Year</th>
            </tr>
            <tr>
              <th class="rowHead">Current Value</th>
                <td style='text-align: center;' colspan="2">{{borrowingBaseTotals.totalInventory | currency:'USD':'symbol':'2.2-2'}}</td>
            </tr>
            <tr>
              <th class="rowHead">Last Year</th>
                <td class='alignRight'>{{borrowingBaseTotals.lastYearEndOfMonthTotal | currency:'USD':'symbol':'2.2-2'}}</td>
                <td class='alignRight'>{{borrowingBaseTotals.priorYearbalance | currency:'USD':'symbol':'2.2-2'}}</td>
            </tr>
            <tr>
              <th class="rowHead">Projected Future Sales</th>
                <td class='alignRight'>{{inventory.projectedFutureSales | currency:'USD':'symbol':'2.2-2'}}</td>
                <td class='alignRight'>{{inventory.projectedFutureSalesEndOfYear | currency:'USD':'symbol':'2.2-2'}}</td>
            </tr>
            <tr>
              <th class="rowHead">Projected Value</th>
                <td class='alignRight'>{{borrowingBaseTotals.totalInventory - inventory.projectedFutureSales | currency:'USD':'symbol':'2.2-2'}}</td>
                <td class='alignRight'>{{borrowingBaseTotals.totalInventory - inventory.projectedFutureSalesEndOfYear | currency:'USD':'symbol':'2.2-2'}}</td>
            </tr>
          </table>

          </div>
          <mat-spinner *ngIf="loading.borrowingBase || loading.projectedFutureSales" style="height: 50px; width: 50px; float: left;" [hidden]="" class="app-spinner"></mat-spinner>
    </mat-card>
  `,
  styleUrls: ['../executive-dashboard.page.scss'],
})

export class ExecutiveInventoryPage implements OnInit{

  @Input() data: any;
  today: any;
  filterConditions: any;
  objLocal: any = {};
  inventoryData: any = {};
  openOrdersReport: any = {};
  openOrdersTotals: any = {};
  loading: any = {
    borrowingBase: true,
    projectedFutureSales: true,
  };
  tableRows = [];
  borrowingBaseTotals: any = {};
  inventory: any = {};
  // rows: any;
  @Output() rows = new EventEmitter<any>();
  @Output() lookupView = new EventEmitter<any>();

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}
  async init() {
    this.objLocal.parentTenantId = Session.get('parentTenantId');
    this.objLocal.tenantId = Session.get('tenantId');
    this.objLocal.documentId = Meteor.userId();

    let query = {
      eligibleInventory: true,
    }
    const sub = MeteorObservable.subscribe('ledgerAccounts', query);
    const autorun = MeteorObservable.autorun();
    merge(sub, autorun).subscribe(() => {
      let result = AllCollections['ledgerAccounts'].collection.find().fetch();
      if (Object.keys(this.borrowingBaseTotals).length > 0 && Object.keys(this.inventory).length) {
        this.getBorrowingBaseAggregate()
        this.projectedFutureSales()
      }
    })
  }

  ngOnInit() {
    this.today = new FormControl(new Date(this.inventoryData.beginningOfDay))
    this.inventoryData.todayMonthLastYear = moment(this.today).utc().startOf('day').subtract(1, 'years').format();
    this.inventoryData.endOfMonthLastYear = moment(this.today).utc().endOf('month').subtract(1, 'years').format();
    this.inventoryData.endOfLastYear = moment().utc().endOf('year').subtract(1, 'years').format();
    this.inventoryData.yearNumber = new Date().getFullYear();
    this.inventoryData.priorYearNumber = new Date().getFullYear() - 1;
    this.inventoryData.monthNumber = new Date().getMonth() + 1;
    this.init();
    this.getBorrowingBaseAggregate()
    this.projectedFutureSales()
  }

  async getBorrowingBaseAggregate() {
    let sub = MeteorObservable.call('aggregate', 'ledgerAccounts', [{ $match: {includeInBorrowingBase: true }}]).subscribe(results => {
      let result = results['result'];
      result.forEach((account) => {
        this.calculateBalanceAddDebit(account);
      });
      this.borrowingBaseTotals = this.getTotals(result);
    });
    this.loading.borrowingBase = false;
  }

  calculateBalanceAddDebit(account) {
    const latestYearBalance = account.totals[account.totals.length - 1];
    const totalCreditAmounts = latestYearBalance.creditAmounts.reduce((a, b) => a + b);
    const totalDebitAmounts = latestYearBalance.debitAmounts.reduce((a, b) => a + b);
    const priorYearBalance = account.totals.length > 1 ? account.totals[account.totals.length - 2] : 0;
    const priortotalCreditAmounts = priorYearBalance ? priorYearBalance.creditAmounts.reduce((a, b) => a + b) : 0.00;
    const priortotalDebitAmounts = priorYearBalance ? priorYearBalance.creditAmounts.reduce((a, b) => a + b) : 0.00;

    const priorYearEndOfMonthCreditAmounts = priorYearBalance ? priorYearBalance.creditAmounts.splice(0, new Date().getMonth() + 1).reduce((a, b) => a + b) : 0.00;
    const priorYearEndOfMonthDebitAmounts = priorYearBalance ? priorYearBalance.debitAmounts.splice(0, new Date().getMonth() + 1).reduce((a, b) => a + b) : 0.00;

    account.latestYearFinalBalance = latestYearBalance.beginningBalance - totalCreditAmounts + totalDebitAmounts;
    account.priorYearFinalBalance = priorYearBalance.beginningBalance - priortotalCreditAmounts + priortotalDebitAmounts;
    account.priorYearEndOfMonthTotalBalance = priorYearBalance.beginningBalance - priorYearEndOfMonthCreditAmounts + priorYearEndOfMonthDebitAmounts;
  }

  getTotals(totals) {
    let borrowingBaseTotals = {
      totalInventory: 0,
      priorYearbalance: 0,
      lastYearEndOfMonthTotal: 0,
    }

    for (var i = 0; i < totals.length; i++) {
      let balance = totals[i].latestYearFinalBalance;
      let priorYearbalance = totals[i].priorYearFinalBalance;
      let priorYearEndOfMonthTotalBalance = totals[i].priorYearEndOfMonthTotalBalance;

      if (totals[i].eligibleInventory) {
        borrowingBaseTotals['totalInventory'] += balance;
        borrowingBaseTotals['priorYearbalance'] += priorYearbalance;
        borrowingBaseTotals['lastYearEndOfMonthTotal'] += priorYearEndOfMonthTotalBalance;
      }
    }

    borrowingBaseTotals['loanValueInventory'] = borrowingBaseTotals['totalInventory'] * .6;
    return borrowingBaseTotals;
  }

  async projectedFutureSales() {
    let lastYearMonthRange = {
      gte: new Date(this.inventoryData.todayMonthLastYear),
      lte: new Date(this.inventoryData.endOfMonthLastYear)
    }
    let projectedFutureSales = await funcs.projectedFutureSales(lastYearMonthRange);
    if (projectedFutureSales['result'][0] !== undefined) {
      this.inventory['projectedFutureSales'] = projectedFutureSales['result'][0].total;
    } else {
      this.inventory['projectedFutureSales'] = 0.00;
    }

    let lastYearMonthRangeEndOfYear = {
      gte: new Date(this.inventoryData.todayMonthLastYear),
      lte: new Date(this.inventoryData.endOfLastYear)
    }
    let projectedFutureSalesEndOfYear = await funcs.projectedFutureSales(lastYearMonthRangeEndOfYear);
    if (projectedFutureSalesEndOfYear['result'][0] !== undefined) {
      this.inventory['projectedFutureSalesEndOfYear'] = projectedFutureSalesEndOfYear['result'][0].total;
    } else {
      this.inventory['projectedFutureSalesEndOfYear'] = 0.00;
    }
    this.loading.projectedFutureSales = false;
  }

  changeView(lookup) {
    let lookupData = this.inventoryData
    lookupData = Object.assign({
      view: 'inventory',
      // lookup: 'inventory',
      secondLookup: 'selectedLedgerAccount'

    }, lookupData);
    this.lookupView.emit(lookupData);
  }    

  pdf(report) {
    let pdfInfo = this.openOrdersReport;
    let docDefinition: any = pdfFuncs.reportPdf(pdfInfo, [], []);
    pdfMake.createPdf(docDefinition).open();
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
    this.rows.emit(rows);
  }

  select(event) {
    this.router.navigate(['customers/orders/' + event['_id']]);
    // window.location.href = 'https://app.yibas.com/orders/' + event._id;
  }
}
