import {Component, OnInit, Input, Output, EventEmitter, ViewChild} from '@angular/core';
import {ActivatedRoute, Router, Params} from '@angular/router';
import * as _ from "underscore";
import moment = require("moment");
import {take} from "rxjs/operators";

@Component({
  selector: 'executive-lookup',
  template: `
    <div *ngIf="data.view && !data.showSecondLookup">
      <filterBox-component (filter)="getFilterConditions($event)" [lookupName]="data.view"></filterBox-component>
      <system-lookup #firstLookup 
                     [lookupName]="data.view" 
                     (onSelected)="select($event)"
                     (onComplete)="onComplete($event)"
                     (emitDataChange)="onDataChange($event)"
                     (tableRows) ='getRows($event)' 
                     [(data)]="data" 
                     [(filterConditions)]="filterConditions"></system-lookup>
    </div>
    <div *ngIf="data.secondLookup && data.showSecondLookup">
      <filterBox-component (filter)="getFilterConditions($event)" [lookupName]="data.secondLookup"></filterBox-component>
      <system-lookup  
                     (onComplete)="onComplete($event)"
                     [lookupName]="data.secondLookup" 
                     (onSelected)="select($event)" 
                     (tableRows) ='getRows($event)' 
                     [(data)]="data" 
                     [(filterConditions)]="filterConditions"></system-lookup>
    </div>
  `,
  styleUrls: ['executive-dashboard.page.scss'],
})
// <filterBox-component(filter)="getFilterConditions($event)"[lookupName] = "'openOrders'" > </filterBox-component>
  // < system - lookup[lookupName]="'openOrders'"(tableRows) = 'getRows($event)'(onSelected) = "select($event)"[(data)] = "data"[(filterConditions)] = "filterConditions" > </system-lookup>
export class ExecutiveLookupPage implements OnInit{

  @Input() data: any;
  filterConditions: any;
  params: any;
  showSecondLookup: boolean = false;
  objLocal: any = {};
  openOrdersReport: any = {};
  openOrdersTotals: any = {};
  lookup: boolean = false;
  // rows: any;
  @Output() rows = new EventEmitter<any>();
  @Output() lookupView = new EventEmitter<any>();
  @Output() lookupDataChange = new EventEmitter<any>();
  @ViewChild('firstLookup') firstLookup;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {}

  ngOnInit() {
    this.activatedRoute.params.subscribe((params: Params) => {
      let data:any = {};
      this.params = params;

      if (params['view']) {
        Object.assign(data, params);

        Object.keys(params).forEach(key => {
          data = _.mapObject(params, function (val, key) {
            if (!isNaN(params[key])) {
              return parseInt(val);
            } else if (key === 'match'){
              return JSON.parse(params['JSONmatch']);
            } else {
              return val;
            }
          });
        });

        switch(params.view) {
          case "convertedQuotesReport":
            data.startOfRange = new Date(data.startOfRange);
            data.endOfRange = new Date(data.endOfRange);

            break;
          case "inventoryVariance":
            data.year = Number(data.year);
            break;
          case "inventory":
            data.yearNumber = Number(data.yearNumber);
            data.monthNumber = Number(data.monthNumber);
            data.priorYearNumber = Number(data.priorYearNumber);
            break;
        }

      } else {
        this.data.view = null;
      }

      this.data = data;

    })
  }

  onDataChange(event){
    if (this.params) {
      event.value.params = this.params;
    }
    event.value.dirtyRows = this.firstLookup._getDirtyRows();
    this.lookupDataChange.emit(event);
  }

  changedKeys(o1, o2) {
    let keys = _.union(_.keys(o1), _.keys(o2));
    return _.filter(keys, function (key) {

      if (!isNaN(o1[key]) || !isNaN(o2[key])) {
        return parseInt(o1[key]) !== parseInt(o2[key]);
      } else {
        return o1[key] !== o2[key];
      }
    })
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
    let route;
    switch (this.data.view) {
      case 'openOrders':
        route = event['_id'] ? event['_id'] : event['value']['_id']
        this.router.navigate(['customers/orders/' + route]);
        break;
      case 'freightReport':
        route = event['_id'] ? event['_id'] : event['value']['_id']
        this.router.navigate(['customers/invoices/' + route]);
        break;
      case 'convertedQuotesReport':
      case 'convertedQuotesReportSummary':
        route = event['_id'] ? event['_id'] : event['value']['_id']
        this.router.navigate(['customers/quotes/' + route]);
        break;
      case 'inventory':
        route = event['_id'] ? event['_id'] : event['value']['_id']
        let lookupData = { 
          view: 'ledgerAccount',
          secondLookup: this.data.secondLookup, 
          ledgerAccountId: route, 
          yearNumber: this.data.yearNumber,
          monthNumber: this.data.monthNumber,
          showSecondLookup: true,
          keys: this.data.keys,
          pageHeader: 'Inventory Valuation > ' + event['value']['description']
        }
      
        this.router.navigate([], { queryParams: lookupData});
        break;
      case 'agedInvoices':
        this.agedInvoices(event);
        break;
      default:
    }
  }

  agedInvoices(event) {
    console.log(event);
    let row = event.value;
    console.log(row);
    let arr = [
      "Invoice #",
      "Due Date",
      "Total"
    ];
    let activities = [];
    let i = 0;
    row.invoices.forEach(invoice => {
      i++;
      activities.push(invoice.number ? invoice.number : '');
      activities.push(invoice.dueDate ? moment(invoice.dueDate).format('MMM, DD, YYYY'): '');
      activities.push(invoice.total ? '$'+invoice.total : '');

    });
    // console.log('~~~', arr, activities);
    row.expandableData = [...arr, ...activities];
    console.log(row);
  }

  onComplete($event) {
    if (this.firstLookup) {
      if (this.firstLookup.isLastPage() && 'totalLogic' in this.firstLookup.lookup) {
        // calculate totals
        this.firstLookup._calculateTotal$()
          .subscribe(result => {
            if (result && result.length > 0) {
              this.firstLookup.addRow(result[0]);
            }
          })
      }
    }
  }
}