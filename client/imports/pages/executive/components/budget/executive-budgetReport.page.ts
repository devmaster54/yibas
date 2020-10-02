import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ViewEncapsulation } from '@angular/core';
import * as funcs from '../../../../../../both/functions/common';
import * as pdfFuncs from '../../../../../../both/functions/lookupPdf';
import { MeteorObservable } from "meteor-rxjs";
import { Observable } from "rxjs/Observable";
import * as moment from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import * as pdfMake from 'pdfmake/build/pdfmake';
import { UserService } from "../../../../services/UserService";
import { AllCollections } from "../.././../../../../both/collections/index";
import { SystemLookup } from "../../../../../../both/models/systemLookup.model";
import { findIndex } from 'rxjs/internal/operators/findIndex';
import * as XLSX from 'xlsx';
type AOA = any[][];

@Component({
  selector: 'executive-budgetReport',
  template: `
    <mat-card class='fullHeight'>
      <h2 style='margin-top: 0px; float: left;'>Budget</h2>
      <span style="float: right; cursor: pointer;">
        <i class="material-icons" (click)="openFileBrowser('')">attach_file</i>
        <i class="material-icons" (click)='changeView()'>exit_to_app</i>
      </span>
      <input [hidden]='true' #fileInput id='fileInput' type="file" (change)="onFileChange($event)" multiple="false" />
      <span id='dashboardHeaderElement'>
        <mat-form-field style='margin-top: 0px; float: right; width: 15%;'>
          <mat-select #categoryInput placeholder="Category" (selectionChange)='onChange($event.value, "category")' [(value)]="defaultCategoriesOfAccounts"
            multiple>
            <span (mouseleave)="closeInput($event, 'categoryInput')">
              <button style='width: 100%' mat-raised-button class="mat-primary fill text-sm" (click)='onChange(allCategoriesOfAccounts.length > defaultCategoriesOfAccounts.length ? allCategoriesOfAccounts : [], "category")'>
                {{allCategoriesOfAccounts.length > defaultCategoriesOfAccounts.length ? 'Select All' : 'Deselect All'}}
              </button>
              <mat-option *ngFor="let category of allCategoriesOfAccounts" [value]="category">{{category}}</mat-option>
            </span>
          </mat-select>
        </mat-form-field>
        <mat-form-field style='margin-top: 0px; padding: 0px 10px 0px 0px; float: right; width: 15%;'>
          <mat-select #dataInput placeholder="Chart Data" (selectionChange)='onChange($event.value, "chart")' [(value)]="defaultData"
            multiple>
            <span (mouseleave)="closeInput($event, 'dataInput')">
              <button style='width: 100%' mat-raised-button class="mat-primary fill text-sm" (click)='onChange(allData.length > defaultData.length ? allData : [], "chart")'>
                {{allData.length > defaultData.length ? 'Select All' : 'Deselect All'}}
              </button>
              <mat-option *ngFor="let data of allData" [value]="data">{{data}}</mat-option>
            </span>
          </mat-select>
        </mat-form-field>
        <mat-form-field style='margin-top: 0px; padding: 0px 10px 0px 0px; float: right; width: 15%;'>
          <mat-select #salesPeopleInput placeholder="Salesperson" (selectionChange)='onChange($event.value, "salesperson")' [(value)]="selectedSales"
            [disabled]="notOnlyRevenue" multiple>
            <span (mouseleave)="closeInput($event, 'salesPeopleInput')">
              <button style='width: 100%' mat-raised-button class="mat-primary fill text-sm" (click)='onChange(salesPeople.length > selectedSales.length ? arrayFromArrOfObj(salesPeople, "_id") : [], "salesperson")'>
                {{salesPeople.length > selectedSales.length ? 'Select All' : 'Deselect All'}}
              </button>
              <mat-option *ngFor="let salesperson of salesPeople" [value]="salesperson._id">
                {{salesperson.name}}
              </mat-option>
            </span>
          </mat-select>
        </mat-form-field>
        <mat-form-field style='margin-top: 0px; padding: 0px 10px 0px 0px; float: right; width: 15%;'>
          <mat-select #productLineInput placeholder="Product Line" (selectionChange)='onChange($event.value, "productLine")' [(value)]="selectedCategories"
            [disabled]="notOnlyRevenue" multiple>
            <span (mouseleave)="closeInput($event, 'productLineInput')">
              <button style='width: 100%' mat-raised-button class="mat-primary fill text-sm" (click)='onChange(categories.length > selectedCategories.length ? arrayFromArrOfObj(categories, "_id") : [], "productLine")'>
                {{categories.length > selectedCategories.length ? 'Select All' : 'Deselect All'}}
              </button>
              <mat-option *ngFor="let category of categories" [value]="category._id">{{category.name}}</mat-option>
            </span>
          </mat-select>
        </mat-form-field>
      </span>
      <mat-progress-bar *ngIf='insertLoading > 0' mode="determinate" [value]="insertLoading"></mat-progress-bar>
      <hr style='clear: both;'>
      <div fxLayout="row" fxLayout.xs="column" fxLayout.sm="column">
        <div class="chart-container" fxFlex="64.5" fxLayout="column" fxLayoutAlign="space-around">
          <span *ngIf="!loading" style="margin: 0; height: 45vh; width: 100%;">
            <canvas baseChart width="400" height="400" [datasets]="lineChartData" [labels]="lineChartLabels" [options]="lineChartOptions"
              [colors]="lineChartColors" [legend]="lineChartLegend" [chartType]="lineChartType" (chartHover)="chartHovered($event)"
              (chartClick)="chartClicked($event)">
            </canvas>
          </span>
          <mat-spinner *ngIf="loading" style="height: 50px; width: 50px; float: left;" [hidden]="" class="app-spinner"></mat-spinner>
        </div>
        <div fxFlex="34.5" fxLayout="column" fxLayoutAlign="space-between">
          <span>
            <h3 style="text-align: center"><span [matMenuTriggerFor]="menu">{{formatMonthName(month)}} Sales</span></h3>
            <mat-menu class='menuElement' #menu="matMenu">
            <button mat-menu-item *ngFor="let month of lineChartLabels; let i = index" (click)='monthChange(i)'>{{formatMonthName(i)}}</button>
            </mat-menu>
            <div style="float: left">
              <span *ngIf="includes(defaultData, 'Budget')">Budget:
                <strong>{{getTotal('Budget', month, month + 1) | currency:'USD':'symbol':'2.2-2'}}</strong>
                <br>
              </span>
              <span *ngIf="includes(defaultData, 'Actual')">Actual:
                <strong>{{getTotal('Actual', month, month + 1) | currency:'USD':'symbol':'2.2-2'}}</strong>
                <br>
              </span>
              <span *ngIf="includes(defaultData, 'Prior')">Prior:
                <strong>{{getTotal('Prior', month, month + 1) | currency:'USD':'symbol':'2.2-2'}}</strong>
              </span>
            </div>
            <div *ngIf='defaultData.length > 1' [ngStyle.xs]="{'font-size': '1.5em'}" [ngStyle.sm]="{'font-size': '1.5em'}" style="float: right; text-align: right;" [style.color]="getPercentChange(defaultData, month,  month + 1) < 0 ? 'red' : 'green'">
              <span style="font-size: 2em;">{{getPlusOrMinus(defaultData, month, month + 1) | currency:'USD':'symbol':'2.2-2'}}</span><br>
              <span style="font-size: 1.7em;">{{getPercentChange(defaultData, month, month + 1) | percent:'1.1-2'}}</span>
            </div>
            <br>
            <br>

            <h3 style="text-align: center; clear: both">YTD Sales</h3>
            <div style="float: left">
              <span *ngIf="includes(defaultData, 'Budget')">Budget:
                <strong>{{getTotal('Budget', 0, actualMonth + 1) | currency:'USD':'symbol':'2.2-2'}}</strong>
                <br>
              </span>
              <span *ngIf="includes(defaultData, 'Actual')">Actual:
                <strong>{{getTotal('Actual', 0, actualMonth + 1) | currency:'USD':'symbol':'2.2-2'}}</strong>
                <br>
              </span>
              <span *ngIf="includes(defaultData, 'Prior')">Prior:
                <strong>{{getTotal('Prior', 0, actualMonth + 1) | currency:'USD':'symbol':'2.2-2'}}</strong>
              </span>
            </div>
            <div *ngIf='defaultData.length > 1' [ngStyle.xs]="{'font-size': '1.5em'}" [ngStyle.sm]="{'font-size': '1.5em'}" style="float: right; text-align: right;" [style.color]="getPercentChange(defaultData, 0, actualMonth + 1) < 0 ? 'red' : 'green'">
              <span style="font-size: 2em;">{{getPlusOrMinus(defaultData, 0, actualMonth + 1) | currency:'USD':'symbol':'2.2-2'}}</span><br>
              <span style="font-size: 1.7em;">{{getPercentChange(defaultData, 0, actualMonth + 1) | percent:'1.1-2'}}</span>
            </div>

            <h3 style="text-align: center; clear: both">Total Sales</h3>
            <div style="float: left">
              <span *ngIf="includes(defaultData, 'Budget')">Budget:
                <strong>{{getTotal('Budget', 0, 12) | currency:'USD':'symbol':'2.2-2'}}</strong>
                <br>
              </span>
              <span *ngIf="includes(defaultData, 'Actual')">Actual:
                <strong>{{getTotal('Actual', 0, 12) | currency:'USD':'symbol':'2.2-2'}}</strong>
                <br>
              </span>
              <span *ngIf="includes(defaultData, 'Prior')">Prior:
                <strong>{{getTotal('Prior', 0, 12) | currency:'USD':'symbol':'2.2-2'}}</strong>
              </span>
            </div>
            <div *ngIf='defaultData.length > 1' [ngStyle.xs]="{'font-size': '1.5em'}" [ngStyle.sm]="{'font-size': '1.5em'}" style="float: right; text-align: right;" [style.color]="getPercentChange(defaultData, 0, 12) < 0 ? 'red' : 'green'">
              <span style="font-size: 2em;">{{getPlusOrMinus(defaultData, 0, 12) | currency:'USD':'symbol':'2.2-2'}}</span><br>
              <span style="font-size: 1.7em;">{{getPercentChange(defaultData, 0, 12) | percent:'1.1-2'}}</span>
            </div>
          </span>
        </div>
      </div>
    </mat-card>
  `,
  styleUrls: ['../executive-dashboard.page.scss'],
})

