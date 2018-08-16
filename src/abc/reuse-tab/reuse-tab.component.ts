import {
  Component,
  Input,
  Output,
  OnChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  EventEmitter,
  OnInit,
  SimpleChanges,
  SimpleChange,
  OnDestroy,
  ElementRef,
  Renderer2,
  Inject,
  Optional,
  TemplateRef,
} from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subscription, combineLatest } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';
import { toNumber, toBoolean } from 'yoyo-ng-module/util';

import { ReuseTabService } from './reuse-tab.service';
import {
  ReuseTabCached,
  ReuseTabNotify,
  ReuseTabMatchMode,
  ReuseItem,
  ReuseContextI18n,
  ReuseContextCloseEvent,
  ReuseTitle,
  CloseType,
} from './interface';
import { ReuseTabContextService } from './reuse-tab-context.service';
import { NzDropdownContextComponent, NzDropdownService } from 'ng-zorro-antd';
import { LocalizationService } from 'yoyo-ng-module/abp/localization/localization.service';

@Component({
  selector: 'reuse-tab',
  template: `
  <nz-tabset [nzSelectedIndex]="pos" [nzAnimated]="false" nzType="line">
  <nz-tab *ngFor="let i of list; let index = index" [nzTitle]="titleTemplate">
    <ng-template #titleTemplate>
      <span [context-menu]="i" (click)="to($event, index)" class="name">
        <i *ngIf="i.icon" [class]="i.icon"></i>
        {{l(i.title)}}
      </span>
      <i *ngIf="i.closable" class="anticon anticon-close op" (click)="_close($event, index, false)"></i>
    </ng-template>
  </nz-tab>
</nz-tabset>
<reuse-tab-context [i18n]="i18n" (change)="cmChange($event)"></reuse-tab-context>
  `,
  // templateUrl: './reuse-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  providers: [ReuseTabContextService],
  host: {
    '[class.ad-rt]': 'true',
    '[class.fixed]': 'fixed',
  },
})
export class ReuseTabComponent implements OnInit, OnChanges, OnDestroy {
  private sub$: Subscription;
  private i18n$: Subscription;
  list: ReuseItem[] = [];
  item: ReuseItem;
  pos = 0;

  // region: properties
  /** 设置匹配模式 */
  @Input() mode: ReuseTabMatchMode = ReuseTabMatchMode.Menu;
  /** 选项文本国际化 */
  @Input() i18n: ReuseContextI18n;
  /** 是否Debug模式 */
  @Input()
  get debug() { return this._debug; }
  set debug(value: any) {
    this._debug = toBoolean(value);
  }
  private _debug = false;
  /** 允许最多复用多少个页面 */
  @Input()
  get max() {
    return this._max;
  }
  set max(value: any) {
    this._max = toNumber(value);
  }
  private _max: number;
  /** 排除规则，限 `mode=URL` */
  @Input() excludes: RegExp[];
  /** 允许关闭 */
  @Input()
  get allowClose() {
    return this._allowClose;
  }
  set allowClose(value: any) {
    this._allowClose = toBoolean(value);
  }
  private _allowClose = true;
  /** 是否固定 */
  @Input()
  get fixed() {
    return this._fixed;
  }
  set fixed(value: any) {
    this._fixed = toBoolean(value);
  }
  private _fixed = true;
  /** 总是显示当前页 */
  @Input()
  get showCurrent() {
    return this._showCurrent;
  }
  set showCurrent(value: any) {
    this._showCurrent = toBoolean(value);
  }
  private _showCurrent = true;
  /** 切换时回调 */
  @Output() change: EventEmitter<ReuseItem> = new EventEmitter<ReuseItem>();
  /** 关闭回调 */
  @Output() close: EventEmitter<ReuseItem> = new EventEmitter<ReuseItem>();
  // endregion

  /**
   * 右键菜单服务
   */
  private _contextMenuDropdown: NzDropdownContextComponent;

  constructor(
    public srv: ReuseTabService,
    private cd: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private el: ElementRef,
    private render: Renderer2,
    @Inject(DOCUMENT) private doc: any,
    private localizationService: LocalizationService,
    private nzDropdownService: NzDropdownService//右键菜单

  ) {
    const route$ = this.router.events.pipe(
      filter(evt => evt instanceof NavigationEnd),
    );
    this.sub$ = combineLatest(this.srv.change, route$).subscribe(([res, e]) =>
      this.genList(res as any),
    );

  }

  private genTit(title: ReuseTitle): string {
    return title.text;
  }

