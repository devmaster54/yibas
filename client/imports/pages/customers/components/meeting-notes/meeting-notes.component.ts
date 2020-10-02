import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import * as funcs from '../../../../../../both/functions/common';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { MeteorObservable } from "meteor-rxjs";
import { Random } from 'meteor/random';
import * as moment from 'moment';
import * as _ from "underscore";

import { SystemLogsService } from "../../../../services/SystemLogs.service";
import { delay } from 'rxjs/internal/operators/delay';

@Component({
    selector: 'meetingNotes',
    templateUrl: 'meeting-notes.component.html',
    styleUrls: ['../customers.scss'],
})

export class meetingNotesComponent implements OnInit {

  @Input() meetingData: any;
  @Output() activeState: any = new EventEmitter<any>();
  @Output() emitNotes: any = new EventEmitter<any>();
  clearButton: boolean = false;
  notes: any;
  branchNotes: any = {};
  createMeetingNotes: any = {};
  meetingId: string;
  microsoftId: string;
  complete: boolean = false;
  showPreviousNotes: boolean = false;
  chipNumbers: any = {};
  timer;

  constructor(private route: ActivatedRoute, private router: Router, private systemLogsService: SystemLogsService) { }

  ngOnInit() {
      this.route.params.subscribe((params: Params) => {
        this.meetingId = params['meetingId'];
        if (this.meetingId) {
          this.microsoftId = this.meetingData['microsoftId'];
          this.complete = this.meetingData['status'] === 'Complete' ? true : false;
        }
        MeteorObservable.call('find', 'meetingNotes', {
          active: true
        }).subscribe(notes => {
          this.notes = notes;
          this.generateChipObj();
          this.checkForAggregate();
        })
      });

  }

  async checkForAggregate(){
    for (var i = 0; i < this.notes.length; i++) {
      if ('inputs' in this.notes[i].data) {
        let input = this.notes[i].data.inputs
        for (let element of input) {
          if ('aggregate' in element){
            element.selectValue = await this.runAggregate(element.aggregate.collection, funcs.parseAll(element.aggregate.pipeline, {})[0]);
          }
        };
      }
    }
  }

  async runAggregate(collection, pipeline) {
    let result = await funcs.runAggregate(collection, pipeline);
    return result['result'];
  }

  active(active){
    this.activeState.emit(active)
    this.clearButton = active ? true : false;
  }

  onBlurMethod(noteObj, field, value, index, input) {
    value = input ? this.correctValue(input, value) : value;
    if (this.meetingId) {
      let query:any = Object.keys(noteObj).length ? {
        _id: this.meetingId,
        [field + "._id"]: noteObj._id
      } : {
        _id: this.meetingId,
      } 
      
      let update:any = Object.keys(noteObj).length ? {
        $set: {
          [field + ".$.notes"]: value,
        }
      } : {
        $push: {
          [field]: {
            _id: Random.id(),
            notes: value
          },
        }
      } 
      // console.log(JSON.stringify(query), JSON.stringify(update));
      // console.log('value', value);
      if (!this.complete && value !== undefined && value !== '') {
        MeteorObservable.call('findAndModify', 'customerMeetings', query, update, {new: true} ).subscribe(res => { 
          this.meetingData = res['value'];
        })
      } else {
        query = Object.keys(noteObj).length > 2 ? {
          _id: this.meetingId,
          [field + "._id"]: noteObj._id
        } : {
            _id: this.meetingId,
          }

        update = Object.keys(noteObj).length > 2 ? {
          $unset: {
            [field + ".$.notes"]: '',
          }
        } : {
            $pull: {
              [field]: {
                _id: noteObj._id,
              },
            }
          } 
        // console.log(JSON.stringify(query), JSON.stringify(update));
        MeteorObservable.call('findAndModify', 'customerMeetings', query, update, {new: true} ).subscribe(res => { 
          this.meetingData = res['value'];
        })
      }
    } else {
      // console.log(field, { notes: value }, index);
      if (value !== undefined) {
        this.upsertObjectCreate(field, {notes: value}, index, value);
        this.updateMeetingData();
      }
    }
  }

