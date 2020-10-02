import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import {
    parseAll,
    runAggregate,
    setObjectValue,
} from '../../../../../../both/functions/common';
import * as funcs from '../../../../../../both/functions/common';
import * as pdfFuncs from '../.././../../../../both/functions/lookupPdf';
import { MeteorObservable } from "meteor-rxjs";
import { Observable } from "rxjs/Observable";
import * as moment from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import * as pdfMake from 'pdfmake/build/pdfmake';
import { UserService } from "../../../../services/UserService";
import { AllCollections } from "../../../../../../both/collections/index";
import { jsonize } from '@ngui/map/dist/services/util';
import { SystemLookup } from "../../../../../../both/models/systemLookup.model";
import { map, switchMap, tap } from "rxjs/operators";
import { concat } from 'rxjs/observable/concat';
import { of } from "rxjs/observable/of";
import { merge } from 'rxjs';
import { pipe } from '@angular/core/src/render3/pipe';

@Component({
    selector: 'executive-agedInvoices',
    template: `
    <mat-card class='fullHeight'>
      <h2 style='margin-top: 0px; float: left;'>Aged Invoices</h2>
      <hr style='clear: both;'>
        <table id='tables' *ngIf='!loading'>
          <tr>
            <th class="rowHead"></th>
            <th class="col">Credit</th>
            <th class="col">Debit</th>
          </tr>
          <tr (click)='changeView(agedInvoiceRanges.current)' class='pointer'>
            <th class="rowHead">Current</th>
            <td class="alignRight">{{agedInvoiceRangeTotals.current.credit | currency:'USD':'symbol':'2.2-2'}}</td>
            <td class="alignRight">{{agedInvoiceRangeTotals.current.debit | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr (click)='changeView(agedInvoiceRanges.range15)' class='pointer'>
            <th class="rowHead">15 Days</th>
            <td class="alignRight">{{agedInvoiceRangeTotals.range15.credit | currency:'USD':'symbol':'2.2-2'}}</td>
            <td class="alignRight">{{agedInvoiceRangeTotals.range15.debit | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr (click)='changeView(agedInvoiceRanges.range30)' class='pointer'>
            <th class="rowHead">30 Days</th>
            <td class="alignRight">{{agedInvoiceRangeTotals.range30.credit | currency:'USD':'symbol':'2.2-2'}}</td>
            <td class="alignRight">{{agedInvoiceRangeTotals.range30.debit | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr (click)='changeView(agedInvoiceRanges.range60)' class='pointer'>
            <th class="rowHead">60 Days</th>
            <td class="alignRight">{{agedInvoiceRangeTotals.range60.credit | currency:'USD':'symbol':'2.2-2'}}</td>
            <td class="alignRight">{{agedInvoiceRangeTotals.range60.debit | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr (click)='changeView(agedInvoiceRanges.range90)' class='pointer'>
            <th class="rowHead">90 Days</th>
            <td class="alignRight">{{agedInvoiceRangeTotals.range90.credit | currency:'USD':'symbol':'2.2-2'}}</td>
            <td class="alignRight">{{agedInvoiceRangeTotals.range90.debit | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
          <tr>
            <th class="rowHead">Total</th>
            <td class="alignRight" style="border-top: 2px solid;">{{totalCreditDebit(agedInvoiceRangeTotals, 'credit') | currency:'USD':'symbol':'2.2-2'}}</td>
            <td class="alignRight" style="border-top: 2px solid;">{{totalCreditDebit(agedInvoiceRangeTotals, 'debit') | currency:'USD':'symbol':'2.2-2'}}</td>
          </tr>
        </table>
        <mat-spinner *ngIf="loading" style="height: 50px; width: 50px; float: left;" [hidden]="" class="app-spinner"></mat-spinner>
    </mat-card>
  `,
    styleUrls: ['../executive-dashboard.page.scss'],
})

export class ExecutiveAgedInvoices implements OnInit {

    @Input() data: any;
    filterConditions: any;
    debitCreditObject = {debit: 0, credit: 0}
    agedInvoiceRanges: any = {
      current: { start: -14 },
      range15: { start: -29, end: -15 },
      range30: {start: -59, end: -30},
      range60: {start: -89, end: -60},
      range90: {end: -90},
    };
    agedInvoiceRangeTotals: any = {
      current: this.debitCreditObject,
      range15: this.debitCreditObject,
      range30: this.debitCreditObject,
      range60: this.debitCreditObject,
      range90: this.debitCreditObject,
    };
    objLocal: any = {};
    loading: boolean = true;
    pdfLoading: boolean = false;
    @Output() rows = new EventEmitter<any>();
    @Output() lookupView = new EventEmitter<any>();

    constructor(private router: Router, private activatedRoute: ActivatedRoute, private userService: UserService) {
    }

    async init() {
      let result = await this.getAgedInvoivesTotals(this.agedInvoiceRanges);
      this.agedInvoiceRangeTotals.current = this.getElement(result, 'current');
      this.agedInvoiceRangeTotals.range15 = this.getElement(result, '15');
      this.agedInvoiceRangeTotals.range30 = this.getElement(result, '30');
      this.agedInvoiceRangeTotals.range60 = this.getElement(result, '60');
      this.agedInvoiceRangeTotals.range90 = this.getElement(result, '90');
      this.loading = false;
    }

    ngOnInit() {
      this.init();
    }

    async getAgedInvoivesTotals(range){
      let invoices = await funcs.agedInvoices(range);
      return invoices['result'];
    }

    getElement(array, _id){
      let index = array.findIndex(obj => obj._id === _id);
      return array[index];
    }

    totalCreditDebit(o, keyValue){
      let sum = 0 
      sum += Object.keys(o).reduce(function (previous, key) {
        return previous + o[key][keyValue];
      }, 0);
      return sum;
    }

    changeView(range) {
      let beginningOfRange = moment().add(range.start, 'day').startOf('day').format();
      let endOfRange = moment().add(range.end, 'day').startOf('day').format();
      let paramObj = {
        lookupName: 'agedInvoices',
        // filterName: 'dateRange',
        // columns: 'dueDate',
        // dueDate_method: '<>',
        // dueDate_value: [beginningOfRange, endOfRange],
      }
      // let dateMatch = {}
      console.log(range, beginningOfRange, endOfRange);
      // if (range.end) {
      //   dateMatch['$gte'] = beginningOfRange;
      // } 
      // if (range.start) {
      //   dateMatch['$lte'] = endOfRange;
      // }


      let lookupData = {};
      lookupData = Object.assign({
        view: 'agedInvoices',
        start: beginningOfRange,
        end: endOfRange
        // queryParams: paramObj,
      }, lookupData);
      this.lookupView.emit(lookupData);
    },

    
}
