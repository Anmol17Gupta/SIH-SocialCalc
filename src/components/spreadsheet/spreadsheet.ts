import {
  Component,
  onMounted,
  onPatched,
  onWillUnmount,
  onWillUpdateProps,
  useEffect,
  useExternalListener,
  useRef,
  useSubEnv,
} from "@odoo/owl";
import {
  BACKGROUND_GRAY_COLOR,
  BACKGROUND_HEADER_FILTER_COLOR,
  BG_HOVER_COLOR,
  BOTTOMBAR_HEIGHT,
  CF_ICON_EDGE_LENGTH,
  DISABLED_TEXT_COLOR,
  FILTERS_COLOR,
  GRID_BORDER_COLOR,
  GROUP_LAYER_WIDTH,
  HEADER_GROUPING_BACKGROUND_COLOR,
  ICONS_COLOR,
  MAXIMAL_FREEZABLE_RATIO,
  MENU_SEPARATOR_BORDER_WIDTH,
  MENU_SEPARATOR_PADDING,
  SCROLLBAR_WIDTH,
  SEPARATOR_COLOR,
  TOPBAR_HEIGHT,
} from "../../constants";
import { batched } from "../../helpers";
import { ImageProvider } from "../../helpers/figures/images/image_provider";
import { Model } from "../../model";
import { Store, useStore, useStoreProvider } from "../../store_engine";
import { ModelStore } from "../../stores";
import { NotificationStore, NotificationStoreMethods } from "../../stores/notification_store";
import { _t } from "../../translation";
import {
  CSSProperties,
  HeaderGroup,
  InformationNotification,
  Pixel,
  SpreadsheetChildEnv,
} from "../../types";
import { BottomBar } from "../bottom_bar/bottom_bar";
import { ComposerFocusStore } from "../composer/composer_focus_store";
import { Grid } from "../grid/grid";
import { HeaderGroupContainer } from "../header_group/header_group_container";
import { css, cssPropertiesToCss } from "../helpers/css";
import { isCtrlKey } from "../helpers/dom_helpers";
import { useSpreadsheetRect } from "../helpers/position_hook";
import { SidePanel } from "../side_panel/side_panel/side_panel";
import { SidePanelStore } from "../side_panel/side_panel/side_panel_store";
import { TopBar } from "../top_bar/top_bar";
import { instantiateClipboard } from "./../../helpers/clipboard/navigator_clipboard_wrapper";

// -----------------------------------------------------------------------------
// SpreadSheet
// -----------------------------------------------------------------------------

// If we ever change these colors, make sure the filter tool stays green to match the icon in the grid
const ACTIVE_BG_COLOR = BACKGROUND_HEADER_FILTER_COLOR;
const ACTIVE_FONT_COLOR = FILTERS_COLOR;
const HOVERED_BG_COLOR = BG_HOVER_COLOR;
const HOVERED_FONT_COLOR = "#000";

css/* scss */ `
  .o-spreadsheet {
    position: relative;
    display: grid;
    color: #333;
    font-size: 14px;

    input {
      background-color: white;
    }
    .text-muted {
      color: grey !important;
    }
    .o-disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }

    &,
    *,
    *:before,
    *:after {
      box-sizing: content-box;
      /** rtl not supported ATM */
      direction: ltr;
    }
    .o-separator {
      border-bottom: ${MENU_SEPARATOR_BORDER_WIDTH}px solid ${SEPARATOR_COLOR};
      margin-top: ${MENU_SEPARATOR_PADDING}px;
      margin-bottom: ${MENU_SEPARATOR_PADDING}px;
    }
    .o-hoverable-button {
      border-radius: 2px;
      cursor: pointer;
      .o-icon {
        color: ${ICONS_COLOR};
      }
      &:not(.o-disabled):not(.active):hover {
        background-color: ${HOVERED_BG_COLOR};
        color: ${HOVERED_FONT_COLOR};
        .o-icon {
          color: ${HOVERED_FONT_COLOR};
        }
      }
      &.active {
        background-color: ${ACTIVE_BG_COLOR};
        color: ${ACTIVE_FONT_COLOR};
        .o-icon {
          color: ${ACTIVE_FONT_COLOR};
        }
      }
    }

    .o-grid-container {
      display: grid;
      background-color: ${HEADER_GROUPING_BACKGROUND_COLOR};

      .o-top-left {
        border: 1px solid ${GRID_BORDER_COLOR};
        margin-bottom: -1px;
        margin-right: -1px;
      }

      .o-column-groups {
        grid-column-start: 2;
        border-top: 1px solid ${GRID_BORDER_COLOR};
      }

      .o-row-groups {
        grid-row-start: 2;
      }

      .o-group-grid {
        border-top: 1px solid ${GRID_BORDER_COLOR};
        border-left: 1px solid ${GRID_BORDER_COLOR};
      }
    }
  }

  .o-two-columns {
    grid-column: 1 / 3;
  }

  .o-cf-icon {
    width: ${CF_ICON_EDGE_LENGTH}px;
    height: ${CF_ICON_EDGE_LENGTH}px;
    vertical-align: sub;
  }

  .o-text-icon {
    vertical-align: middle;
  }
`;

