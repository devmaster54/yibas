import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import {
  MatSidenavModule,
  MatToolbarModule,
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatCheckboxModule,
  MatRadioModule,
  MatInputModule,
  MatListModule,
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatTabsModule,
  MatDialogModule,
  MatMenuModule,
  MatSnackBarModule,
  MatGridListModule,
  MatTableModule,
  MatSortModule,
  MatPaginatorModule,
  MatSelectModule,
  MatChipsModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatButtonToggleModule,
  MatTooltipModule,
  MatSlideToggleModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatAutocompleteModule,
  MatStepperModule,
} from '@angular/material';

const imports = [
  MatSidenavModule,
  MatToolbarModule,
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatCheckboxModule,
  MatRadioModule,
  MatInputModule,
  MatListModule,
  MatProgressSpinnerModule,
  MatProgressBarModule,
  MatTabsModule,
  MatDialogModule,
  MatMenuModule,
  MatSnackBarModule,
  MatGridListModule,
  FlexLayoutModule,
  MatTableModule,
  MatSortModule,
  MatPaginatorModule,
  MatSelectModule,
  MatChipsModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatButtonToggleModule,
  MatTooltipModule,
  MatSlideToggleModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatAutocompleteModule,
  MatStepperModule
];

@NgModule({
  imports,
  exports: imports
})
export class MaterialImportModule {
}
