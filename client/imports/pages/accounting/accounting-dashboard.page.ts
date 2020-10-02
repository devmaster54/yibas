import { Component, OnInit} from "@angular/core";
import {EventEmitterService} from "../../services";
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import {MeteorObservable} from "meteor-rxjs";
import {PrintService} from "../../services/Print.service";

@Component({
  selector: 'accounting-dashboard',
  templateUrl: 'accounting-dashboard.page.html',
  styleUrls: ['accounting.scss'],
}) 

export class AccountingDashboardPage implements OnInit{
  data: any = {};

  constructor() {
    pdfFonts.pdfMake;
  }

  ngOnInit() {
    // console.log('accounting dashboard');

  }
}