// -----------------------------------------------------------------------------
// GRID STYLE
// -----------------------------------------------------------------------------

css/* scss */ `
  .o-grid {
    position: relative;
    overflow: hidden;
    background-color: ${BACKGROUND_GRAY_COLOR};
    &:focus {
      outline: none;
    }

    > canvas {
      border-bottom: 1px solid #e2e3e3;
    }
    .o-scrollbar {
      &.corner {
        right: 0px;
        bottom: 0px;
        height: ${SCROLLBAR_WIDTH}px;
        width: ${SCROLLBAR_WIDTH}px;
        border-top: 1px solid #e2e3e3;
        border-left: 1px solid #e2e3e3;
      }
    }

    .o-grid-overlay {
      position: absolute;
      outline: none;
    }
  }

  .o-button {
    border: 1px solid;
    padding: 0px 20px 0px 20px;
    border-radius: 4px;
    font-weight: 500;
    font-size: 14px;
    height: 30px;
    line-height: 16px;
    margin-right: 8px;

    &:not(:hover) {
      background-color: transparent;
    }

    &:enabled {
      cursor: pointer;
    }

    &:disabled {
      color: ${DISABLED_TEXT_COLOR};
    }

    &:last-child {
      margin-right: 0px;
    }

    &.o-button-grey {
      border-color: lightgrey;
      background: #ffffff;
      color: #333;
      &:hover:enabled {
        background-color: rgba(0, 0, 0, 0.08);
      }
    }
  }

  .o-input {
    color: #666666;
    border-radius: 4px;
    min-width: 0px;
    padding: 4px 6px;
    box-sizing: border-box;
    line-height: 1;
    width: 100%;
    height: 28px;
  }

  .o-number-input {
    /* Remove number input arrows */
    appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
`;

export interface SpreadsheetProps extends Partial<NotificationStoreMethods> {
  model: Model;
}

