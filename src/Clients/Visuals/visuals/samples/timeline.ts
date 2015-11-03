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

/// <reference path="../../_references.ts"/>

module powerbi.visuals.samples {

    export interface TimelineData {
        dragging: boolean;
        categorySourceName: string;
        columnIdentity: powerbi.data.SQExpr;
        cursorDatapoints: CursorDatapoint[];
        timelineDatapoints: TimelineDatapoint[];
        aggregatedList: AggregatedDatapoint[];
        granularity: string;
        graChanged: boolean;
    }

    export interface TimelineFormat {
        showHeader: boolean;
        leftMargin: number;
        rightMargin: number;
        topMargin: number;
        bottomMargin: number;
        timeRangeSize: number;
        textSize: number;
        cellWidth: number;
        cellHeight: number;
        cellsYPosition: number;
        textYPosition: number;
        cellColor: Fill;
    }

    export interface TimelineSelection {
        startDate: number;
        startMonth: number;
        startQuarter: number;
        startYear: number;
        endDate: number;
        endMonth: number;
        endQuarter: number;
        endYear: number;
        allPeriod: boolean;
    }

    export interface CursorDatapoint {
        index: number;
        cursorPosition: number;
    }

    export interface AggregatedDatapoint {
        name: string;
        granularity: number;
        year: number;
        quarter: number;
        month: number;
        date: number;
        index: number;
        monthName: string;
        timelineDatapoints: TimelineDatapoint[];
        tooltipInfo: TooltipDataItem[];
    }

    export interface TimelineDatapoint extends SelectableDataPoint {
        label: string;
        index: number;
        value?: number;
    }

    export interface TimelineBehaviorOptions {
        rangeText: D3.Selection;
        timeUnitCells: D3.Selection;
        cursors: D3.Selection;
        clearCatcher: D3.Selection;
        timelineClear: D3.Selection;
        mainGroup: D3.Selection;
        timelineData: TimelineData;
        timelineFormat: TimelineFormat;
        timelineSelection: TimelineSelection;
        interactivityService: IInteractivityService;
        hostServices: IVisualHostServices;
    }

    export class TimelineWebBehavior implements IInteractiveBehavior {
        private timeUnitCells: D3.Selection;
        private cursors: D3.Selection;
        private rangeText: D3.Selection;
        private timelineData: TimelineData;
        private timelineFormat: TimelineFormat;
        private currentSelection: AggregatedDatapoint;
        public bindEvents(options: TimelineBehaviorOptions, selectionHandler: ISelectionHandler): void {
            let timeUnitCells = this.timeUnitCells = options.timeUnitCells;
            let cursors = this.cursors = options.cursors;
            this.rangeText = options.rangeText;
            let timelineClear = options.timelineClear;
            let timelineData = this.timelineData = options.timelineData;
            let timelineFormat = this.timelineFormat = options.timelineFormat;
            let cursorDatapoints = options.timelineData.cursorDatapoints;
            let aggList = options.timelineData.aggregatedList;
            let interactivityService = options.interactivityService;
            let that = this;

            if (timelineData.graChanged) {
                this.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService, options);
                this.adjustSelection(selectionHandler);
                that.setRange(timelineData, options.timelineSelection);
                timelineData.graChanged = false;
            }

            timeUnitCells.on("click", (d: AggregatedDatapoint) => {
                d3.event.preventDefault();

                if (d3.event.ctrlKey || d3.event.altKey) {//d.granularity
                    
                    if (this.currentSelection.index > d.index) {
                        cursorDatapoints[0].cursorPosition = d.index;
                        cursorDatapoints[1].cursorPosition = this.currentSelection.index + 1;
                    }
                    else {
                        cursorDatapoints[0].cursorPosition = this.currentSelection.index;
                        cursorDatapoints[1].cursorPosition = d.index + 1;
                    }

                } else {
                    cursorDatapoints[0].cursorPosition = d.index;
                    cursorDatapoints[1].cursorPosition = d.index + 1;
                    this.currentSelection = d;
                }
                that.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService, options);
                that.setRange(timelineData, options.timelineSelection);
                that.renderCursors(cursors, cursorDatapoints, timelineFormat);
                that.renderSelection(true);
                that.renderRangeText(options.timelineData, options.timelineSelection);

            });
            let drag = d3.behavior.drag()
                .origin(function (d) {
                    return d;
                })
                .on("dragstart", dragstarted)
                .on("drag", dragged)
                .on("dragend", dragended);

            function dragstarted(d) {
                if (d3.event.sourceEvent.stopPropagation)
                    d3.event.sourceEvent.stopPropagation();
                d3.select(this).classed("dragging", true);
                options.timelineData.dragging = true;
            }

            function dragged(d) {
                if (options.timelineData.dragging === true) {
                    let xScale = 1;
                    let yScale = 1;
                    let container = d3.select(".displayArea");
                    if (container !== undefined) {
                        let transform = container.style("transform");
                        if (transform !== undefined && transform !== 'none') {
                            let str = transform.split("(")[1];
                            xScale = Number(str.split(", ")[0]);
                            yScale = Number(str.split(", ")[3]);
                        }
                    }
                    let xCoord = (d3.event.sourceEvent.x - options.mainGroup.node().getBoundingClientRect().left) / xScale;
                    if (Timeline.isIE() === true) {
                        xCoord = d3.event.sourceEvent.x / xScale + (d3.select(".cellContainer").node().scrollLeft);
                    }
                    let index = Math.round(xCoord / timelineFormat.cellWidth);
                    if (index < 0) {
                        index = 0;
                    }
                    if (index > aggList.length) {
                        index = aggList.length;
                    }
                    if (d.cursorPosition !== index) {
                        d.cursorPosition = index;

                        if (d.index === 0) {
                            if (d.cursorPosition >= cursorDatapoints[1].cursorPosition) {
                                d.cursorPosition = cursorDatapoints[1].cursorPosition - 1;
                            }
                        } else {
                            if (d.cursorPosition <= cursorDatapoints[0].cursorPosition) {
                                d.cursorPosition = cursorDatapoints[0].cursorPosition + 1;
                            }
                        }
                        that.setRange(timelineData, options.timelineSelection);
                        that.renderCursors(cursors, cursorDatapoints, timelineFormat);
                        that.renderSelection(true);
                        that.renderRangeText(options.timelineData, options.timelineSelection);
                    }
                }
            }