  removeNoteFromDb(objId, field){
    // console.log(objId, field);
    let query = {
      _id: this.meetingId,
    };
    let update = { $pull: { [field]: { _id: objId } } };
    MeteorObservable.call('findAndModify', 'customerMeetings', query, update, { new: true }).subscribe(res => {
      this.meetingData = res['value'];
      this.updateChipNumber((this.meetingData[field].length - 1), field);
    })
  }

  updateMeetingData(){
    // this.meetingData = this.createMeetingNotes;
    // this.meetingData = Object.assign(this.meetingData, this.createMeetingNotes);
    // console.log(this.meetingData);
    this.emitNotes.emit()
  }

  updateChipNumber(index, note){
    if (index < 0) {
      index = 0;
    }
    this.chipNumbers[note] = index;
  }
  
  generateChipObj(){
    let controlArr = this.notes;
    let obj = {};
    controlArr.forEach(note => {
      obj[note.identifier] = 0
    });
    this.chipNumbers = obj;
  }

  get isSlideChecked() {
    return this.showPreviousNotes;
  }
  set isSlideChecked(checked: boolean) {
    this.showPreviousNotes = checked;
  }
  onSlideChange(event) {
    this.isSlideChecked = event.checked;
    if (this.showPreviousNotes) {
      this.getNotesPastMeetings();
    } else {
      this.branchNotes = {};
    }
  }

  returnNotes(){
    return this.createMeetingNotes
  }

  upsertObjectCreate(note, obj, index, value){
    if (!this.createMeetingNotes[note]) {
      this.createMeetingNotes[note] = [];
    }
    let control = this.createMeetingNotes[note][index] ? this.createMeetingNotes[note][index] : {}
    control['_id'] = control['_id'] ? control['_id'] : Random.id();
    this.createMeetingNotes[note][index] = Object.assign(control, obj);
    if(!value){
      this.createMeetingNotes[note].splice(index, 1);
      if (this.createMeetingNotes[note].length === 0) {
        delete this.createMeetingNotes[note]
      }
    }
    // console.log(this.createMeetingNotes);
  }

  noteSpecificInput(noteObj = {}, note, field, value, index, input){
    value = input ? this.correctValue(input, value) : value;
    if (this.meetingId) {
      let query:any = noteObj['_id'] ? {
        _id: this.meetingId,
        [note + "._id"]: noteObj['_id']
      } : {
        _id: this.meetingId,
      } 

      let update:any = noteObj['_id'] ? {
        $set: {
          [note + ".$." + field]: value,
        }
      }: {
        $push: {
          [note]: {
            _id: Random.id(),
            [field]: value
          },
        }
      }
      if (!this.complete && value !== undefined && value !== '') {
        MeteorObservable.call('findAndModify', 'customerMeetings', query, update, { new: true }).subscribe(res => {
          this.meetingData = res['value'];
        })
      } else {
        query = Object.keys(noteObj).length > 2 ? {
          _id: this.meetingId,
          [note + "._id"]: noteObj['_id']
        } : {
            _id: this.meetingId,
          }

        update = Object.keys(noteObj).length > 2 ? {
          $unset: {
            [note + ".$." + field]: '',
          }
        } : {
            $pull: {
              [note]: {
                _id: noteObj['_id'],
              },
            }
          } 
        MeteorObservable.call('findAndModify', 'customerMeetings', query, update, {new: true} ).subscribe(res => { 
          this.meetingData = res['value'];
        })
      }
    } else {
      let obj = {
        [field]: value
      }
      this.upsertObjectCreate(note, obj, index, value);
      this.updateMeetingData();
    }
  }