  private genList(notify?: ReuseTabNotify) {
    const isClosed = notify && notify.active === 'close';
    const beforeClosePos = isClosed
      ? this.list.findIndex(w => w.url === notify.url)
      : -1;
    const ls = this.srv.items.map((item: ReuseTabCached, index: number) => {
      return <ReuseItem>{
        url: item.url,
        title: this.genTit(item.title),
        closable: this.allowClose && item.closable && this.srv.count > 0,
        index,
        active: false,
        last: false,
        icon: this.srv.getIcon(item.url)
      };
    });
    if (this.showCurrent) {
      const snapshot = this.route.snapshot;
      const url = this.srv.getUrl(snapshot);
      const idx = ls.findIndex(w => w.url === url);
      // jump directly when the current exists in the list
      // or create a new current item and jump
      if (idx !== -1 || (isClosed && notify.url === url)) {
        this.pos = isClosed
          ? idx >= beforeClosePos
            ? this.pos - 1
            : this.pos
          : idx;
      } else {
        const snapshotTrue = this.srv.getTruthRoute(snapshot);
        ls.push(<ReuseItem>{
          url,
          title: this.genTit(this.srv.getTitle(url, snapshotTrue)),
          closable:
            this.allowClose &&
            this.srv.count > 0 &&
            this.srv.getClosable(url, snapshotTrue),
          index: ls.length,
          active: false,
          last: false,
          icon: this.srv.getIcon(url)
        });
        this.pos = ls.length - 1;
      }
      // fix unabled close last item
      if (ls.length <= 1) ls[0].closable = false;
    }

    this.list = ls;

    if (ls.length && isClosed) {
      this.to(null, this.pos);
    }

    this.refStatus(false);
    this.visibility();
    this.cd.detectChanges();
  }

  private visibility() {
    if (this.showCurrent) return;
    this.render.setStyle(
      this.el.nativeElement,
      'display',
      this.list.length === 0 ? 'none' : 'block',
    );
  }

  // region: UI

  cmChange(res: ReuseContextCloseEvent) {
    switch (res.type) {
      case 'close':
        this._close(null, res.item.index, res.includeNonCloseable);
        break;
      case 'closeRight':
        this.srv.closeRight(res.item.url, res.includeNonCloseable);
        this.close.emit(null);
        break;
      case 'clear':
      case 'closeOther':
        this.srv.clear(res.includeNonCloseable);
        this.close.emit(null);
        break;
    }
  }

  refStatus(dc = true) {
    if (this.list.length) {
      this.list[this.list.length - 1].last = true;
      this.list.forEach((i, idx) => (i.active = this.pos === idx));
    }
    if (dc) this.cd.detectChanges();
  }

  to(e: Event, index: number) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    index = Math.max(0, Math.min(index, this.list.length - 1));
    const item = this.list[index];
    this.router.navigateByUrl(item.url).then(res => {
      if (!res) return;
      this.pos = index;
      this.item = item;
      this.refStatus();
      this.change.emit(item);
    });
  }

  _close(e: Event, idx: number, includeNonCloseable: boolean) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const item = this.list[idx];
    this.srv.close(item.url, includeNonCloseable);
    this.close.emit(item);
    this.cd.detectChanges();
    return false;
  }

  // endregion

  ngOnInit(): void {
    this.setClass();

    this.genList();
  }

  private setClass() {
    const body = this.doc.querySelector('body');
    const bodyCls = `has-ad-rt`;
    if (this.fixed) {
      this.render.addClass(body, bodyCls);
    } else {
      this.render.removeClass(body, bodyCls);
    }
  }

  ngOnChanges(
    changes: { [P in keyof this]?: SimpleChange } & SimpleChanges,
  ): void {
    if (changes.max) this.srv.max = this.max;
    if (changes.excludes) this.srv.excludes = this.excludes;
    if (changes.mode) this.srv.mode = this.mode;
    this.srv.debug = this.debug;

    this.setClass();
    this.cd.detectChanges();
  }

  ngOnDestroy(): void {
    this.sub$.unsubscribe();
    if (this.i18n$) this.i18n$.unsubscribe();
  }


  l(key: string, ...args: any[]): string {
    return this.localizationService.l(key, args);
  }

  /**
 * 打开右键菜单
 * @param $event 鼠标事件
 * @param template 创建右键的模板内容
 */
  openContextMenu($event: MouseEvent, template: TemplateRef<void>): void {
    this._contextMenuDropdown = this.nzDropdownService.create($event, template);
  }
  /**
   * 右键菜单项点击事件
   * @param $event 当前项点击事件
   * @param closeType 关闭类型
   * @param item 当前路由复用项
   */
  contextMenuItemClick($event: MouseEvent, closeType: CloseType, item: ReuseItem): void {
    if (closeType === 'close' && !item.closable) return;
    if (closeType === 'closeRight' && item.last) return;
    let includeNonCloseable = $event.ctrlKey; //是否强制清除（按Ctrl键）
    switch (closeType) { //'close' | 'closeOther' | 'closeRight' | 'clear'
      case 'close':
        this.srv.close(item.url, includeNonCloseable);
        break;
      case 'closeOther':
        this.srv.closeOther(item.url, includeNonCloseable);
        break;
      case 'closeRight':
        this.srv.closeRight(item.url, includeNonCloseable);
        break;
      case 'clear':
        this.srv.clear(includeNonCloseable);
        break;
      default:
        this.srv.refresh();
        break;
    }
    //关闭右键菜单
    this._contextMenuDropdown.close();
  }

}