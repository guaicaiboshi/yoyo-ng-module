import { Component, ViewChild } from '@angular/core';
import { SettingsService } from 'yoyo-ng-module/theme';

@Component({
  selector: 'layout-header',
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  searchToggleStatus: boolean;

  constructor(public settings: SettingsService) { }

  toggleCollapsedSideabar() {
    this.settings.setLayout('collapsed', !this.settings.layout.collapsed);
  }

  searchToggleChange() {
    this.searchToggleStatus = !this.searchToggleStatus;
  }
}