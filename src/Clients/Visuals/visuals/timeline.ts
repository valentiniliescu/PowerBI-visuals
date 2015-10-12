/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

/// <reference path="../_references.ts"/>

module powerbi.visuals {
    export interface TimelineConstructorOptions {
        svg?: D3.Selection;
        animator?: IGenericAnimator;
        margin?: IMargin;
    }
    
    export enum MonthsEnum {
        Jan, Feb, Mar, Apr,
        May, Jun, Jul, Aug,
        Sep, Oct, Nov, Dec
    }

    export enum DateGranularityEnum {
        Year,
        Month,
        Day
    }

    export interface TimelineLabel {
        value: string;
        date: Date;
    }

    export interface TimelineObjectShift {
        dx: number;
        dy: number;
    }

    export interface TimelineOptions {
        widthCell: number;
        heightCell: number;
    }

    export interface TimelineSettings {
        minDate?: Date;
        maxDate?: Date;
        granularity: DateGranularityEnum;
        displayName: string;
        showHeader?: boolean;
        labelColor: string;
        cellColor: string;
        cellSelectedColor: string;
        cellBorderColor: string;
        headerFontColor: string;
    }

    export interface TimelineCursor {
        index: number;
        date: Date;
        position: number;
    }

    export interface TimelineDataView {
        countOfCells: number;
        settings: TimelineSettings;
        width: number;
        cells: TimelineDateCell[];
        legend: TimelineLegend[];
        cursors: TimelineCursor[];
        selectableCells: SelectableCell[];
    }

    export interface SelectableCell extends SelectableDataPoint {
        value: Date;
    }

    export interface TimelineDateCell {
        isSelected: boolean;
        label: TimelineLabel;
        globalLabel?: string;
        width: number;
        height: number;
        index: number;
    }

    export interface TimelineLegendCells {
        legend: TimelineLegend[];
        cells: TimelineDateCell[];
    }

    export interface TimelineLegend {
        value: string;
        index: number;
        shift?: number;
        cell: TimelineDateCell;
    }

    export interface TimelineSections {
        legend: number;
        labels: number;
        cells: number;
    }

    export interface TimelineBehaviorOptions {
        selectableCells: SelectableCell[];
        leftDateBorder: Date;
        rightDateBorder: Date;
    }

    export class TimelineWebBehavior implements IInteractiveBehavior {
        public bindEvents(options: TimelineBehaviorOptions, selectionHandler: ISelectionHandler): void {
            this.setSelection(selectionHandler, options.leftDateBorder, options.rightDateBorder, options.selectableCells);
        }

        public renderSelection(): void {}

        private setSelection(
            selectionHandler: ISelectionHandler,
            leftDateBorder: Date,
            rightDateBorder: Date,
            selectableCell: SelectableCell[]): void {
            selectionHandler.handleClearSelection();

            selectableCell.forEach((item: SelectableCell) => {
                let dateTimeInMs: number = item.value.getTime();

                if (dateTimeInMs >= leftDateBorder.getTime() && dateTimeInMs <= rightDateBorder.getTime()) {
                    selectionHandler.handleSelection(item, true);
                }
            });
        }
    }

    export class Timeline implements IVisual {
        private static Properties: any = {
            header: {
                show: <DataViewObjectPropertyIdentifier> {
                    objectName: "header",
                    propertyName: "show"
                },
                fontColor: <DataViewObjectPropertyIdentifier> {
                    objectName: "header",
                    propertyName: "fontColor"
                }
            },
            dataPoint: {
                fill: <DataViewObjectPropertyIdentifier> {
                    objectName: "dataPoint",
                    propertyName: "fill"
                },
                selectedColor: <DataViewObjectPropertyIdentifier> {
                    objectName: "dataPoint",
                    propertyName: "selectedColor"
                }
            },
            labels: {
                fontColor: <DataViewObjectPropertyIdentifier> {
                    objectName: "labels",
                    propertyName: "fontColor"
                }
            }
        };