            function dragended(d) {
                d3.select(this).classed("dragging", false);
                options.timelineData.dragging = false;
                that.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService, options);
                that.setRange(timelineData, options.timelineSelection);
            }

            cursors.call(drag);

            timelineClear.on("click", (d: SelectableDataPoint) => {
                cursorDatapoints[0].cursorPosition = -1;
                cursorDatapoints[1].cursorPosition = -1;
                that.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService, options);
                that.setRange(timelineData, options.timelineSelection);
                that.renderCursors(cursors, cursorDatapoints, timelineFormat);
                that.renderSelection(false);
                that.renderRangeText(options.timelineData, options.timelineSelection);
                let objects: VisualObjectInstancesToPersist = {
                    merge: [
                        <VisualObjectInstance> {
                            objectName: "general",
                            selector: undefined,
                            properties: {
                                "filter": undefined
                            }
                        }
                    ]
                };
                options.hostServices.persistProperties(objects);
                options.hostServices.onSelect({ data: [] });
            });
        }
        public adjustSelection(selectionHandler: ISelectionHandler) {

        }
        public setSelection(selectionHandler: ISelectionHandler, timelineData: TimelineData, timelineSelection: TimelineSelection, interactivityService: IInteractivityService, options: TimelineBehaviorOptions) {
            let aggList = timelineData.aggregatedList;
            let cursorDatapoints = timelineData.cursorDatapoints;
            let startIndex = cursorDatapoints[0].cursorPosition;
            if (startIndex < 0)
                return;
            let startPoint = aggList[startIndex];
            let startMonth = startPoint.month - 1;
            if (startPoint.month < 0) {
                if (startPoint.quarter > 0) {
                    startMonth = (startPoint.quarter - 1) * 3;
                } else {
                    startMonth = 0;
                }
            }

            let startDate = new Date(startPoint.year, startMonth, startPoint.date > 0 ? startPoint.date : 1);
            let endIndex = cursorDatapoints[1].cursorPosition - 1;
            let endPoint = aggList[endIndex];
            let endMonth = endPoint.month - 1;
            if (endPoint.month < 0) {
                if (endPoint.quarter > 0) {
                    endMonth = (endPoint.quarter) * 3 - 1;
                } else {
                    endMonth = 11;
                }
            }
            let endDate = new Date(endPoint.year, endMonth, endPoint.date > 0 ? endPoint.date : new Date(endPoint.year, endMonth + 1, 0).getDate());
            let filterExpr = powerbi.data.SQExprBuilder.between(timelineData.columnIdentity, powerbi.data.SQExprBuilder.dateTime(startDate), powerbi.data.SQExprBuilder.dateTime(endDate));
            let filter = powerbi.data.SemanticFilter.fromSQExpr(filterExpr);

            let objects: VisualObjectInstancesToPersist = {
                merge: [
                    <VisualObjectInstance> {
                        objectName: "general",
                        selector: undefined,
                        properties: {
                            "filter": filter
                        }
                    }
                ]
            };
            options.hostServices.persistProperties(objects);
            options.hostServices.onSelect({ data: [] });
        }
        public setRange(timelineData: TimelineData, timelineSelection: TimelineSelection) {
            let aggList = timelineData.aggregatedList;
            let cursorDatapoints = timelineData.cursorDatapoints;
            if (cursorDatapoints[0].cursorPosition < cursorDatapoints[1].cursorPosition) {
                timelineSelection.allPeriod = false;
                let minIndex = cursorDatapoints[0].cursorPosition;
                let maxIndex = cursorDatapoints[1].cursorPosition - 1;
                let minAggPoint = aggList[minIndex];
                let maxAggPoint = aggList[maxIndex];
                timelineSelection.startYear = minAggPoint.year;
                timelineSelection.endYear = maxAggPoint.year;
                if (timelineData.granularity === "day") {
                    timelineSelection.startDate = minAggPoint.date;
                    timelineSelection.startMonth = minAggPoint.month;
                    timelineSelection.startQuarter = minAggPoint.quarter;
                    timelineSelection.endDate = maxAggPoint.date;
                    timelineSelection.endMonth = maxAggPoint.month;
                    timelineSelection.endQuarter = maxAggPoint.quarter;
                } else if (timelineData.granularity === "quarter") {
                    timelineSelection.startDate = 1;
                    timelineSelection.startMonth = (minAggPoint.quarter - 1) * 3 + 1;
                    timelineSelection.startQuarter = minAggPoint.quarter;
                    timelineSelection.endMonth = maxAggPoint.quarter * 3;
                    timelineSelection.endQuarter = maxAggPoint.quarter;
                    timelineSelection.endDate = new Date(maxAggPoint.year, maxAggPoint.month, 0).getDate();
                } else if (timelineData.granularity === "year") {
                    timelineSelection.startDate = 1;
                    timelineSelection.startMonth = 1;
                    timelineSelection.startQuarter = 1;
                    timelineSelection.endDate = 31;
                    timelineSelection.endMonth = 12;
                    timelineSelection.endQuarter = 4;
                } else {
                    timelineSelection.startDate = 1;
                    timelineSelection.startMonth = minAggPoint.month;
                    timelineSelection.startQuarter = minAggPoint.quarter;
                    timelineSelection.endQuarter = maxAggPoint.quarter;
                    timelineSelection.endMonth = maxAggPoint.month;
                    timelineSelection.endDate = new Date(maxAggPoint.year, maxAggPoint.month, 0).getDate();
                }
            } else {
                timelineSelection.allPeriod = true;
            }
        }

        public renderCursors(cursors: D3.Selection, cursorDatapoints: CursorDatapoint[], timelineFormat: TimelineFormat) {
            cursors.attr('transform', function (d) {
                return "translate(" + d.cursorPosition * timelineFormat.cellWidth + "," + (timelineFormat.cellHeight / 2 + timelineFormat.cellsYPosition) + ")";
            });
        }

        public renderSelection(hasSelection: boolean): void {
            let timelineData = this.timelineData;
            let timelineFormat = this.timelineFormat;
            this.timeUnitCells.style('fill', d => Timeline.getCellColor(d, timelineData, timelineFormat));
            if (d3.event.stopPropagation)
                d3.event.stopPropagation();
        }

        public renderRangeText(timelineData: TimelineData, timelineSelection: TimelineSelection) {
            let timeRangeText = Timeline.getTimeRangeText(timelineData, timelineSelection);
            this.rangeText.select('text').text(timeRangeText);
        }

    }

    export class Timeline implements IVisual {
        public static capabilities: VisualCapabilities = {
            dataRoles: [{
                name: 'Time',
                kind: powerbi.VisualDataRoleKind.Grouping,
                displayName: 'Time',
            }],
            dataViewMappings: [{
                conditions: [
                    { 'Time': { max: 1 } }//,'Value': { max: 1 }}
                ],
                categorical: {
                    categories: {
                        for: { in: 'Time' },
                        dataReductionAlgorithm: { sample: {} }
                    },
                    values: {
                        select: []
                    },
                }
            }],

            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: {
                                formatting: {
                                    formatString: true
                                }
                            },
                        },
                        selected: {
                            type: { bool: true }
                        },
                        filter: {
                            type: { filter: {} },
                            rule: {
                                output: {
                                    property: 'selected',
                                    selector: ['Time'],
                                }
                            }
                        },
                    },
                },
                header: {
                    displayName: data.createDisplayNameGetter('Visual_Header'),
                    properties: {
                        show: {
                            displayName: data.createDisplayNameGetter('Visual_Show'),
                            type: { bool: true }
                        },
                        fontColor: {
                            displayName: data.createDisplayNameGetter('Visual_FontColor'),
                            type: { fill: { solid: { color: true } } }
                        },
                    }
                },
                granularity: {
                    displayName: 'Granularity',
                    properties: {
                        types: {
                            displayName: 'Type',
                            type: { text: true }
                        },
                    }
                },
                timeRangeColor: {
                    displayName: 'Time Range Text Color',
                    properties: {
                        fill: {
                            displayName: 'Fill',
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
                cellColor: {
                    displayName: 'Selection Color',
                    properties: {
                        fill: {
                            displayName: 'Fill',
                            type: { fill: { solid: { color: true } } }
                        }
                    }
                },
            }
        };
        private static monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        private static VisualClassName = 'timeline';

        private static TimelineContainer: ClassAndSelector = {
            class: 'timelineContainer',
            selector: '.timelineContainer'
        };
        private static Header: ClassAndSelector = {
            class: 'header',
            selector: '.header'
        };
        private static CellContainer: ClassAndSelector = {
            class: 'cellContainer',
            selector: '.cellContainer'
        };
        private static CellTextLevel1: ClassAndSelector = {
            class: 'cellTextLevel1',
            selector: '.cellTextLevel1'
        };
        private static CellTextLevel2: ClassAndSelector = {
            class: 'cellTextLevel2',
            selector: '.cellTextLevel2'
        };
        private static Cursor: ClassAndSelector = {
            class: 'cursor',
            selector: '.cursor'
        };
        private static Cell: ClassAndSelector = {
            class: 'cell',
            selector: '.cell'
        };
        private static Clear: ClassAndSelector = {
            class: 'clear',
            selector: '.clear'
        };
        private static SelectionRange: ClassAndSelector = {
            class: 'selectionRange',
            selector: '.selectionRange'
        };

        private svg: D3.Selection;
        private body: D3.Selection;
        private header: D3.Selection;
        private headerTextContainer: D3.Selection;
        private rangeText: D3.Selection;
        private mainGroupElement: D3.Selection;
        private cursorGroupElement: D3.Selection;
        public timelineFormat: TimelineFormat;
        public timelineSelection: TimelineSelection;
        private dataView: DataView;
        private interactivityService: IInteractivityService;
        private behavior: TimelineWebBehavior;
        private data: TimelineData;
        private clearCatcher: D3.Selection;
        private dropdownbox: D3.Selection;
        private options: VisualUpdateOptions;
        private graType: string;
        private graChanged: boolean;
        private hostServices: IVisualHostServices;

        public static isIE(): boolean {
            let ua = navigator.userAgent, tem,
                M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if (/trident/i.test(M[1])) {
                tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                return true;
            }
            if (M[1] === 'Chrome') {
                tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
                if (tem !== null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
            }
            M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
            if ((tem = ua.match(/version\/(\d+)/i)) !== null) M.splice(1, 1, tem[1]);
            return false;
        }
        public init(options: VisualInitOptions): void {
            this.hostServices = options.host;

            let msie = Timeline.isIE();
            let element = options.element;
            this.timelineFormat = {
                showHeader: true,
                leftMargin: 15,
                rightMargin: 15,
                topMargin: 8,
                bottomMargin: 10,
                timeRangeSize: 11,
                textSize: 11,
                cellWidth: 40,
                cellHeight: 25,
                textYPosition: 0,
                cellsYPosition: 0,
                cellColor: { solid: { color: '#ADD8E6' } }
            };
            if (msie) {
                this.timelineFormat.bottomMargin = 25;
            }

            this.timelineFormat.textYPosition = this.timelineFormat.topMargin * 2 + this.timelineFormat.timeRangeSize;
            this.timelineFormat.cellsYPosition = this.timelineFormat.topMargin * 3 + this.timelineFormat.textSize * 2 + this.timelineFormat.timeRangeSize;
            this.timelineSelection = {
                startDate: -1,
                startMonth: -1,
                startQuarter: -1,
                startYear: -1,
                endDate: -1,
                endMonth: -1,
                endQuarter: -1,
                endYear: -1,
                allPeriod: true
            };
            let timelineContainer = d3.select(element.get(0)).append('div').classed(Timeline.TimelineContainer.class, true);
            this.header = timelineContainer.append('div').classed(Timeline.Header.class, true);
            let body = this.body = timelineContainer.append('div').classed(Timeline.CellContainer.class, true);
            this.rangeText = body.append('div')
                .style({
                    'float': 'left',
                    'position': 'absolute',
                    'left': '10px'
                });
            this.body.append('span')
                .classed(Timeline.Clear.class, true)
                .attr('title', 'clear')
                .style({
                    'position': 'absolute',
                    'right': '10px',
                    'background-image': "url(\"https://raw.githubusercontent.com/Microsoft/PowerBI-visuals/master/src/Clients/Visuals/images/sprite-src/slicer_reset.png\")",
                    'background-position': '0px 0px',
                    'width': '13px',
                    'height': '12px',
                    'float': 'right',
                    'margin': '4px 2px',
                    'cursor': 'pointer'
                });
            let dropdownbox = this.dropdownbox = body.append("div")
                .attr("x", 10)
                .attr("y", 20)
                .style({
                    'float': 'right',
                    "z-index": 99999,
                    'position': 'absolute',
                    'right': '30px'
                })
                .append('select')
                .attr('id', 'granularity')
                .style({
                    "background": "transparent",
                    "width": "80px",
                    "font-size": "11px",
                    "line-height": 1,
                    "border-radius": "1px",
                    "height": "20px"
                });
            dropdownbox.append('option')
                .attr('value', 'day')
                .style("margin-top", "-2em")
                .text('day');
            dropdownbox.append('option')
                .attr('value', 'month')
                .attr('selected', 'selected')
                .style("margin-top", "-2em")
                .text('month');
            dropdownbox.append('option')
                .attr('value', 'quarter')
                .style("margin-top", "-2em")
                .text('quarter');
            dropdownbox.append('option')
                .attr('value', 'year')
                .style("margin-top", "-2em")
                .text('year');
            let that = this;
            this.graType = "month";
            this.graChanged = false;
            dropdownbox.on("change", function () {
                that.graType = this.options[this.selectedIndex].value;
                that.graChanged = true;
                that.setData(that.options, that.dataView, that.graType, true);
            });

            let svg = this.svg = body
                .append('svg')
                .classed(Timeline.VisualClassName, true);
            this.behavior = new TimelineWebBehavior();
            if (this.behavior) {
                this.interactivityService = createInteractivityService(options.host);
                this.clearCatcher = this.svg.append("rect").classed("clearCatcher", true).attr({
                    'height': '100%',
                    'width': '100%'
                });
            }

            let hederTextContainer = this.headerTextContainer = this.header.append('div');
            hederTextContainer.append('g')
                .attr('transform', "translate(0,10)")
                .append('text')
                .attr({
                    'x': 10,
                    'y': 10
                });

            this.mainGroupElement = svg.append('g');
            this.cursorGroupElement = svg.append('g');

        }

        public static initAggList(granularity: string, catValues: any[]): AggregatedDatapoint[] {
            let aggregatedDatapoints: AggregatedDatapoint[] = [];

            let min = new Date(catValues[0]).getTime();
            let max = min;
            for (var i = 0, len = catValues.length; i < len; i++) {
                let d = new Date(catValues[i]).getTime();
                if (min > d) {
                    min = d;
                }
                if (max < d) {
                    max = d;
                }
            }
            let minDate = new Date(min);
            let minYear = minDate.getFullYear();
            let maxDate = new Date(max);
            let maxYear = maxDate.getFullYear();

            if (granularity === 'day') {
                for (var i = minYear; i <= maxYear; i++) {
                    for (var j = 1; j <= 12; j++) {
                        let numDays = new Date(i, j, 0).getDate();
                        for (var k = 1; k <= numDays; k++) {
                            let date = new Date(i, j - 1, k);
                            if (date.getTime() >= min && date.getTime() <= max)
                                aggregatedDatapoints.push({
                                    name: "" + k,
                                    year: i,
                                    quarter: Math.floor((j - 1) / 3 + 1),
                                    month: j,
                                    date: k,
                                    monthName: Timeline.monthNames[j - 1],
                                    granularity: 0,
                                    timelineDatapoints: [],
                                    index: -1,
                                    tooltipInfo: null
                                });
                        }
                    }
                }
            } else if (granularity === 'quarter') {
                for (var i = minYear; i <= maxYear; i++) {
                    for (var j = 1; j <= 4; j++) {
                        let qStartDate = new Date(i, (j - 1) * 3, 1);
                        let qEndDate = new Date(i, j * 3 - 1, new Date(i, j, 0).getDate());
                        if (qEndDate.getTime() >= min && qStartDate.getTime() <= max)
                            aggregatedDatapoints.push({
                                name: "Q" + j,
                                year: i,
                                quarter: j,
                                month: -1,
                                date: -1,
                                monthName: null,
                                granularity: 2,
                                timelineDatapoints: [],
                                index: -1,
                                tooltipInfo: null
                            });
                    }
                }
            } else if (granularity === 'year') {
                for (var i = minYear; i <= maxYear; i++) {
                    aggregatedDatapoints.push({
                        name: "" + i,
                        year: i,
                        quarter: -1,
                        month: -1,
                        date: -1,
                        monthName: null,
                        granularity: 3,
                        timelineDatapoints: [],
                        index: -1,
                        tooltipInfo: null
                    });
                }
            } else {
                for (var i = minYear; i <= maxYear; i++) {
                    for (var j = 1; j <= 12; j++) {

                        let qStartDate = new Date(i, j - 1, 1);
                        let qEndDate = new Date(i, j - 1, new Date(i, j, 0).getDate());
                        if (qEndDate.getTime() >= min && qStartDate.getTime() <= max)
                            aggregatedDatapoints.push({
                                name: Timeline.monthNames[j - 1],
                                year: i,
                                quarter: Math.floor((j - 1) / 3 + 1),
                                month: j,
                                monthName: Timeline.monthNames[j - 1],
                                date: -1,
                                granularity: 1,
                                timelineDatapoints: [],
                                index: -1,
                                tooltipInfo: null
                            });
                    }
                }
            }
            for (var i = 0; i < aggregatedDatapoints.length; i++) {
                aggregatedDatapoints[i].index = i;
            }
            return aggregatedDatapoints;
        }

        public static pushAggregatedDatapoints(granularity: string, dataPoint: TimelineDatapoint, aggList: AggregatedDatapoint[]) {
            let thisDay = new Date(dataPoint.label);
            let thisYear = thisDay.getFullYear();
            let thisMonth = thisDay.getMonth() + 1;
            let thisDate = thisDay.getDate();
            let thisQuarter = Math.floor((thisMonth - 1) / 3 + 1);
            let startYear;

            if (granularity === 'day') {
                for (var i = 0; i < aggList.length; i++) {
                    if (aggList[i].year === thisYear && aggList[i].month === thisMonth && aggList[i].date === thisDate) {
                        aggList[i].timelineDatapoints.push(dataPoint);
                        break;
                    }
                }
            } else if (granularity === 'quarter') {
                startYear = aggList[0].year;
                for (var i = 0; i < aggList.length; i++)
                    if (aggList[i].year === thisYear && aggList[i].quarter === thisQuarter) {
                        aggList[i].timelineDatapoints.push(dataPoint);
                    }
            } else if (granularity === 'year') {
                startYear = aggList[0].year;
                let index = thisYear - startYear;
                aggList[index].timelineDatapoints.push(dataPoint);
            } else {
                for (var i = 0; i < aggList.length; i++) {
                    if (aggList[i].year === thisYear && aggList[i].month === thisMonth) {
                        aggList[i].timelineDatapoints.push(dataPoint);
                    }
                }
            }
        }

        public static aggregate(granularity: string, dataView: DataView): { aggList: AggregatedDatapoint[]; timelineDatapoint: TimelineDatapoint[] } {
            let catDv: DataViewCategorical = dataView.categorical;
            let cat = catDv.categories[0];
            let catValues = cat.values;
            let aggregatedDatapoints = Timeline.initAggList(granularity, catValues);
            let dataPoints: TimelineDatapoint[] = [];

            for (var i = 0, len = catValues.length; i < len; i++) {
                let datapoint = {
                    label: catValues[i],
                    identity: SelectionId.createWithId(cat.identity[i]),
                    index: i,
                    selected: false,
                };
                dataPoints.push(datapoint);
                Timeline.pushAggregatedDatapoints(granularity, datapoint, aggregatedDatapoints);
            }

            return { aggList: aggregatedDatapoints, timelineDatapoint: dataPoints };
        }
        public static converter(dataView: DataView, timelineSelection: TimelineSelection, timelineFormat: TimelineFormat, graType: string, graChanged: boolean, interactivityService: IInteractivityService): TimelineData {
            let showHeader = false;
            if (dataView && dataView.metadata.objects) {
                let header = dataView.metadata.objects['header'];
                if (header && header['show'] !== undefined) {
                    showHeader = <boolean>header['show'];
                }
            }
            timelineFormat.showHeader = showHeader;

            let rangeTextColor: Fill = { solid: { color: '#333' } };
            if (dataView && dataView.metadata.objects) {
                let label = dataView.metadata.objects['timeRangeColor'];
                if (label && label['fill']) {
                    rangeTextColor = <Fill>label['fill'];
                }
            }
            let cellColor: Fill = { solid: { color: '#ADD8E6' } };
            if (dataView && dataView.metadata.objects) {
                let cellColorObj = dataView.metadata.objects['cellColor'];
                if (cellColorObj && cellColorObj['fill']) {
                    cellColor = <Fill>cellColorObj['fill'];
                }
            }
            timelineFormat.cellColor = cellColor;

            let lists = Timeline.aggregate(graType, dataView);
            let dataPoints = lists.timelineDatapoint;
            let aggList = lists.aggList;

            if (interactivityService) {
                interactivityService.applySelectionStateToData(dataPoints);
            }

            let cursorDatapoints = Timeline.getCursorsPosition(timelineSelection, aggList, graType);

            return {
                dragging: false,
                granularity: graType,
                categorySourceName: dataView.categorical.categories[0].source.displayName,
                columnIdentity: dataView.categorical.categories[0].identityFields[0],
                cursorDatapoints: cursorDatapoints,
                aggregatedList: aggList,
                timelineDatapoints: dataPoints,
                graChanged: graChanged
            };
        }

        public static getCursorsPosition(timelineSelection: TimelineSelection, aggList: AggregatedDatapoint[], graType: string): CursorDatapoint[] {
            let cursorDatapoints = [];
            if (timelineSelection.allPeriod) {
                cursorDatapoints.push({
                    index: 0,
                    cursorPosition: -1
                });
                cursorDatapoints.push({
                    index: 1,
                    cursorPosition: -1
                });
            } else {
                let startIndex = -1;
                let endIndex = -1;
                if (graType === "day") {
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].date >= timelineSelection.startDate && aggList[i].month >= timelineSelection.startMonth && aggList[i].year >= timelineSelection.startYear) {
                            startIndex = i;
                            break;
                        }
                    }
                    for (var i = aggList.length - 1; i >= 0; i--) {
                        if (aggList[i].date <= timelineSelection.endDate && aggList[i].month <= timelineSelection.endMonth && aggList[i].year <= timelineSelection.endYear) {
                            endIndex = i;
                            break;
                        }
                    }
                } else if (graType === "quarter") {
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].quarter >= timelineSelection.startQuarter && aggList[i].year >= timelineSelection.startYear) {
                            startIndex = i;
                            break;
                        }
                    }
                    for (var i = aggList.length - 1; i >= 0; i--) {
                        if (aggList[i].quarter <= timelineSelection.endQuarter && aggList[i].year <= timelineSelection.endYear) {
                            endIndex = i;
                            break;
                        }
                    }
                } else if (graType === "year") {
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].year === timelineSelection.startYear) {
                            startIndex = i;
                        }
                    }
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].year === timelineSelection.endYear) {
                            endIndex = i;
                        }
                    }
                } else {
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].month >= timelineSelection.startMonth && aggList[i].year === timelineSelection.startYear) {
                            startIndex = i;
                            break;
                        }
                    }
                    for (var i = aggList.length - 1; i >= 0; i--) {
                        if (aggList[i].month <= timelineSelection.endMonth && aggList[i].year === timelineSelection.endYear) {
                            endIndex = i;
                            break;
                        }
                    }
                }
                cursorDatapoints.push({
                    index: 0,
                    cursorPosition: startIndex
                });
                cursorDatapoints.push({
                    index: 1,
                    cursorPosition: endIndex + 1
                });
            }
            return cursorDatapoints;
        }

        public update(options: VisualUpdateOptions) {
            this.options = options;
            if (!options.dataViews || !options.dataViews[0]) return; // or clear the view, display an error, etc.
            
            let dataView = this.dataView = options.dataViews[0];
            this.setData(options, dataView, this.graType, false);
        }

        public setData(options: VisualUpdateOptions, dataView: DataView, graType: string, graChanged: boolean) {

            let data = this.data = Timeline.converter(dataView, this.timelineSelection, this.timelineFormat, graType, graChanged, this.interactivityService);
            let dataPoints = data.timelineDatapoints;
            let selection = this.render(options, data, this.timelineFormat, this.timelineSelection);
            let timelineClear = this.body.select(Timeline.Clear.selector);
            let behaviorOptions: TimelineBehaviorOptions = {
                timelineData: data,
                timelineFormat: this.timelineFormat,
                timelineSelection: this.timelineSelection,
                mainGroup: this.mainGroupElement,
                timeUnitCells: selection[0],
                cursors: selection[1],
                rangeText: this.rangeText,
                timelineClear: timelineClear,
                clearCatcher: this.clearCatcher,
                interactivityService: this.interactivityService,
                hostServices: this.hostServices,
            };

            this.interactivityService.bind(dataPoints, this.behavior, behaviorOptions);
        }

        private render(options: VisualUpdateOptions, timelineData: TimelineData, timelineFormat: TimelineFormat, timelineSelection: TimelineSelection): D3.UpdateSelection[] {
            let viewport = options.viewport;
            let aggList = timelineData.aggregatedList;
            if (this.timelineFormat.showHeader) {
                this.headerTextContainer.style('display', 'block');
                this.headerTextContainer
                    .style({
                        'color': this.getHeaderFill(this.dataView).solid.color,
                        'font-size': timelineFormat.timeRangeSize + 'px',
                        'border-style': "solid",
                        'border-width': "0px 0px 2px",
                        'border-color': "black"
                    }).text(timelineData.categorySourceName)
                    .attr({
                        'height': timelineFormat.topMargin + timelineFormat.textSize + timelineFormat.bottomMargin,
                        'width': viewport.width - timelineFormat.rightMargin
                    });
            } else {
                this.headerTextContainer.style('display', 'none');
            }

            this.renderTimeRangeText(timelineData, timelineFormat, timelineSelection);

            let bodyHeight = timelineFormat.topMargin * 3 + timelineFormat.timeRangeSize + timelineFormat.cellHeight + timelineFormat.textSize * 2 + timelineFormat.bottomMargin;

            this.body.attr({
                'height': bodyHeight,
                'width': viewport.width,
                'drag-resize-disabled': true
            })
                .style({
                    'overflow-x': 'auto'
                });
            this.svg
                .attr({
                    'height': bodyHeight,
                    'width': timelineFormat.leftMargin + timelineFormat.cellWidth * aggList.length + timelineFormat.rightMargin
                });
            this.mainGroupElement.attr('transform', "translate(" + timelineFormat.leftMargin + "," + timelineFormat.topMargin + ")");
            this.cursorGroupElement.attr('transform', "translate(" + timelineFormat.leftMargin + "," + timelineFormat.topMargin + ")");

            let cellSelection = this.renderCells(options, timelineData, timelineFormat);
            let cursorSelection = this.renderCursors(timelineData, timelineFormat);

            return [cellSelection, cursorSelection];
        }
        public static getTimeRangeText(timelineData: TimelineData, timelineSelection: TimelineSelection): string {
            let timeRangeText = "All period";
            if (timelineSelection.allPeriod === false) {
                let minDate = timelineSelection.startDate;
                let minMonth = timelineSelection.startMonth - 1;
                let minQuarter = timelineSelection.startQuarter;
                let minYear = timelineSelection.startYear;
                let maxDate = timelineSelection.endDate;
                let maxMonth = timelineSelection.endMonth - 1;
                let maxYear = timelineSelection.endYear;
                let maxQuarter = timelineSelection.endQuarter;
                if (timelineData.granularity === 'day') {
                    if (minYear === maxYear) {
                        if (minMonth === maxMonth) {
                            if (minDate === maxDate) {
                                timeRangeText = Timeline.monthNames[minMonth] + " " + maxDate + " " + maxYear;
                            } else {
                                timeRangeText = Timeline.monthNames[minMonth] + " " + minDate + " - " + maxDate + " " + maxYear;
                            }
                        } else {
                            timeRangeText = Timeline.monthNames[minMonth] + " " + minDate + " - " + Timeline.monthNames[maxMonth] + " " + maxDate + " " + maxYear;
                        }
                    } else {
                        timeRangeText = Timeline.monthNames[minMonth] + " " + minDate + " " + minYear + " - " + Timeline.monthNames[maxMonth] + " " + maxDate + " " + maxYear;
                    }
                } else if (timelineData.granularity === 'quarter') {
                    if (minYear === maxYear) {
                        if (minQuarter === maxQuarter) {
                            timeRangeText = "Q" + minQuarter + " " + minYear;
                        } else {
                            timeRangeText = "Q" + minQuarter + " - " + "Q" + maxQuarter + " " + maxYear;
                        }
                    } else {
                        timeRangeText = "Q" + minQuarter + " " + minYear + " - " + "Q" + maxQuarter + " " + maxYear;;
                    }
                } else if (timelineData.granularity === 'year') {
                    if (minYear === maxYear) {
                        timeRangeText = "" + minYear;
                    } else {
                        timeRangeText = minYear + " - " + maxYear;;
                    }
                } else {
                    if (minYear === maxYear) {
                        if (minMonth === maxMonth) {
                            timeRangeText = Timeline.monthNames[minMonth] + " " + minYear;
                        } else {
                            timeRangeText = Timeline.monthNames[minMonth] + " - " + Timeline.monthNames[maxMonth] + " " + maxYear;
                        }
                    } else {
                        timeRangeText = Timeline.monthNames[minMonth] + " " + minYear + " - " + Timeline.monthNames[maxMonth] + " " + maxYear;;
                    }
                }
            }
            return timeRangeText;
        }

        public renderTimeRangeText(timelineData: TimelineData, timelineFormat: TimelineFormat, timelineSelection: TimelineSelection) {
            let timeRangeText = Timeline.getTimeRangeText(timelineData, timelineSelection);
            this.rangeText.selectAll(Timeline.SelectionRange.selector).remove();
            this.rangeText.append('text').classed(Timeline.SelectionRange.class, true).style({
                'font-size': timelineFormat.timeRangeSize + 'px',
                'color': this.getTimeRangeColorFill(this.dataView).solid.color
            })
                .text(timeRangeText);
        }

        public renderCells(options: VisualUpdateOptions, timelineData: TimelineData, timelineFormat: TimelineFormat): D3.UpdateSelection {
            let duration = options.suppressAnimations ? 0 : AnimatorCommon.MinervaAnimationDuration;
            let dataPoints = timelineData.aggregatedList;
            this.mainGroupElement.selectAll(Timeline.Cell.selector).remove();
            let cellSelection = this.mainGroupElement.selectAll(Timeline.Cell.selector)
                .data(dataPoints);

            cellSelection.enter()
                .append('rect').attr('stroke', '#333')
                .classed(Timeline.Cell.class, true)
                .attr('fill', d => Timeline.getCellColor(d, timelineData, timelineFormat))
                .transition().duration(duration)
                .attr('height', timelineFormat.cellHeight)
                .attr('width', timelineFormat.cellWidth)
                .attr('x', d => (timelineFormat.cellWidth * d.index))
                .attr('y', timelineFormat.cellsYPosition);
            cellSelection.exit().remove();
            return cellSelection;
        }
        public static getCellColor(d: AggregatedDatapoint, timelineData: TimelineData, timelineFormat: TimelineFormat) {
            let cursorData = timelineData.cursorDatapoints;
            let cellColor = timelineFormat.cellColor;
            if (cursorData[0].cursorPosition !== cursorData[1].cursorPosition) {
                if (d.index >= cursorData[0].cursorPosition && d.index < cursorData[1].cursorPosition) {
                    return cellColor.solid.color;
                } else {
                    return "LightGray";
                }
            } else {
                return cellColor.solid.color;
            }
        }
        public renderCellLabels(timelineData: TimelineData, timelineFormat: TimelineFormat): D3.UpdateSelection {
            let dataPoints = timelineData.aggregatedList;
            this.mainGroupElement.selectAll(Timeline.CellTextLevel1.selector).remove();
            let cellTextSelection = this.mainGroupElement.selectAll(Timeline.CellTextLevel1.selector).data(dataPoints);
            let timeLineData = this.data;
            cellTextSelection.enter()
                .append('text')
                .classed(Timeline.CellTextLevel1.class, true)
                .text(function (d) {
                    if (timeLineData.granularity === 'day') {
                        if (d.date === 1) {
                            return d.monthName + " " + d.year;
                        } else {
                            return "";
                        }
                    } else if (timeLineData.granularity === 'quarter') {
                        if (d.quarter === 1) {
                            return d.year;
                        } else {
                            return "";
                        }
                    } else if (timeLineData.granularity !== 'year') {
                        if (d.month === 1) {
                            return d.year;
                        } else {
                            return "";
                        }
                    }
                })
                .attr({ 'x': d => (timelineFormat.cellWidth * (d.index + 0.5)), 'y': timelineFormat.textYPosition })
                .attr('text-anchor', "middle")
                .style({ 'font-size': timelineFormat.textSize + 'px', 'fill': '#777777' });
            cellTextSelection.exit().remove();

            this.mainGroupElement.selectAll(Timeline.CellTextLevel2.selector).remove();
            let cellTextLevel2Selection = this.mainGroupElement.selectAll(Timeline.CellTextLevel2.selector).data(dataPoints);
            cellTextLevel2Selection.enter().append('text').classed(Timeline.CellTextLevel2.class, true)
                .text(function (d) {
                    return d.name;
                })
                .attr({ 'x': d => (timelineFormat.cellWidth * (d.index + 0.5)), 'y': timelineFormat.topMargin + timelineFormat.textSize + timelineFormat.textYPosition })
                .attr('text-anchor', "middle")
                .style({ 'font-size': timelineFormat.textSize + 'px', 'fill': '#777777' });
            cellTextLevel2Selection.exit().remove();
            return cellTextSelection;
        }

        public renderCursors(timelineData: TimelineData, timelineFormat: TimelineFormat): D3.UpdateSelection {
            
            if (timelineData.cursorDatapoints[0].cursorPosition === 0 && timelineData.cursorDatapoints[1].cursorPosition === 0)
            timelineData.cursorDatapoints[1].cursorPosition =1;
            
            this.cursorGroupElement.selectAll(Timeline.Cursor.selector).remove();
            let cursorSelection = this.cursorGroupElement.selectAll(Timeline.Cursor.selector).data(timelineData.cursorDatapoints);

            cursorSelection.enter().append('path').classed(Timeline.Cursor.class, true).attr("d",
                d3.svg.arc()
                    .innerRadius(0)
                    .outerRadius(timelineFormat.cellHeight / 2)
                    .startAngle(d=> d.index * Math.PI + Math.PI) //converting from degs to radians
                    .endAngle(d=> d.index * Math.PI + 2 * Math.PI)
                )
                .attr('fill', 'grey')
                .attr("transform", function (d) {
                    return "translate(" + d.cursorPosition * timelineFormat.cellWidth + "," + (timelineFormat.cellHeight / 2 + timelineFormat.cellsYPosition) + ")";
                });
                
            cursorSelection.exit().remove();
            return cursorSelection;
        }

        public onClearSelection(): void {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }
        public getTimeRangeColorFill(dataView: DataView): Fill {
            if (dataView && dataView.metadata.objects) {
                let label = dataView.metadata.objects['timeRangeColor'];
                if (label) {
                    return <Fill>label['fill'];
                }
            }
            return { solid: { color: '#333' } };
        }

        public getHeaderFill(dataView: DataView): Fill {
            let headerColor: Fill = { solid: { color: '#333' } };
            if (dataView && dataView.metadata.objects) {
                let header = dataView.metadata.objects['header'];
                if (header && header['fontColor']) {
                    headerColor = header['fontColor'];
                }
            }

            return headerColor;
        }

        // This function retruns the values to be displayed in the property pane for each object.
        // Usually it is a bind pass of what the property pane gave you, but sometimes you may want to do
        // validation and return other values/defaults
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            let instances: VisualObjectInstance[] = [];
            switch (options.objectName) {
                case 'cellColor':
                    let cellColor: VisualObjectInstance = {
                        objectName: 'cellColor',
                        displayName: 'Selection Color',
                        selector: null,
                        properties: {
                            fill: this.timelineFormat.cellColor
                        }
                    };
                    instances.push(cellColor);
                    break;
                case 'timeRangeColor':
                    let timeRangeColor: VisualObjectInstance = {
                        objectName: 'timeRangeColor',
                        displayName: 'Time Range Text Color',
                        selector: null,
                        properties: {
                            fill: this.getTimeRangeColorFill(this.dataView)
                        }
                    };
                    instances.push(timeRangeColor);
                    break;
                /*case 'header':
                    instances.push(this.enumerateHeader(this.dataView));
                    break;*/
            }
            return instances;
        }
    }
}