export class ExecutiveBudgetReport implements OnInit {

  @Input() data: any;
  @ViewChild('salesPeopleInput') salesPeopleInput;
  @ViewChild('productLineInput') productLineInput;
  @ViewChild('categoryInput') categoryInput;
  @ViewChild('dataInput') dataInput;
  @ViewChild('fileInput') fileInput: HTMLElement;
  
  filterConditions: any;
  objLocal: any = {};
  budgetObj: any = {};
  toggle: any = false;
  loading: any = true;
  insertLoading: any = 0;
  defaultData: any = ['Budget', 'Actual', 'Prior'];
  allData: any = ['Budget', 'Actual', 'Prior'];
  defaultCategoriesOfAccounts: any = ['Revenue'];
  allCategoriesOfAccounts: any = ['Cost of Sales', 'Expenses', 'Revenue'];
  categories: Array<any> = [];
  selectedCategories: Array<any> = [];
  salesPeople: Array<any> = [];
  selectedSales: Array<any> = [];
  notOnlyRevenue: any = false;
  allCategories: any;
  categoriesOnBudget: any;
  month = moment().month();
  actualMonth = moment().month();
  thisYear = moment().year();
  thisYearRange: any = {
    $gte: new Date(moment().startOf('year').format()),
    $lte: new Date()
  };
  lastYearRange: any = {
    $gte: new Date(moment().startOf('year').subtract(1, 'years').format()),
    $lte: new Date(moment().subtract(1, 'years').format())
  };