        public static capabilities: VisualCapabilities = {
            dataRoles: [{
                    name: "Time",
                    kind: powerbi.VisualDataRoleKind.Grouping,
                    displayName: data.createDisplayNameGetter("Role_DisplayName_Values"),
                }
            ],
            dataViewMappings: [{
                conditions: [{
                        "Time": { max: 1 }
                    }
                ],
                categorical: {
                    categories: {
                        for: { in : "Time" },
                        dataReductionAlgorithm: { top: {} }
                    }
                }
            }],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter("Visual_General"),
                    properties: {
                        formatString: {
                            type: {
                                formatting: {
                                    formatString: true
                                }
                            },
                        }
                    },
                },
                header: {
                    displayName: data.createDisplayNameGetter("Visual_Header"),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter("Visual_Show"),
                            type: {
                                bool: true
                            }
                        },
                        fontColor: {
                            displayName: data.createDisplayNameGetter("Visual_FontColor"),
                            type: { fill: { solid: { color: true } } }
                        },
                    }
                },
                dataPoint: {
                    displayName: data.createDisplayNameGetter("Visual_DataPoint"),
                    properties: {
                        fill: {
                            displayName: data.createDisplayNameGetter("Visual_Fill"),
                            type: { fill: { solid: { color: true } } }
                        },
                        selectedColor: {
                            displayName: "Selection Color",
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                labels: {
                    displayName: data.createDisplayNameGetter("Visual_DataPointsLabels"),
                    properties: {
                        fontColor: {
                            displayName: data.createDisplayNameGetter("Visual_FontColor"),
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                }
            },
            supportsHighlight: true,
            sorting: {
                default: {},
            },
            drilldown: {
                roles: ["Time"]
            }
        };

        private static VisualClassName = "timeline";

        private static TimelineContainer: ClassAndSelector = {
            "class": "timelineContainer",
            selector: ".timelineContainer"
        };

        private static Header: ClassAndSelector = {
            "class": "header",
            selector: ".header"
        };

        private static Setting: ClassAndSelector = {
            "class": "setting",
            selector: ".setting"
        };

        private static Body: ClassAndSelector = {
            "class": "body",
            selector: ".body"
        };

        private static Left: ClassAndSelector = {
            "class": "left",
            selector: ".left"
        };

        private static Right: ClassAndSelector = {
            "class": "right",
            selector: ".right"
        };

        private static Legend: ClassAndSelector = {
            "class": "legend",
            selector: ".legend"
        };

        private static LegendItem: ClassAndSelector = {
            "class": "legend-item",
            selector: ".legend-item"
        };

        private static Label: ClassAndSelector = {
            "class": "label",
            selector: ".label"
        };

        private static Labels: ClassAndSelector = {
            "class": "labels",
            selector: ".labels"
        };

        private static Cursors: ClassAndSelector = {
            "class": "cursors",
            selector: ".cursors"
        };

        private static Cursor: ClassAndSelector = {
            "class": "cursor",
            selector: ".cursor"
        };

        private static Cells: ClassAndSelector = {
            "class": "cells",
            selector: ".cells"
        };

        private static Cell: ClassAndSelector = {
            "class": "cell",
            selector: ".cell"
        };

        private static Drag: ClassAndSelector = {
            "class": "drag",
            selector: ".drag"
        };

        private static SelectionRange: ClassAndSelector = {
            "class": "selectionRange",
            selector: ".selectionRange"
        };

        private static Clear: ClassAndSelector = {
            "class": "clear",
            selector: ".clear"
        };

        private static GranularityDropdown: ClassAndSelector = {
            "class": "granularity-dropdown",
            selector: ".granularity-dropdown"
        };

        private static CursorResize: ClassAndSelector = {
            "class": "cursor-resize",
            selector: ".cursor-resize"
        };

        private static DefaultRangeText: string = "All periods";
        private static RangeSeparator: string = " - ";

        private static DefaultTimeLineSettings: TimelineSettings = {
            displayName: "Timeline",
            granularity: DateGranularityEnum.Year,
            showHeader: true,
            labelColor: "#777",
            cellColor: "LightGray",
            cellSelectedColor: "rgb(253, 98, 94)",
            cellBorderColor: "#333",
            headerFontColor: "#777"
        };

        private root: D3.Selection;
        private container: D3.Selection;
        private header: D3.Selection;
        private controls: D3.Selection;
        private body: D3.Selection;
        private granularityDropdown: D3.Selection;
        private rangeText: D3.Selection;
        private clear: D3.Selection;

        private svg: D3.Selection;
        private main: D3.Selection;
        private cells: D3.Selection;
        private labels: D3.Selection;
        private legend: D3.Selection;
        private cursors: D3.Selection;

        private viewport: IViewport;
        private widthSvg: number;

        private visualUpdateOptions: VisualUpdateOptions;
        private dataView: DataView;
        private interactivityService: IInteractivityService;

        private behavior: TimelineWebBehavior;

        private settings: TimelineSettings;
        private timelineDataView: TimelineDataView;

        private colors: IDataColorPalette;
        private hostServices: IVisualHostServices;

        private scrollToLeft: number = 0;

        private margin: IMargin = {
            top: 10,
            right: 15,
            bottom: 10,
            left: 15
        };

        private sections: TimelineSections = {
            legend: 20,
            labels: 15,
            cells: 50
        };

        private options: TimelineOptions = {
            widthCell: 40,
            heightCell: 25
        };

        constructor(timelineConstructorOptions?: TimelineConstructorOptions) {
            if (timelineConstructorOptions) {
                this.svg = timelineConstructorOptions.svg || this.svg;
                this.margin = timelineConstructorOptions.margin || this.margin;
            }
        }

        public init(visualInitOptions: VisualInitOptions): void {
            let style: IVisualStyle = visualInitOptions.style;

            this.colors = style && style.colorPalette 
                ? style.colorPalette.dataColors
                : new DataColorPalette();

            if (this.container) {
                this.root = this.container;
            } else {
                this.root = d3.select(visualInitOptions.element.get(0))
                    .append("div");
            }

            this.hostServices = visualInitOptions.host;

            this.root
                .classed(Timeline.TimelineContainer["class"], true)
                .classed(Timeline.CursorResize["class"], false);

            this.header = this.root
                .append("div")
                .classed(Timeline.Header["class"], true);

            this.controls = this.root
                .append("div")
                .classed(Timeline.Setting["class"], true);

            this.body = this.root
                .append("div")
                .classed(Timeline.Body["class"], true);

            this.svg = this.body
                .append("svg")
                .classed(Timeline.VisualClassName, true);

            this.main = this.svg
                .append("g");

            this.cells = this.main
                .append("g")
                .classed(Timeline.Cells["class"], true);

            this.labels = this.main
                .append("g")
                .classed(Timeline.Labels["class"], true);

            this.legend = this.main
                .append("g")
                .classed(Timeline.Legend["class"], true);

            this.cursors = this.main
                .append("g")
                .classed(Timeline.Cursors["class"], true);

            this.rangeText = this.controls
                .append("div")
                .classed(Timeline.SelectionRange["class"], true)
                .classed(Timeline.Left["class"], true);

            this.clear = this.controls
                .append("div")
                .classed(Timeline.Clear["class"], true)
                .classed(Timeline.Right["class"], true);

            this.granularityDropdown = this.controls
                .append("select")
                .classed(Timeline.GranularityDropdown["class"], true)
                .classed(Timeline.Right["class"], true);

            this.behavior = new TimelineWebBehavior();

            if (this.behavior) {
                this.interactivityService = createInteractivityService(this.hostServices);
            }

            this.renderDropdown([
                DateGranularityEnum.Year,
                DateGranularityEnum.Month,
                DateGranularityEnum.Day
            ]);

            this.setEvents();
        }

        private renderDropdown(granularityEnum: DateGranularityEnum[]): void {
            let dropdownSelection: D3.UpdateSelection,
                dropdownElements: D3.Selection = this.controls
                    .select(Timeline.GranularityDropdown.selector)
                    .selectAll("option");

            dropdownSelection = dropdownElements.data(granularityEnum);

            dropdownSelection
                .enter()
                .append("option");

            dropdownSelection
                .attr("value", (item: DateGranularityEnum) => item)
                .text((item: DateGranularityEnum) => DateGranularityEnum[item]);

            dropdownSelection
                .exit()
                .remove();
        }

        private setEvents(): void {
            this.setOnClearEvent();
            this.setDropdownOnChange();
            this.setBodyOnScroll();
        }

        private setOnClearEvent(): void {
            let self: Timeline = this;

            this.clear.on("click", () => {
                d3.event.stopPropagation();
                
                if (!this.timelineDataView ||
                    !this.timelineDataView.cells) {
                    return;
                }

                self.updateSelectedCells(
                    this.timelineDataView.cells[0],
                    this.timelineDataView.cells[this.timelineDataView.cells.length - 1]);

                self.updateInteractivityService();
            });
        }

        private setDropdownOnChange(): void {
            let self: Timeline = this;

            this.granularityDropdown.on("change", function () {
                let elementId: number = Number(this.options[this.options.selectedIndex].value);

                self.updateAfterChangeGranularity(elementId);
            });
        }

        private setBodyOnScroll(): void {
            let self: Timeline = this;

            this.body.on("scroll.scroller", function () {
                self.onScroll(this);
            });
        }

        private onScroll(event: any): void {
            let scrollToLeft: number = event.scrollLeft;

            this.scrollToLeft = scrollToLeft;

            this.updateAfterScroll(scrollToLeft);
        }

        public update(visualUpdateOptions: VisualUpdateOptions) {
            if (!visualUpdateOptions ||
                !visualUpdateOptions.dataViews ||
                !visualUpdateOptions.dataViews[0] ||
                !visualUpdateOptions.viewport) {
                return;
            }

            let height: number =
                this.sections.legend +
                this.sections.labels + 
                this.sections.cells;

            this.visualUpdateOptions = visualUpdateOptions;

            this.setSize(visualUpdateOptions.viewport);
            this.updateElement(height, visualUpdateOptions.viewport.width);

            this.dataView = visualUpdateOptions.dataViews[0];
            
            this.updateObjects();
        }

        private updateObjects(isUpdateDataView: boolean = false): void {
            let timelineDataView: TimelineDataView = this.converter(this.dataView);

            if (!timelineDataView) {
                return;
            }

            this.timelineDataView = timelineDataView;

            this.updateAfterScroll(this.scrollToLeft);
        }

        public converter(dataView: DataView): TimelineDataView {
            if (!dataView ||
                !dataView.categorical ||
                !dataView.categorical.categories ||
                !dataView.categorical.categories[0] ||
                !dataView.categorical.categories[0].values ||
                !(dataView.categorical.categories[0].values.length > 0) ||
                !dataView.categorical.categories[0].source) {
                return null;
            }

            let legendCells: TimelineLegendCells,
                settings: TimelineSettings;

            this.dataView = dataView;
            settings = this.parseSettings(dataView);

            if (!settings) {
                return null;
            }

            if (this.settings &&
                this.timelineDataView &&
                this.settings.granularity === settings.granularity &&
                this.settings.minDate.getTime() === settings.minDate.getTime() &&
                this.settings.maxDate.getTime() === settings.maxDate.getTime()) {
                this.timelineDataView.settings = settings;

                this.updateSelectableCells();

                return this.timelineDataView;
            }

            this.settings = settings;

            legendCells = this.generateCells(
                this.settings.minDate,
                this.settings.maxDate,
                this.settings.granularity,
                dataView.categorical.categories[0]);

            return {
                settings: this.settings,
                width: this.options.widthCell,
                countOfCells: legendCells.cells.length,
                cells: legendCells.cells,
                legend: legendCells.legend,
                cursors: [{
                    index: legendCells.cells[0].index,
                    date: legendCells.cells[0].label.date,
                    position: 0
                }, {
                    index: legendCells.cells[legendCells.cells.length - 1].index,
                    date: legendCells.cells[legendCells.cells.length - 1].label.date,
                    position: 0
                }],
                selectableCells: this.generateSelectableCells(dataView.categorical.categories[0])
            };
        }

        private generateSelectableCells(categories: DataViewCategoryColumn): SelectableCell[] {
            return categories.values.map((item: Date, index: number) => {
                return {
                    value: item,
                    selected: false,
                    identity: SelectionId.createWithId(categories.identity[index])
                };
            });
        }

        private updateSelectableCells(): void {
            if (this.interactivityService &&
                this.timelineDataView &&
                this.timelineDataView.selectableCells) {
                this.interactivityService.applySelectionStateToData(this.timelineDataView.selectableCells);
            }
        }

        private parseSettings(dataView: DataView): TimelineSettings {
            let values: Date[] = dataView.categorical.categories[0].values,
                minDate: Date,
                maxDate: Date,
                granularity: DateGranularityEnum,
                objects: DataViewObjects = this.getObjectsFromDataView(dataView);

            minDate = d3.min<Date>(values);
            maxDate = d3.max<Date>(values);
            granularity = this.getGranularity();

            if (!(minDate instanceof Date) ||
                !(maxDate instanceof Date)) {
                return null;
            }

            minDate.setMonth(0, 1);

            if (values.length < 2) {
                maxDate = this.getDate(minDate, 1);
            }

            maxDate.setMonth(11, 31);

            return {
                minDate: minDate,
                maxDate: maxDate,
                granularity: granularity,
                displayName: dataView.categorical.categories[0].source.displayName || Timeline.DefaultTimeLineSettings.displayName,
                cellColor: this.getColor(Timeline.Properties.dataPoint.fill, Timeline.DefaultTimeLineSettings.cellColor, objects),
                cellSelectedColor: this.getColor(Timeline.Properties.dataPoint.selectedColor, Timeline.DefaultTimeLineSettings.cellSelectedColor, objects),
                cellBorderColor: "#333",
                showHeader: DataViewObjects.getValue(objects, Timeline.Properties.header.show, Timeline.DefaultTimeLineSettings.showHeader),
                labelColor: this.getColor(Timeline.Properties.labels.fontColor, Timeline.DefaultTimeLineSettings.labelColor, objects),
                headerFontColor: this.getColor(Timeline.Properties.header.fontColor, Timeline.DefaultTimeLineSettings.headerFontColor, objects)
            };
        }

        private getObjectsFromDataView(dataView: DataView): DataViewObjects {
            if (!dataView ||
                !dataView.metadata ||
                !dataView.metadata.columns ||
                !dataView.metadata.objects) {
                    return null;
                }

            return dataView.metadata.objects;
        }

        private getColor(properties: any, defaultColor: string, objects: DataViewObjects): string {
            let colorHelper: ColorHelper;

            colorHelper = new ColorHelper(this.colors, properties, defaultColor);
            
            return colorHelper.getColorForMeasure(objects, "");
        }

        private getGranularity(): DateGranularityEnum {
            let element: Element = this.granularityDropdown.node(),
                granularity: number =
                    Number(element["options"][element["options"]["selectedIndex"]].value);

            return granularity;
        }

        private generateCells(minDate: Date, maxDate: Date, granularity: DateGranularityEnum, categories: DataViewCategoryColumn): TimelineLegendCells {
            let timelineLegendCells: TimelineLegendCells = {
                    cells: [],
                    legend: []
                },
                currentDate: Date = this.getDate(minDate),
                step: number = 0,
                index: number = 0,
                previousGlobalLabel: string = null;

            do {
                let label: TimelineLabel = this.getLabel(currentDate, granularity, step),
                    globalLabel: string = this.labelFormatter(label.date, granularity),
                    cell: TimelineDateCell;

                cell = {
                    globalLabel: globalLabel,
                    isSelected: true,
                    label: label,
                    width: this.options.widthCell,
                    height: this.options.heightCell,
                    index: index
                };

                if (globalLabel !== previousGlobalLabel) {
                    timelineLegendCells.legend.push({
                        value: globalLabel,
                        cell: cell,
                        index: index
                    });

                    previousGlobalLabel = globalLabel;
                }

                timelineLegendCells.cells.push(cell);

                step = 1;
                index++;
                currentDate = this.getDate(label.date);
            } while (!this.compareDates(currentDate, maxDate, granularity));

            return timelineLegendCells;
        }

        private compareDates(firstDate: Date, secondDate: Date, granularity: DateGranularityEnum): boolean {
            let isEqual: boolean = false;

            switch (granularity) {
                case DateGranularityEnum.Year: {
                    isEqual = firstDate.getFullYear() === secondDate.getFullYear()
                        ? true
                        : false;
                    break;
                }
                case DateGranularityEnum.Month: {
                    isEqual = (firstDate.getFullYear() === secondDate.getFullYear()) &&
                        (firstDate.getMonth() === secondDate.getMonth())
                        ? true
                        : false;
                    break;
                }
                case DateGranularityEnum.Day: {
                    isEqual = (firstDate.getFullYear() === secondDate.getFullYear()) &&
                        (firstDate.getMonth() === secondDate.getMonth()) &&
                        (firstDate.getDate() === secondDate.getDate())
                        ? true
                        : false;
                    break;
                }
            }

            return isEqual;
        }

        private getLabel(date: Date, granularity: DateGranularityEnum, step: number): TimelineLabel {
            let currentDate: Date;

            switch (this.settings.granularity) {
                case DateGranularityEnum.Year: {
                    currentDate = this.getDate(date, step);

                    break;
                }
                case DateGranularityEnum.Month: {
                    currentDate = this.getDate(date, 0, step);

                    break;
                }
                case DateGranularityEnum.Day: {
                    currentDate = this.getDate(date, 0, 0, step);
                    break;
                }
            }

            return {
                date: currentDate,
                value: this.getStringLabelByDate(currentDate, this.settings.granularity)
            };
        }

        private getStringLabelByDate(date: Date, granularity: DateGranularityEnum): string {
            switch (granularity) {
                case DateGranularityEnum.Year: {
                    return date.getFullYear().toString();
                }
                case DateGranularityEnum.Month: {
                    return MonthsEnum[date.getMonth()];
                }
                case DateGranularityEnum.Day: {
                    return date.getDate().toString();
                }
                default: {
                    return "";
                }
            }
        }

        private labelFormatter(date: Date, granularity: DateGranularityEnum): string {
            switch (granularity) {
                case DateGranularityEnum.Year: {
                    return null;
                }
                case DateGranularityEnum.Month: {
                    return this.getStringLabelByDate(date, DateGranularityEnum.Year);
                }
                case DateGranularityEnum.Day: {
                    return `${this.getStringLabelByDate(date, DateGranularityEnum.Year)}  ${this.getStringLabelByDate(date, DateGranularityEnum.Month)}`;
                }
                default: {
                    return "";
                }
            }
        }

        private getDate(date: Date, year: number = 0, month: number = 0, day: number = 0) {
            return new Date(
                date.getFullYear() + year,
                date.getMonth() + month,
                date.getDate() + day,
                date.getHours(),
                date.getMinutes(),
                date.getSeconds(),
                date.getMilliseconds());
        }

        private updateAfterChangeGranularity(granularity: DateGranularityEnum): void {
            this.updateObjects();
        }

        private updateAfterScroll(scrollToLeft: number): void {
            let timelineDataView: TimelineDataView,
                countOfVisibleCells: number,
                startIndex: number,
                endIndex: number;

            countOfVisibleCells = Math.ceil(this.viewport.width / this.options.widthCell) + 2;
            startIndex = Math.max(0, Math.ceil(scrollToLeft / this.options.widthCell));

            endIndex = startIndex + countOfVisibleCells;

            timelineDataView = this.getDataViewByIndexes(this.timelineDataView, startIndex, endIndex);

            this.updatePositionMainElement(scrollToLeft);

            this.render(timelineDataView);
        }

        private getDataViewByIndexes(timelineDataView: TimelineDataView, startIndex: number, endIndex: number): TimelineDataView {
            if (!timelineDataView ||
                !timelineDataView.cells ||
                !(timelineDataView.cells.length > 0)) {
                return null;
            }

            let cells: TimelineDateCell[] = timelineDataView.cells.slice(startIndex, endIndex),
                legend: TimelineLegend[] = timelineDataView.legend.filter((item: TimelineLegend) => {
                    if (item.index >= startIndex && item.index <= endIndex) {
                        item.shift = item.index - startIndex;

                        return true;
                    }

                    return false;
                });

            return {
                settings: timelineDataView.settings,
                width: timelineDataView.width,
                cells: cells,
                legend: legend,
                cursors: timelineDataView.cursors,
                countOfCells: timelineDataView.countOfCells,
                selectableCells: timelineDataView.selectableCells
            };
        }

        private updatePositionMainElement(shift: number = 0): void {
            this.main.attr("transform", SVGUtil.translate(
                this.margin.left + shift,
                this.margin.top
            ));
        }

        private render(timelineDataView: TimelineDataView): void {
            if (!timelineDataView ||
                !timelineDataView.cells) {
                return;
            }

            this.updateSvgWidth();

            this.renderCells(timelineDataView);
            this.renderLabels(timelineDataView);
            this.renderLegend(timelineDataView);
            this.renderCursors(timelineDataView);
            this.renderHeader(timelineDataView);
            this.renderRangeText(timelineDataView);
        }

        private renderCells(timelineDataView: TimelineDataView): void {
            let self: Timeline = this,
                settings: TimelineSettings = timelineDataView.settings,
                cells: TimelineDateCell[] = timelineDataView.cells,
                cellsSelection: D3.UpdateSelection,
                cellsElements: D3.Selection = this.main
                    .select(Timeline.Cells.selector)
                    .selectAll(Timeline.Cell.selector);

            cellsSelection = cellsElements.data(cells);

            cellsSelection
                .enter()
                .append("svg:rect");

            cellsSelection
                .attr("x", 0)
                .attr("y", 0)
                .attr("transform", (item: TimelineDateCell, index: number) => {
                    return SVGUtil.translate(item.width * index, 0);
                })
                .attr("fill", (item: TimelineDateCell) => {
                    if (item.isSelected) {
                        return settings.cellSelectedColor;
                    } else {
                        return settings.cellColor;
                    }
                })
                .attr("stroke", (item: TimelineDateCell) => settings.cellBorderColor)
                .attr("height", (item: TimelineDateCell) => item.height)
                .attr("width", (item: TimelineDateCell) => item.width)
                .attr("value", (item: TimelineDateCell) => item.globalLabel)
                .on("click", (item: TimelineDateCell, index: number) => {
                    self.updateSelectedCells(item, item);

                    self.updateInteractivityService();
                })
                .classed(Timeline.Cell["class"], true);

            cellsSelection
                .exit()
                .remove();
        }

        private renderLabels(timelineDataView: TimelineDataView): void {
            let cells: TimelineDateCell[] = timelineDataView.cells,
                settings: TimelineSettings = timelineDataView.settings,
                labelsSelection: D3.UpdateSelection,
                labelsElements: D3.Selection = this.main
                    .select(Timeline.Labels.selector)
                    .selectAll(Timeline.Label.selector);

            labelsSelection = labelsElements.data(cells);

            labelsSelection
                .enter()
                .append("svg:text");

            labelsSelection
                .attr("x", 0)
                .attr("y", 0)
                .attr("transform", (item: TimelineDateCell, index: number) => {
                    let shift: number = item.width * index + item.width / 2;

                    return SVGUtil.translate(shift, 0);
                })
                .style("fill", settings.labelColor)
                .text((item: TimelineDateCell) => item.label.value)
                .classed(Timeline.Label["class"], true);

            labelsSelection
                .exit()
                .remove();
        }

        private renderLegend(timelineDataView: TimelineDataView): void {
            let settings: TimelineSettings = timelineDataView.settings,
                legend: TimelineLegend[] = timelineDataView.legend,
                legendSelection: D3.UpdateSelection,
                legendElements: D3.Selection = this.main
                    .select(Timeline.Legend.selector)
                    .selectAll(Timeline.LegendItem.selector);

            legendSelection = legendElements.data(legend);

            legendSelection
                .enter()
                .append("svg:text");

            legendSelection
                .attr("x", 0)
                .attr("y", 0)
                .attr("transform", (item: TimelineLegend) => {
                    let shift: number = item.cell.width * item.shift + item.cell.width / 2;

                    return SVGUtil.translate(shift, 0);
                })
                .style("fill", settings.labelColor)
                .text((item: TimelineLegend) => item.value)
                .classed(Timeline.LegendItem["class"], true);

            legendSelection
                .exit()
                .remove();
        }

        private renderHeader(timelineDataView: TimelineDataView): void {
            let settings: TimelineSettings = timelineDataView.settings,
                headerText: string = timelineDataView.settings.displayName;

            if (timelineDataView.settings.showHeader) {
                this.header.style("display", null);
            } else {
                this.header.style("display", "none");
            }

            this.header
                .style("color", settings.headerFontColor)
                .text(headerText);
        }

        private renderRangeText(timelineDataView: TimelineDataView): void {
            this.rangeText
                .style("color", timelineDataView.settings.labelColor)
                .text(this.getRangeText(timelineDataView));
        }

        private getRangeText(timelineDataView: TimelineDataView): string {
            let cursors: TimelineCursor[] = timelineDataView.cursors,
                granularity: DateGranularityEnum = timelineDataView.settings.granularity;

            if (cursors[0].index === 0 && cursors[1].index === timelineDataView.countOfCells - 1) {
                return Timeline.DefaultRangeText;
            }

            let dateFirst: Date = cursors[0].date,
                dateSecond: Date = cursors[1].date,
                years: string[] = this.formatYear(dateFirst, dateSecond),
                months: string[] = this.formatMonth(dateFirst, dateSecond);

            switch (granularity) {
                case DateGranularityEnum.Year: {
                    if (dateFirst.getFullYear() === dateSecond.getFullYear()) {
                        return years[0];
                    }

                    return years.join(Timeline.RangeSeparator);
                }
                case DateGranularityEnum.Month: {
                    if (dateFirst.getFullYear() === dateSecond.getFullYear()) {
                        if (dateFirst.getMonth() === dateSecond.getMonth()) {
                            return `${months[0]} ${years[0]}`;
                        } else {
                            return `${months[0]} ${Timeline.RangeSeparator} ${months[1]} ${years[0]}`;
                        }
                    } else {
                        return `${months[0]} ${years[0]} ${Timeline.RangeSeparator} ${months[1]} ${years[1]}`;
                    }
                }
                case DateGranularityEnum.Day: {
                    let days: string[] = [`${this.getStringLabelByDate(cursors[0].date, DateGranularityEnum.Day)}`, ""];

                    if (cursors[0].date.getDate() !== cursors[1].date.getDate()) {
                        days[1] = `${this.getStringLabelByDate(cursors[1].date, DateGranularityEnum.Day)}`;
                    }

                    if (dateFirst.getFullYear() === dateSecond.getFullYear()) {
                        if (dateFirst.getMonth() === dateSecond.getMonth()) {
                            if (dateFirst.getDate() === dateSecond.getDate()) {
                                return `${days[0]} ${months[0]} ${years[0]}`;
                            } else {
                                return `${days[0]} ${Timeline.RangeSeparator} ${days[1]} ${months[0]} ${years[0]}`;
                            }
                        } else {
                            return `${days[0]} ${months[0]} ${Timeline.RangeSeparator} ${days[1]} ${months[1]} ${years[0]}`;
                        }
                    } else {
                        return `${days[0]} ${months[0]} ${years[1]} ${Timeline.RangeSeparator} ${days[1]} ${months[1]} ${years[1]}`;
                    }
                }
            }

            return "";
        }

        private formatYear(dateFirst: Date, dateSecond: Date): string[] {
            let years: string[] = [`${this.getStringLabelByDate(dateFirst, DateGranularityEnum.Year)}`, ""];

            if (dateFirst.getFullYear() !== dateSecond.getFullYear()) {
                years[1] = `${this.getStringLabelByDate(dateSecond, DateGranularityEnum.Year)}`;
            }

            return years;
        }

        private formatMonth(dateFirst: Date, dateSecond: Date): string[] {
            let month: string[] = [`${this.getStringLabelByDate(dateFirst, DateGranularityEnum.Month)}`, ""];

            if (dateFirst.getMonth() !== dateSecond.getMonth()) {
                month[1] = `${this.getStringLabelByDate(dateSecond, DateGranularityEnum.Month)}`;
            }

            return month;
        }

        private updateCursors(leftCell: TimelineDateCell, rightCell: TimelineDateCell): void {
            if (!this.timelineDataView ||
                !this.timelineDataView.cursors ||
                !(this.timelineDataView.cursors.length === 2) ||
                !this.timelineDataView.settings) {
                return;
            }

            let cursors: TimelineCursor[] = this.timelineDataView.cursors,
                year: number = rightCell.label.date.getFullYear(),
                month: number = rightCell.label.date.getMonth(),
                date: number = rightCell.label.date.getDate();

            cursors[0].index = leftCell.index;
            cursors[0].date = leftCell.label.date;

            cursors[1].index = rightCell.index;

            switch (this.timelineDataView.settings.granularity) {
                
                case DateGranularityEnum.Year: {
                    cursors[1].date = new Date(year, 11, 31);
                    break;
                }
                case DateGranularityEnum.Month: {
                    cursors[1].date = new Date(year, month + 1, 0);
                    break;
                }
                case DateGranularityEnum.Day: {
                    cursors[1].date = new Date(year, month, date);
                    break;
                }
            }

            cursors[1].date.setHours(23);
            cursors[1].date.setMinutes(59);
            cursors[1].date.setSeconds(59);
        }

        private updateSelectedCellsByCursors(cursors: TimelineCursor[]): void {
            if (!this.timelineDataView ||
                !this.timelineDataView.cells ||
                !cursors ||
                !(cursors.length === 2)) {
                return;
            }

            this.updateSelectedCells(
                this.timelineDataView.cells[cursors[0].index],
                this.timelineDataView.cells[cursors[1].index]);
        }

        private updateSelectedCells(leftCell: TimelineDateCell, rightCell: TimelineDateCell): void {
            if (!this.timelineDataView ||
                !this.timelineDataView.cells ||
                !this.timelineDataView.cursors) {
                return;
            }

            let cells: TimelineDateCell[] = this.timelineDataView.cells;

            this.updateCursors(leftCell, rightCell);

            cells.forEach((item: TimelineDateCell) => {
                if (item.index >= leftCell.index && item.index <= rightCell.index) {
                    item.isSelected = true;
                } else {
                    item.isSelected = false;
                }
            });

            this.updateAfterScroll(this.scrollToLeft);
        }

        private renderCursors(timelineDataView: TimelineDataView): void {
            let self: Timeline = this,
                cursors: TimelineCursor[] = timelineDataView.cursors,
                cursorsSelection: D3.UpdateSelection,
                cursorsElements: D3.Selection = this.main
                    .select(Timeline.Cursors.selector)
                    .selectAll(Timeline.Cursor.selector),
                dragEvent: D3.Behavior.Drag;

            dragEvent = d3.behavior.drag()
                .on("dragstart", () => {
                    d3.event.sourceEvent.stopPropagation();

                    self.svg.classed(Timeline.Drag["class"], true);
                })
                .on("drag", function drag(item: TimelineCursor, index: number) {
                    let dx: TimelineObjectShift = self.getCursorShiftByAxes(item, self.scrollToLeft),
                        shift: TimelineObjectShift = self.getCursorShiftByAxes(item, dx.dx - d3.event.x + self.scrollToLeft);

                    item = self.updateCursorPosition(item, shift.dx);

                    self.updateSelectedCellsByCursors(cursors);
                })
                .on("dragend", () => {
                    self.svg.classed(Timeline.Drag["class"], false);

                    self.updateInteractivityService();
                });

            cursorsSelection = cursorsElements.data(cursors);

            cursorsSelection
                .enter()
                .append("svg:path");

            cursorsSelection
                .attr("d", d3.svg.arc()
                    .innerRadius(0)
                    .outerRadius(this.options.heightCell / 2)
                    .startAngle((item: TimelineCursor, index: number) => index * Math.PI + Math.PI)
                    .endAngle((item: TimelineCursor, index: number) => index * Math.PI + 2 * Math.PI)
                )
                .attr("transform", (item: TimelineCursor, index: number) => {
                    let shift: TimelineObjectShift = self.getCursorShiftByAxes(item, self.scrollToLeft);

                    shift.dx += self.options.widthCell * index;

                    item.position = shift.dx;

                    return SVGUtil.translate(shift.dx, shift.dy);
                })
                .attr("fill", "grey")
                .call(dragEvent)
                .classed(Timeline.Drag["class"], true)
                .classed(Timeline.Cursor["class"], true);

            cursorsSelection
                .exit()
                .remove();
        }

        private updateInteractivityService(): void {
            this.interactivityService.bind(this.timelineDataView.selectableCells, this.behavior, <TimelineBehaviorOptions> {
                leftDateBorder: this.timelineDataView.cursors[0].date,
                rightDateBorder: this.timelineDataView.cursors[1].date,
                selectableCells: this.timelineDataView.selectableCells
            });
        }

        private updateCursorPosition(cursor: TimelineCursor, shiftByAxisX: number): TimelineCursor {
            if (!this.timelineDataView ||
                !this.timelineDataView.cursors ||
                !this.timelineDataView.cells) {
                return cursor;
            }

            let leftCursor: TimelineCursor = this.timelineDataView.cursors[0],
                rightCursor: TimelineCursor = this.timelineDataView.cursors[1],
                quntityOfCells: number = this.timelineDataView.cells.length - 1;

            if (cursor.position > shiftByAxisX) {
                cursor.index--;
            } else if (cursor.position < shiftByAxisX) {
                cursor.index++;
            }

            if (cursor === leftCursor) {
                cursor.index = cursor.index > rightCursor.index 
                    ? rightCursor.index
                    : cursor.index;
            } else if (cursor === rightCursor) {
                cursor.index = cursor.index < leftCursor.index 
                    ? leftCursor.index
                    : cursor.index;
            }

            cursor.index = cursor.index <= 0
                ? 0
                : cursor.index;

            cursor.index = cursor.index >= quntityOfCells
                ? quntityOfCells
                : cursor.index;

            return cursor;
        }

        private getCursorShiftByAxes(cursor: TimelineCursor, shift: number): TimelineObjectShift {
            let dx: number = this.options.widthCell * Math.ceil(shift / this.options.widthCell);

            return {
                dx: cursor.index * this.options.widthCell - dx,
                dy: this.options.heightCell / 2
            };
        }

        private setSize(viewport: IViewport): void {
            let height: number,
                width: number;

            height =
                viewport.height -
                this.margin.top -
                this.margin.bottom;

            width =
                viewport.width -
                this.margin.left -
                this.margin.right;

            this.viewport = {
                height: height,
                width: width
            };
        }

        private updateElement(height: number, width: number): void {
            let translateForCellsAndCursors: string = 
                SVGUtil.translate(0, this.sections.labels + this.sections.legend);
            
            this.svg.attr({
                height: height,
                width: width
            });

            this.updatePositionMainElement();

            this.legend.attr("transform", SVGUtil.translate(0, 0));

            this.labels.attr("transform", SVGUtil.translate(
                0,
                this.sections.legend
            ));

            this.cells.attr("transform", translateForCellsAndCursors);

            this.cursors.attr("transform", translateForCellsAndCursors);
        }

        private updateSvgWidth(): void {
            let width: number = 
                this.timelineDataView.cells.length * this.options.widthCell + this.options.widthCell;

            this.widthSvg = width;

            this.svg.attr("width", width);
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            var instances: VisualObjectInstance[] = [],
                settings: TimelineSettings;

            if (!this.timelineDataView ||
                !this.timelineDataView.settings) {
                return instances;
            }

            settings = this.timelineDataView.settings;

            switch (options.objectName) {
                case "header": {
                    let header: VisualObjectInstance  = {
                        objectName: "header",
                        displayName: "header",
                        selector: null,
                        properties: {
                            show: settings.showHeader,
                            fontColor: settings.headerFontColor
                        }
                    };

                    instances.push(header);
                    break;
                }
                case "dataPoint": {
                    let dataPoint: VisualObjectInstance = {
                        objectName: "dataPoint",
                        displayName: "dataPoint",
                        selector: null,
                        properties: {
                            fill: settings.cellColor,
                            selectedColor: settings.cellSelectedColor
                        }
                    };

                    instances.push(dataPoint);
                    break;
                }
                case "labels": {
                    let labels: VisualObjectInstance = {
                        objectName: "labels",
                        displayName: "labels",
                        selector: null,
                        properties: {
                            fontColor: settings.labelColor
                        }
                    };

                    instances.push(labels);
                    break;
                }
            }

            return instances;
        }

        public destroy(): void {
            this.root = null;
        }
    }
}