  getNotesPastMeetings() {
    let query:any = [{
      $match: {
        customerId: this.meetingData.customerId,
        branchId: this.meetingData.branchId,
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    {
      $unwind: "$user"
    },
    { $sort: 
      { dateTime: -1 } 
    },
    {
      $limit: 5
    }
    ];
    if (this.meetingId) {
      let obj = {
        $match: {
          customerId: this.meetingData.customerId,
          branchId: this.meetingData.branchId,
          _id: { $ne: this.meetingId }
        }
      }
      query.splice(0, 1, obj);
    }
    MeteorObservable.call('aggregate', 'customerMeetings', query).subscribe(branchMeetings => {
      let pastMeetings = branchMeetings['result'];
      for (let noteIndex in this.notes) {
        let noteElement = this.notes[noteIndex];
        this.branchNotes[noteElement.identifier] = [];
        for (let meetingIndex in pastMeetings) {
          let meetingElement = pastMeetings[meetingIndex];
          if (meetingElement[noteElement.identifier]) {
            for (var i = 0; i < meetingElement[noteElement.identifier].length; i++) {
              let previousDetails = {
                userInfo: meetingElement.user['profile'].firstName + " " + meetingElement.user['profile'].lastName,
                meetingDate: moment(new Date(meetingElement.dateTime)).format('D MMM, YYYY')
              }
              let previousContent = meetingElement[noteElement.identifier][i]
              if ('inputs' in noteElement.data) {
                this.correctValueInDropDown(noteElement.data.inputs, previousContent);
              }

              let combined = {...previousContent, ...previousDetails}
              this.branchNotes[noteElement.identifier].push(combined)
            }
          }
        }
      }
    })
  }

  correctValueInDropDown(noteInputs, previousNote){
    let found;
    for (var i = 0; i < noteInputs.length; i++) {
      let input = noteInputs[i];
      if ('selectValue' in input){
        found = input.selectValue.find(elem => elem.value === previousNote[input.inputName]);
        if (found){
          previousNote[input.inputName] = found.viewValue;
        } 
      }
    }
    return previousNote;
  }

  correctValue(input, value){
    let newValue
    switch (input.valueType) {
      case 'number':
        newValue = parseInt(value);
        break;
      default:
        newValue = value;
    }

    return newValue;
  }

  addNoteInstance(note){
    if (this.meetingId) {
      this.meetingData[note].push({});
      this.updateChipNumber((this.meetingData[note].length - 1), note);
    } else {
      this.createMeetingNotes[note].push({});
      this.updateChipNumber((this.createMeetingNotes[note].length - 1), note);
    }
  }
  
  removeNoteInstance(index, note){
    if (this.meetingId) {
      let elemId = this.meetingData[note][index]._id;
      this.removeNoteFromDb(elemId, note);
    } else {
      this.createMeetingNotes[note].splice(index, 1);
      this.updateChipNumber((this.createMeetingNotes[note].length - 1), note);
    }
  }

  getKeys(obj){
    return Object.keys(obj);
  }

  sendEmail(meetingValue, extraDetails?){
    this.notes.forEach(async (note) => {
      let emailData = {};
      let emailObj = {
        identifier: note.identifier,
        emails: note['email'].to,
        subject: note['email'].subject,
        from: note['email'].from,
      }
      if (!Meteor.settings.public.isProduction) {
        emailObj.emails = note['email'].temp
      }
      emailObj.from = (note['email'].from) ? note['email'].from : Meteor.user()["emails"][0].address;
      
      let noteValues = Object.keys(this.meetingData).length > 0 ? this.meetingData : this.createMeetingNotes
      // console.log(this.meetingData);
      // console.log(this.createMeetingNotes);
      if (emailObj.identifier && noteValues[emailObj.identifier]) {
        emailData['to'] = emailObj.from;
        emailData['from'] = emailObj.from;
        emailData['bcc'] = emailObj.emails;
        emailData['subject'] = emailObj.subject + meetingValue.customerName;

        let variables = {
          logo: 'https://app.yibas.com/img/Global-White.png',
          Customer: meetingValue.customerName,
          Address: extraDetails.customerAddress,
          Branch: meetingValue.branch,
          SalesPerson: meetingValue.userName,
          Date: meetingValue.dateTime,
          MeetingNotes: noteValues[emailObj.identifier]
        };
        let managerUsers: any = await funcs.callbackToPromise(MeteorObservable.call('getManagerUsers'));
        let str = ', ';
        managerUsers.forEach((user, index) => {
          let temp = '';
          if (index == managerUsers.length - 1) {
            temp = user.username;
          } else {
            temp = user.username + ', ';
          }
          str = str + temp;
        });
        emailData['bcc'] = emailData['bcc'] + str;
        // MeteorObservable.call('sendEmail', emailData, 'html-email.html', variables).subscribe(emailResponse => {
        //   if (emailResponse) {
        //     let value = {
        //       _id: Random.id(),
        //       collectionName: 'Failed Meeting Email',
        //       type: null,
        //       field: null,
        //       log: JSON.stringify(emailResponse),
        //       date: new Date(),
        //     }
        //     this.systemLogsService._log$(value).subscribe();
        //   }
        // })
      }
      }
    )
  }
}