  lineChartData: Array<any> = [
    {data: [], label:''}
  ];
  lineChartLabels: Array<any> = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  lineChartOptions: any = {
    responsive: true, 
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10
      }
    },
    elements: {
      line: {
        tension: 0
      }
    },
    tooltips: {
      callbacks: {
        label: function (tooltipItem, data) {
          tooltipItem.yLabel = (Math.round(tooltipItem.yLabel * 100) / 100).toFixed(2);
          return '$' + tooltipItem.yLabel.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
      }
    },
    scales: {
      yAxes: [{
        ticks: {
          callback: function (value, index, values) {
            let base = Math.floor(Math.log(Math.abs(value)) / Math.log(1000));
            let suffix = 'kmb'[base - 1];
            return suffix ? String(value / Math.pow(1000, base)).substring(0, 3) + suffix : value;
          }
        }
      }]
    }
  };
  lineChartColors: Array<any> = [
    { // blue
      backgroundColor: 'rgba(13, 213, 252,0.2)',
      borderColor: 'rgba(13, 213, 252,1)',
      pointBackgroundColor: 'rgba(13, 213, 252,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(13, 213, 252,0.8)'
    },
    { // green
      backgroundColor: 'rgba(13, 253, 113,0.2)',
      borderColor: 'rgba(13, 253, 113,1)',
      pointBackgroundColor: 'rgba(13, 253, 113,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(13, 253, 113,1)'
    },
    { // orange
      backgroundColor: 'rgba(255, 131, 0,0.2)',
      borderColor: 'rgba(255, 131, 0,1)',
      pointBackgroundColor: 'rgba(255, 131, 0,1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(255, 131, 0,1)'
    },
  ];
  lineChartLegend: boolean = true;
  lineChartType: string = 'line';


  @Output() rows = new EventEmitter<any>();
  @Output() lookupView = new EventEmitter<any>();

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private userService: UserService) {
  }

  emittedFunction(event){
    let value = event.value;
    let userId = event.value.params.userId;
    let arr = [{
      ledgerId: value.row._id,
      creditAmounts: this.buildArr(value.row),
    }]

    this.update(arr, userId);
  }
  async init() {
    this.loading = true;
    this.lineChartData = [];
    if (this.defaultData.includes('Budget')){
      await this.budgetFunc(this.defaultCategoriesOfAccounts, this.thisYear, 'Budget');
    }
    if (this.defaultData.includes('Actual')){
      await this.acutalFunc(this.thisYear, this.month ,'Actual');
    }
    if (this.defaultData.includes('Prior')){
      await this.priorFunc(this.thisYear - 1, 12 ,'Prior');
    }

    this.loading = false;
  }

  async ngOnInit() {
    this.getSalesPeople();
    this.getProductLines();
    this.allCategories = await funcs.find('categories', {}, {});
    this.init();
  }

  async budgetFunc(categoryArr, year, label?){
    let thisYearBudget: any
    
    if (this.selectedCategories.length > 0) {
      let ledgerIds = [];
      this.selectedCategories.map(category => {
        let index = this.categories.findIndex(cat => cat._id === category);
        let element = this.categories[index];
        ledgerIds.push(element.ledgerId)
      })
      thisYearBudget = await this.getGLAccountTotalForYear({ "_id": { $in: ledgerIds } }, year).catch(error => console.log(error));
    } else {
      thisYearBudget = await this.getGLAccountTotalForYear({ "category": {$in: categoryArr}}, year).catch(error => console.log(error));
    }
    
    thisYearBudget = thisYearBudget['result'][0] ? thisYearBudget['result'][0] : 0;
    delete thisYearBudget['_id'];
    if (this.defaultCategoriesOfAccounts.includes('Expenses') || this.defaultCategoriesOfAccounts.includes('Cost of Sales')) {
      thisYearBudget = this.swapValues(thisYearBudget);
    }

    let thisYearBudgetArr = Object.keys(thisYearBudget).map(key => thisYearBudget[key]);

    return this.lineChartData.push({ data: thisYearBudgetArr, label: label })
  }

  async acutalFunc(year, numberOfMonths, label?){
    let actualSalesObj: any = await this.getActualTotals(year, numberOfMonths);
    let actualSalesArr = Object.keys(actualSalesObj).map(key => actualSalesObj[key]);

    return this.lineChartData.push({ data: actualSalesArr, label: label })
  }

  async priorFunc(year, numberOfMonths, label?){
    return await this.acutalFunc(this.thisYear - 1, 12, 'Prior');
  }

  async getActualTotals(year, numberOfMonths) {
    let yearSalesObj = {}, expGL: any, cos: any

    if (this.defaultCategoriesOfAccounts.includes('Expenses')){
      expGL = await this.getGLAccountTotalForYear({ "category": { $in: ['Expenses'] } }, year, true).catch(error => console.log(error));
      expGL = expGL['result'][0] ? expGL['result'][0] : 0;
      expGL = this.swapValues(expGL);
    }
    if (this.defaultCategoriesOfAccounts.includes('Cost of Sales')){
      cos = await this.getGLAccountTotalForYear({ "category": { $in: ['Cost of Sales'] } } , year, true).catch(error => console.log(error));
      cos = cos['result'][0] ? cos['result'][0] : 0;
      cos = this.swapValues(cos);
    }

    for (let i = 0; i < 12; i++) {
      let res, range, total = 0, obj = {};
      if (numberOfMonths >= i) {
        range = {
          $gte: new Date(moment((i + 1).toString() + ' ' + year.toString(), 'M YYYY').startOf('month').format()),
          $lte: new Date(moment((i + 1).toString() + ' ' + year.toString(), 'M YYYY').endOf('month').format())
        }
        if (this.defaultCategoriesOfAccounts.includes('Revenue')) {
          if (this.defaultCategoriesOfAccounts.length === 1 && this.selectedSales.length > 0){
            // console.log('SALES PEOPLE');
            res = await this.getTotalSalespersonSalesInquiry(range, this.selectedSales, this.selectedCategories).catch(error => console.log(error));
            obj['total'] = res['result'].length > 0 ? res['result'][0].salesPersonTotal : 0;
          } else {
            res = await this.getTotalSales(range, this.selectedCategories).catch(error => console.log(error));
            obj = res['result'].length > 0 ? res['result'][0] : 0;
          }
        }
        // console.log('~~~', cos, obj['total']);
        if (this.defaultCategoriesOfAccounts.length === 1) {
          switch (this.defaultCategoriesOfAccounts[0]) {
            case 'Revenue':
              res = obj ? Math.abs(obj['total']) : 0;

              break;
            case 'Cost of Sales':
              res = obj ? Math.abs(cos[i.toString()]) : 0;

              break;
            case 'Expenses':
              res = obj ? Math.abs(expGL[i.toString()]) : 0;

              break;
            default:

          }
        } else if (this.defaultCategoriesOfAccounts.length > 1) {
          if (this.defaultCategoriesOfAccounts.includes('Revenue')) {
            total += obj['total'];
          }
          if (this.defaultCategoriesOfAccounts.includes('Cost of Sales')) {
            total -= cos[i.toString()];
          }
          if (this.defaultCategoriesOfAccounts.includes('Expenses')) {
            total -= expGL[i.toString()];
          }
          res = total;
        } else if (this.defaultCategoriesOfAccounts.length === 3) {
          // console.log(expGL);
        }

      }
      yearSalesObj[i] = res ? res : 0;
    }
    return yearSalesObj;
  }

  getPercentChange(arrOfData, rangeStart, rangeEnd){
    let options = {};
    let numerator, denominator;
    //determine numerator
    numerator = this.includes(arrOfData, 'Budget') ? 'Budget' : 'Prior';
    //determine denominator
    denominator = this.includes(arrOfData, 'Actual') ? 'Actual' : 'Prior';

    options = {
      numerator: this.getTotal(numerator, rangeStart, rangeEnd),
      denominator: this.getTotal(denominator, rangeStart, rangeEnd)
    }

    return funcs.percentChange(options);
  }

  getPlusOrMinus(arrOfData, rangeStart, rangeEnd){
    let n, d;
    //determine n
    n = this.includes(arrOfData, 'Budget') ? 'Budget' : 'Prior';
    //determine d
    d = this.includes(arrOfData, 'Actual') ? 'Actual' : 'Prior';

    n = this.getTotal(n, rangeStart, rangeEnd);
    d = this.getTotal(d, rangeStart, rangeEnd);
    
    return n > d ? d - n : (n - d) * -1;
  }

  reduceArr(arr, start, end){
    let slicedArr = arr.slice(start, end);
    let sum = slicedArr.reduce(function (accumulator, currentValue) {
      return accumulator + currentValue;
    }, 0)
    return sum;
  }

  swapValues(obj){
    for (let month in obj) {
      obj[month] = Math.abs(obj[month])
    }
    return obj;
  }

  includes(arr, element){
    return arr.includes(element) ? true : false;
  }

  formatMonthName(month){
    return moment(month + 1, 'M').startOf('month').format('MMMM')
  }

  arrayFromArrOfObj(arrOfObj, key){
    let arr = [];
    for (var i = 0; i < arrOfObj.length; i++) {
      let element = arrOfObj[i];
      arr.push(element[key])
    }
    return arr;
  }

  async getSalesPeople() {
    let salesPeopleArr = await funcs.salesPeople({});
    this.salesPeople = salesPeopleArr['result'];
  }

  async getTotalSalespersonSalesInquiry(dateRange, salesIds, productLine) {
    let match = {
      'type': {
        $in: ['standard', 'credit memo']
      },
      'status': 'complete',
      'date': dateRange,
    }

    return await funcs.getTotalSalespersonSalesInquiry(match, salesIds, productLine);
  }
  
  onChange(event, selectName) {
    this.notOnlyRevenue = (this.defaultCategoriesOfAccounts.length !== 1 || this.defaultCategoriesOfAccounts[0] !== 'Revenue') ? true : false;
    if (this.notOnlyRevenue){
      this.selectedSales = []
    }

    switch (selectName) {
      case 'category':
        this.defaultCategoriesOfAccounts = event;
        break;
      case 'chart':
        this.defaultData = event;
        break;
      case 'salesperson':
        this.selectedSales = event;
        break;
      case 'productLine':
        this.selectedCategories = event;
        break;
      default:
    }
    this.init();
  }

  async getProductLines(){
    let pipeline = [
      {
        "$match": {
          "category": {
            "$in": [
              "Revenue"
            ]
          }
        }
      },
      {
        "$project": {
          "_id": 1,
          "number": 1,
          "description": 1,
          "category": 1
        }
      },
      {
        "$lookup": {
          "from": "categories",
          "let": {
            "ledgerId": "$_id"
          },
          "pipeline": [
            {
              "$match": {
                "$expr": {
                  "$eq": [
                    "$$ledgerId",
                    "$salesAccountId"
                  ]
                }
              }
            },
            {
              "$sort": {
                "name": 1
              }
            },
            {
              "$match": {
                "description": {
                  "$gt": ""
                }
              }
            },
            {
              "$group": {
                "_id": "$salesAccountId",
                'categoryId': { '$first': '$_id' },
                "number": {
                  "$first": {
                    "$concat": [
                      "$name",
                      " - ",
                      "$description"
                    ]
                  }
                }
              }
            }
          ],
          "as": "category"
        }
      },
      {
        "$unwind": "$category"
      },
      {
        "$project": {
          "_id": '$category.categoryId',
          "name": "$category.number",
          "ledgerId": "$_id"
        }
      },
      {
        "$sort": {
          "name": 1
        }
      }
    ];

    let categories = await funcs.runAggregate('ledgerAccounts', pipeline);
    this.categories = categories['result'];
  }

  async getTotalSales(dateRange, productLine) {
    let match = {
      'type': {
        $in: ['standard', 'credit memo']
      },
      'status': 'complete',
      'date': dateRange,
    }

    return await funcs.getTotalSalesInquiry(match, productLine);
  }

  closeInput(event, name){
    switch (name) {
      case 'salesPeopleInput':
        this.salesPeopleInput.close();
        
        break;
      case 'productLineInput':
        this.productLineInput.close();
        
        break;
      case 'categoryInput':
        this.categoryInput.close();
        
        break;
      case 'dataInput':
        this.dataInput.close();
        
        break;
      default:
        
    }
  }

  chartClicked(e){
    if (e.active.length > 0) {
      this.monthChange(e.active[0]._index)
    }
  }

  monthChange(monthNumber){
    this.month = monthNumber;
  }

  getTotal(label, start, end){
    let index = this.lineChartData.findIndex(data => data.label === label);
    if (this.lineChartData[index]) {
      return this.reduceArr(this.lineChartData[index]['data'], start, end);
    } else {
      return 0;
    }
  }
  
  async getGLAccountTotalForYear(match, year, budgetArr?) {
    if(this.selectedSales.length > 0){
      return await funcs.getMonthlyBudgetPerSalesPerson(match, year, this.selectedSales);
    } else {
      return await funcs.getMonthlyBudget(match, year, budgetArr);
    }
  }

  async onFileChange(evt) {
    const target: DataTransfer = <DataTransfer>(evt.target);
    if (target.files.length !== 1) throw new Error('Cannot use multiple files');
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

      /* grab first sheet */
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      /* save data */
      let sheetToJson = XLSX.utils.sheet_to_json(ws, { header: ['name', '2019 BUDGET', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] });
      // this.formatBudgetArrays(salesPeopleBudget);
      this.format(sheetToJson)
      
    };
    reader.readAsBinaryString(target.files[0]);
  }

  async format(excelSheet){
    console.log('start')
    let user, updateArr = [];
    for (let i = 0; i < excelSheet.length; i++) {
      let row = excelSheet[i];
      let category;
      let split = row.name.trim().split(' - ');
        if(split.length < 2) {
          split = row.name.trim().split('-');
        }
      if (row.name !== 'CREDITS') {
        if (i > 0) {
          category = this.returnCategory(split[0], this.allCategories);
          if (category) {
            let query = {
              _id: category.salesAccountId,
              "totals.year": 2019
            }
            let update = {
              "$addToSet": {
                "totals.$.budgets": {
                  _id: user._id,
                  creditAmounts: this.buildArr(row),
                  debitAmounts: []
                }
              }
            }
            updateArr.push({ ledgerId: category.salesAccountId, creditAmounts: this.buildArr(row)})
  
          }
        } else {
          user = this.returnUser(split[1]);
          user = user[0];
        }
      }

    }
    let holder = {};

    updateArr.forEach(function (d) {
      if (holder.hasOwnProperty(d.ledgerId)) {
        holder[d.ledgerId] = holder[d.ledgerId].map(function (num, idx) {
          return num + d.creditAmounts[idx];
        });

      } else {
        holder[d.ledgerId] = d.creditAmounts;
      }
    });
    let obj2 = [];

    for (var prop in holder) {
      obj2.push({ ledgerId: prop, creditAmounts: holder[prop] });
    }
    this.update(obj2, user._id)
  }
  
  async update(arr, userId) {
    for (let i = 0; i < arr.length; i++) {
      this.insertLoading = ((i+1)/arr.length) * 100;
      let obj = arr[i];
      let query = {
        _id: obj.ledgerId,
        "totals.year": 2019
      }
      let update = {
        "$addToSet": {
          "totals.$.budgets": {
            _id: userId,
            creditAmounts: obj.creditAmounts,
            debitAmounts: []
          }
        }
      }
      let options = {
          arrayFilters: [
            {
              "i.year": this.thisYear
            },
            {
              "j._id": userId
            }
          ]
        }
      //Try and update first
      let updateResult = await funcs.updateWithOptions('ledgerAccounts', {
        _id: obj.ledgerId,
      }, {
        $set: {
          "totals.$[i].budgets.$[j]": {
            "_id": userId,
            "creditAmounts": obj.creditAmounts,
            "debitAmounts": []
          }
        }
      }, options);
      //insert if doesn't update
      if (updateResult['result'] == 0) {
        await funcs.update('ledgerAccounts', query, update);
      }

    }
    this.insertLoading = 0;
    this.init();
    console.log('end')
  }
  
  buildArr(row) {
    let total, arr = [];
    for (let i = 1; i <= 12; i++) {
      if (typeof row[i] === 'string') {
        total = row[i].trim();
        if (total === '$-') {
          total = 0;
        } else if (total.includes('(')) {
          total = total.replace(/[()]/g, '');
          total = parseFloat(total.replace(/\$|,/g, '')) * -1;
        } else {
          total = parseFloat(total.replace(/\$|,/g, ''))
        }
      } else {
        total = row[i]
      }
      arr.push(total)
    }
    // console.log(arr)
    return arr;
  }

  returnCategory(name, categories){
    let category = name;
    let index = categories.findIndex(cat => cat.name === category)
    let categoryObj = categories[index];
    return categoryObj;
  }

  returnUser(name){
    let salesPerson;
    name = this.titleCase(name);
    name = name.split(' ');
    
    if (name[0] === 'House') {
      salesPerson = Meteor.users.find({ _id: 'House' }).fetch();
    } else if (name[0] === 'Watermark'){
      salesPerson = Meteor.users.find({ _id: 'House-Watermark' }).fetch();
    } else {
      salesPerson = Meteor.users.find({ "profile.firstName": name[0], "profile.lastName": name[1] }).fetch();
    }
    return salesPerson;
  }

  titleCase(str){
    return str.toLowerCase().split(' ').map(function (word) {
      return word.replace(word[0], word[0].toUpperCase());
    }).join(' ');
  }

  getIndexes(data) {
    let arrayOfIndexes = [];
    for (let i = 0; i < data[0].length; i+=6) {
      if (data[0][i]){
        let name = data[0][i].trim().substring(7).split(' ');
        // console.log({ "emails.profile.firstName": name[0], "emails.profile.lastName": name[1] });
        let salesPerson
        if (name[0] === 'House') {
          salesPerson = [{_id: 'House'}];
        } else {
          salesPerson = Meteor.users.find({ "profile.firstName": name[0], "profile.lastName": name[1] }).fetch();
        }
        // console.log(salesPerson)
        if (salesPerson[0]['_id']) {
          arrayOfIndexes.push({
            "salesPerson": data[0][i].trim().substring(7), 
            '_id': salesPerson[0]['_id'],
            "2019 BUDGET": i + 1,
            "2018 SALES": i + 2,
            "VARIANCE": i + 3,
            "VAR %": i + 4,
          })
        }
      }
    }
    return arrayOfIndexes;
  }

  buildCategoryObj(data, indexes, categories) {
    for (let i = 0; i < indexes.length; i++) {
      let individualSalesPerson = indexes[i];
      let arrayOfCategoryPerSalesPerson = [];
      this.categoriesOnBudget = [];
      for (let j = 1; j < data.length; j+=2) {
        if (data[j][0] !== 'CREDITS'){
          let total = data[j + 1] ? data[j + 1][individualSalesPerson['2019 BUDGET']].trim() : 0;
          if (total === '$-') {
            total = 0;
          } else if (total.includes('(')) {
            total = total.replace(/[()]/g, '');
            total = parseFloat(total.replace(/\$|,/g, '')) * -1;
          } else {
            total = parseFloat(total.replace(/\$|,/g, '')) 
          }
          // total = total === '$-' ? 0 : parseFloat(total.replace(/\$|,/g, ''));

          let category = data[j][0].split(' - ');
          let index = categories.findIndex(cat => cat.name === category[0])
          let categoryObj = categories[index];
          this.categoriesOnBudget.push({
            category: categoryObj.name,
            categoryId: categoryObj._id,
            salesAccountId: categoryObj.salesAccountId,
          })
          arrayOfCategoryPerSalesPerson.push({
            category: categoryObj.name,
            categoryId: categoryObj._id,
            salesAccountId: categoryObj.salesAccountId,
            budget: total,
            // previousSalesTotal: previousTotal
          })
          if (data[j][0] === '9999 - SPECIAL INVENTORY') break;
        }
      }
      individualSalesPerson['budget'] = arrayOfCategoryPerSalesPerson;
    }
    return indexes;
  }

  formatBudgetArrays(salesPeopleArray){
    console.log(this.categoriesOnBudget);
    for (let i = 0; i < this.categoriesOnBudget.length; i++) {
      let categoryOnBudget = this.categoriesOnBudget[i];
      let arr = this.getArrayOfBudget(salesPeopleArray, categoryOnBudget);
      console.log(categoryOnBudget.category, categoryOnBudget.salesAccountId, arr);
    }
  }

  getArrayOfBudget(salesPeopleArray, categoryOnBudget){
    let arr = []
    for (let i = 0; i < salesPeopleArray.length; i++) {
      let salesperson = salesPeopleArray[i];
    
      let index = salesperson.budget.findIndex(person => person.categoryId === categoryOnBudget.categoryId);
      arr.push({
        _id: salesperson._id,
        budget: salesperson.budget[index].budget
      })
    }
    return arr;
  }

  
  openFileBrowser(event) {
    let element: HTMLElement = document.getElementById('fileInput') as HTMLElement;
    element.click();
  }

  changeView() {
    // console.log(event);
    let user = Meteor.users.find({ _id: this.selectedSales[0]}).fetch();
    let obj = {
      view: 'budgetUpdate',
      userId: this.selectedSales[0],
      pageHeader: user[0].profile.firstName + ' ' + user[0].profile.lastName + ' Budget',
    }
    this.lookupView.emit(obj);
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
}
