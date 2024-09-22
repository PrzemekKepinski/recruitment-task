import {Component, inject, OnDestroy} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { rxState } from '@rx-angular/state';
import {PeriodicElement, PeriodicElementsService} from "./periodic-elements.service";
import {
  map,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  Subject,
  merge,
  of,
  switchMap,
  concat,
} from "rxjs";
import {MatTableModule} from '@angular/material/table';
import {AsyncPipe} from "@angular/common";
import {MatDialog} from "@angular/material/dialog";
import {DialogComponent} from "./dialog/dialog.component";
import {MatIcon} from "@angular/material/icon";
import {MatFormField} from "@angular/material/form-field";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {MatInput, MatInputModule} from "@angular/material/input";
import {MatIconButton} from "@angular/material/button";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe, MatTableModule, MatInputModule, MatIcon, MatFormField, FormsModule, MatInput, MatIconButton, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  title = 'recruitment-task';
  periodicElementsService = inject(PeriodicElementsService);
  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  readonly dialog = inject(MatDialog);
  filterControl = new FormControl('');
  private state = rxState<{
    periodicElements: PeriodicElement[];
  }>(({ set, connect }) => {
    set({ periodicElements: []});
    connect(
      this.periodicElementsService.getPeriodicElements().pipe(
        map(periodicElements => ({periodicElements}))
      )
    );
  });
  periodicElements$ = merge(
    this.state.select('periodicElements')
  ).pipe(
    map(periodicElements => periodicElements.sort((a,b) => a.position - b.position)),
    switchMap(periodicElements =>
      concat(
        of(this.filterControl.value),
        this.filterControl.valueChanges.pipe(
          debounceTime(2000),
          distinctUntilChanged(),
        )
      ).pipe(
        map((filter) => filterPeriodicElements(periodicElements, filter))
      )
    )
  );
  filter = '';
  private destroy$ = new Subject();

  changeValue(element: PeriodicElement, property: string) {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        element,
        property
      },
    });
    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result !== undefined) {
        const state = this.state.get('periodicElements');
        this.state.set('periodicElements', state => {
         const unchangedElements = state.periodicElements.filter(element => element.position !== result.element.position)
         const changedElement = {...result.element, [result.property]: result.newValue}
         return  [...unchangedElements, changedElement];
        })
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(null);
    this.destroy$.unsubscribe()
  }
}

function filterPeriodicElements(elements: PeriodicElement[], filter: string | null): PeriodicElement[] {
  if (filter === null) {
    return elements;
  }
  return elements.filter( ({position, name, weight, symbol}) => {
    return position.toString().includes(filter) || name.includes(filter) ||
      weight.toString().includes(filter) || symbol.includes(filter)
  })
}