export class Spreadsheet extends Component<SpreadsheetProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-Spreadsheet";
  static props = {
    model: Object,
    notifyUser: { type: Function, optional: true },
    raiseError: { type: Function, optional: true },
    askConfirmation: { type: Function, optional: true },
  };
  static components = {
    TopBar,
    Grid,
    BottomBar,
    SidePanel,
    HeaderGroupContainer,
  };

  sidePanel!: Store<SidePanelStore>;
  spreadsheetRef = useRef("spreadsheet");
  spreadsheetRect = useSpreadsheetRect();

  private _focusGrid?: () => void;

  private keyDownMapping!: { [key: string]: Function };

  private isViewportTooSmall: boolean = false;
  private notificationStore!: Store<NotificationStore>;
  private composerFocusStore!: Store<ComposerFocusStore>;

  get model(): Model {
    return this.props.model;
  }

  getStyle(): string {
    const properties: CSSProperties = {};
    properties["grid-template-rows"] = `${TOPBAR_HEIGHT}px auto ${BOTTOMBAR_HEIGHT + 1}px`;
    properties["grid-template-columns"] = `auto ${this.sidePanel.panelSize}px`;
    return cssPropertiesToCss(properties);
  }

  setup() {
    const stores = useStoreProvider();
    stores.inject(ModelStore, this.model);
    this.notificationStore = useStore(NotificationStore);
    this.composerFocusStore = useStore(ComposerFocusStore);
    this.sidePanel = useStore(SidePanelStore);
    this.keyDownMapping = {
      "CTRL+H": () => this.sidePanel.toggle("FindAndReplace", {}),
      "CTRL+F": () => this.sidePanel.toggle("FindAndReplace", {}),
    };
    const fileStore = this.model.config.external.fileStore;
    useSubEnv({
      model: this.model,
      imageProvider: fileStore ? new ImageProvider(fileStore) : undefined,
      loadCurrencies: this.model.config.external.loadCurrencies,
      loadLocales: this.model.config.external.loadLocales,
      openSidePanel: this.sidePanel.open.bind(this.sidePanel),
      toggleSidePanel: this.sidePanel.toggle.bind(this.sidePanel),
      clipboard: this.env.clipboard || instantiateClipboard(),
      startCellEdition: (content?: string) =>
        this.composerFocusStore.focusGridComposerCell(content),
      notifyUser: (notification) => this.notificationStore.notifyUser(notification),
      askConfirmation: (text, confirm, cancel) =>
        this.notificationStore.askConfirmation(text, confirm, cancel),
      raiseError: (text, cb) => this.notificationStore.raiseError(text, cb),
    } satisfies Partial<SpreadsheetChildEnv>);

    this.notificationStore.updateNotificationCallbacks({ ...this.props });

    useEffect(
      () => {
        /**
         * Only refocus the grid if the active element is not a child of the spreadsheet
         * (i.e. activeElement is outside of the spreadsheetRef component)
         * and spreadsheet is a child of that element. Anything else means that the focus
         * is on an element that needs to keep it.
         */
        if (
          !this.spreadsheetRef.el!.contains(document.activeElement) &&
          document.activeElement?.contains(this.spreadsheetRef.el!)
        ) {
          this.focusGrid();
        }
      },
      () => [this.env.model.getters.getActiveSheetId()]
    );

    useExternalListener(window as any, "resize", () => this.render(true));

    // For some reason, the wheel event is not properly registered inside templates
    // in Chromium-based browsers based on chromium 125
    // This hack ensures the event declared in the template is properly registered/working
    useExternalListener(document.body, "wheel", () => {});

    this.bindModelEvents();

    onWillUpdateProps((nextProps: SpreadsheetProps) => {
      if (nextProps.model !== this.props.model) {
        throw new Error("Changing the props model is not supported at the moment.");
      }
      if (
        nextProps.notifyUser !== this.props.notifyUser ||
        nextProps.askConfirmation !== this.props.askConfirmation ||
        nextProps.raiseError !== this.props.raiseError
      ) {
        this.notificationStore.updateNotificationCallbacks({ ...nextProps });
      }
    });

    const render = batched(this.render.bind(this, true));
    onMounted(() => {
      this.checkViewportSize();
      stores.on("store-updated", this, render);
      resizeObserver.observe(this.spreadsheetRef.el!);
    });
    onWillUnmount(() => {
      this.unbindModelEvents();
      stores.off("store-updated", this);
      resizeObserver.disconnect();
    });
    onPatched(() => {
      this.checkViewportSize();
    });
    const resizeObserver = new ResizeObserver(() => {
      this.sidePanel.changePanelSize(this.sidePanel.panelSize, this.spreadsheetRect.width);
    });
  }

  private bindModelEvents() {
    this.model.on("update", this, () => this.render(true));
    this.model.on("notify-ui", this, (notification: InformationNotification) =>
      this.notificationStore.notifyUser(notification)
    );
    this.model.on("raise-error-ui", this, ({ text }) => this.notificationStore.raiseError(text));
  }

  private unbindModelEvents() {
    this.model.off("update", this);
    this.model.off("notify-ui", this);
    this.model.off("raise-error-ui", this);
  }

  private checkViewportSize() {
    const { xRatio, yRatio } = this.env.model.getters.getFrozenSheetViewRatio(
      this.env.model.getters.getActiveSheetId()
    );

    if (!isFinite(xRatio) || !isFinite(yRatio)) {
      // before mounting, the ratios can be NaN or Infinity if the viewport size is 0
      return;
    }

    if (yRatio > MAXIMAL_FREEZABLE_RATIO || xRatio > MAXIMAL_FREEZABLE_RATIO) {
      if (this.isViewportTooSmall) {
        return;
      }
      this.notificationStore.notifyUser({
        text: _t(
          "The current window is too small to display this sheet properly. Consider resizing your browser window or adjusting frozen rows and columns."
        ),
        type: "warning",
        sticky: false,
      });
      this.isViewportTooSmall = true;
    } else {
      this.isViewportTooSmall = false;
    }
  }

  focusGrid() {
    if (!this._focusGrid) {
      return;
    }
    this._focusGrid();
  }

  onKeydown(ev: KeyboardEvent) {
    let keyDownString = "";
    if (isCtrlKey(ev)) {
      keyDownString += "CTRL+";
    }
    keyDownString += ev.key.toUpperCase();

    let handler = this.keyDownMapping[keyDownString];
    if (handler) {
      ev.preventDefault();
      ev.stopPropagation();
      handler();
      return;
    }
  }

  get gridHeight(): Pixel {
    const { height } = this.env.model.getters.getSheetViewDimension();
    return height;
  }

  get gridContainerStyle(): string {
    const gridColSize = GROUP_LAYER_WIDTH * this.rowLayers.length;
    const gridRowSize = GROUP_LAYER_WIDTH * this.colLayers.length;
    return cssPropertiesToCss({
      "grid-template-columns": `${gridColSize ? gridColSize + 2 : 0}px auto`, // +2: margins
      "grid-template-rows": `${gridRowSize ? gridRowSize + 2 : 0}px auto`,
    });
  }

  get rowLayers(): HeaderGroup[][] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getVisibleGroupLayers(sheetId, "ROW");
  }

  get colLayers(): HeaderGroup[][] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.getVisibleGroupLayers(sheetId, "COL");
  }
}
