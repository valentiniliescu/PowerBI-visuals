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

    export interface TimelineData {
        dragging: boolean;
        categorySourceName: string;
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
    }

    export class TimelineWebBehavior implements IInteractiveBehavior {
        private timeUnitCells: D3.Selection;
        private cursors: D3.Selection;
        private rangeText: D3.Selection;
        private timelineData: TimelineData;
        private timelineFormat: TimelineFormat;

        public bindEvents(options: TimelineBehaviorOptions, selectionHandler: ISelectionHandler): void {
            var timeUnitCells = this.timeUnitCells = options.timeUnitCells;
            var cursors = this.cursors = options.cursors;
            this.rangeText = options.rangeText;
            var timelineClear = options.timelineClear;
            var timelineData = this.timelineData = options.timelineData;
            var timelineFormat = this.timelineFormat = options.timelineFormat;
            var cursorDatapoints = options.timelineData.cursorDatapoints;
            var aggList = options.timelineData.aggregatedList;
            var interactivityService = options.interactivityService;
            var that = this;

            if (timelineData.graChanged) {
                this.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService);
                this.adjustSelection(selectionHandler);
                that.setRange(timelineData, options.timelineSelection);
                timelineData.graChanged = false;
            }

            timeUnitCells.on("click", (d: AggregatedDatapoint) => {
                d3.event.preventDefault();

                cursorDatapoints[0].cursorPosition = d.index;
                cursorDatapoints[1].cursorPosition = d.index + 1;
                that.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService);
                that.setRange(timelineData, options.timelineSelection);
                that.renderCursors(cursors, cursorDatapoints, timelineFormat);
                that.renderSelection(true);
                that.renderRangeText(options.timelineData, options.timelineSelection);
            });
            var drag = d3.behavior.drag()
                .origin(function (d) {
                    return d;
                })
                .on("dragstart", dragstarted)
                .on("drag", dragged)
                .on("dragend", dragended);

            function dragstarted(d) {
                d3.event.sourceEvent.stopPropagation();
                d3.select(this).classed("dragging", true);
                options.timelineData.dragging = true;
                //console.log('dragstart' + options.timelineData.dragging)
            }

            function dragged(d) {
                if (options.timelineData.dragging === true) {
                    var xScale = 1;
                    var yScale = 1;
                    var container = d3.select(".displayArea");
                    if (container !== undefined) {
                        var transform = container.style("transform");
                        if (transform !== undefined) {
                            var str = transform.split("(")[1];
                            xScale = Number(str.split(", ")[0]);
                            yScale = Number(str.split(", ")[3]);
                        }
                    }

                    var xCoord = (d3.event.sourceEvent.x - options.mainGroup.node().getBoundingClientRect().left) / xScale;
                    if (Timeline.isIE()) {
                        xCoord = d3.event.sourceEvent.x / xScale + (d3.select(".cellContainer").node().scrollLeft);
                    }
                    //console.log(d3.event.sourceEvent.x);
                    //console.log(d3.select(".cellContainer").node().scrollLeft);
                    var index = Math.round(xCoord / timelineFormat.cellWidth);
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
                        //that.setSelection(selectionHandler,timelineData, options.timelineSelection,interactivityService);              
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
                that.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService);
                that.setRange(timelineData, options.timelineSelection);
                //that.renderRangeText(options.timelineData, options.timelineSelection);
                //console.log("dragend" + options.timelineData.dragging);
            }

            cursors.call(drag);
            
            /*options.clearCatcher.on('click', () => {
                selectionHandler.handleClearSelection();
            });*/
            timelineClear.on("click", (d: SelectableDataPoint) => {
                //selectionHandler.handleClearSelection();
                cursorDatapoints[0].cursorPosition = -1;
                cursorDatapoints[1].cursorPosition = -1;
                that.setSelection(selectionHandler, timelineData, options.timelineSelection, interactivityService);
                that.setRange(timelineData, options.timelineSelection);
                that.renderCursors(cursors, cursorDatapoints, timelineFormat);
                that.renderSelection(false);
                that.renderRangeText(options.timelineData, options.timelineSelection);
            });
        }
        public adjustSelection(selectionHandler: ISelectionHandler) {

        }
        public setSelection(selectionHandler: ISelectionHandler, timelineData: TimelineData, timelineSelection: TimelineSelection, interactivityService: IInteractivityService) {
            //d3.event.preventDefault();
            var aggList = timelineData.aggregatedList;
            var cursorDatapoints = timelineData.cursorDatapoints;
            selectionHandler.handleClearSelection();
            for (var i = cursorDatapoints[0].cursorPosition; i < cursorDatapoints[1].cursorPosition; i++) {
                for (var j = 0; j < aggList[i].timelineDatapoints.length; j++) {
                    selectionHandler.handleSelection(aggList[i].timelineDatapoints[j], true);
                }
            }

        }
        public setRange(timelineData: TimelineData, timelineSelection: TimelineSelection) {
            var aggList = timelineData.aggregatedList;
            var cursorDatapoints = timelineData.cursorDatapoints;
            if (cursorDatapoints[0].cursorPosition < cursorDatapoints[1].cursorPosition) {
                timelineSelection.allPeriod = false;
                var minIndex = cursorDatapoints[0].cursorPosition;
                var maxIndex = cursorDatapoints[1].cursorPosition - 1;
                var minAggPoint = aggList[minIndex];
                var maxAggPoint = aggList[maxIndex];
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
            var timelineData = this.timelineData;
            var timelineFormat = this.timelineFormat;
            this.timeUnitCells.style('fill', d => Timeline.getCellColor(d, timelineData, timelineFormat));
            //d3.event.stopPropagation();
        }

        public renderRangeText(timelineData: TimelineData, timelineSelection: TimelineSelection) {
            var timeRangeText = Timeline.getTimeRangeText(timelineData, timelineSelection);
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
                        dataReductionAlgorithm: { top: {} }
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

        public static isIE(): boolean {
            var ua = navigator.userAgent, tem,
                M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if (/trident/i.test(M[1])) {
                tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
                return true;//'IE '+(tem[1] || '');
            }
            if (M[1] === 'Chrome') {
                tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
                if (tem !== null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
            }
            M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
            if ((tem = ua.match(/version\/(\d+)/i)) !== null) M.splice(1, 1, tem[1]);
            return false;//M.join(' ');
        }
        public init(options: VisualInitOptions): void {
            var msie = Timeline.isIE();
            var element = options.element;
            this.timelineFormat = {
                showHeader: true,
                leftMargin: 10,
                rightMargin: 10,
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
            var timelineContainer = d3.select(element.get(0)).append('div').classed(Timeline.TimelineContainer.class, true);
            var header = this.header = timelineContainer.append('div').classed(Timeline.Header.class, true);
            //var middle = this.middle =  timelineContainer.append('div').style({"z-index": 99999});
            var body = this.body = timelineContainer.append('div').classed(Timeline.CellContainer.class, true);
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
            var dropdownbox = this.dropdownbox = body.append("div")
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
                    //"padding": "5px",
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
            var that = this;
            this.graType = "month";
            this.graChanged = false;
            dropdownbox.on("change", function () {
                that.graType = this.options[this.selectedIndex].value;
                that.graChanged = true;
                that.setData(that.options, that.dataView, that.graType, true);
            });

            var svg = this.svg = body
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

            var hederTextContainer = this.headerTextContainer = this.header.append('div');
            hederTextContainer.append('g')
                .attr('transform', "translate(0,10)")
                .append('text')
                .attr({
                    'x': 10,
                    'y': 10
                });

            //this.colors = options.style.colorPalette.dataColors;
            this.mainGroupElement = svg.append('g');
            this.cursorGroupElement = svg.append('g');

        }

        public static initAggList(granularity: string, catValues: any[]): AggregatedDatapoint[] {
            var aggregatedDatapoints: AggregatedDatapoint[] = [];

            var min = new Date(catValues[0]).getTime();
            var max = min;
            for (var i = 0, len = catValues.length; i < len; i++) {
                var d = new Date(catValues[i]).getTime();
                if (min > d) {
                    min = d;
                }
                if (max < d) {
                    max = d;
                }
            }
            var minDate = new Date(min);
            var minYear = minDate.getFullYear();
            var maxDate = new Date(max);
            var maxYear = maxDate.getFullYear();

            if (granularity === 'day') {
                for (var i = minYear; i <= maxYear; i++) {
                    for (var j = 1; j <= 12; j++) {
                        var numDays = new Date(i, j, 0).getDate();
                        for (var k = 1; k <= numDays; k++) {
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
            var thisDay = new Date(dataPoint.label);
            var thisYear = thisDay.getFullYear();
            var thisMonth = thisDay.getMonth() + 1;
            var thisDate = thisDay.getDate();
            var thisQuarter = Math.floor((thisMonth - 1) / 3 + 1);

            if (granularity === 'day') {
                for (var i = 0; i < aggList.length; i++) {
                    if (aggList[i].year === thisYear && aggList[i].month === thisMonth && aggList[i].date === thisDate) {
                        aggList[i].timelineDatapoints.push(dataPoint);
                        break;
                    }
                }
            } else if (granularity === 'quarter') {
                var startYear = aggList[0].year;
                var index = (thisYear - startYear) * 4 + (thisQuarter - 1);
                //console.log(index+","+thisYear+","+startYear+","+thisQuarter);
                aggList[index].timelineDatapoints.push(dataPoint);
            } else if (granularity === 'year') {
                var startYear = aggList[0].year;
                var index = thisYear - startYear;
                aggList[index].timelineDatapoints.push(dataPoint);
            } else {
                var startYear = aggList[0].year;
                var index = (thisYear - startYear) * 12 + (thisMonth - 1);
                aggList[index].timelineDatapoints.push(dataPoint);
            }
        }

        public static aggregate(granularity: string, dataView: DataView): { aggList: AggregatedDatapoint[]; timelineDatapoint: TimelineDatapoint[] } {
            var catDv: DataViewCategorical = dataView.categorical;
            var cat = catDv.categories[0];
            var catValues = cat.values;
            var aggregatedDatapoints = Timeline.initAggList(granularity, catValues);
            var dataPoints: TimelineDatapoint[] = [];

            for (var i = 0, len = catValues.length; i < len; i++) {
                var datapoint = {
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
            var showHeader = false;
            if (dataView && dataView.metadata.objects) {
                var header = dataView.metadata.objects['header'];
                if (header && header['show'] !== undefined) {
                    showHeader = <boolean>header['show'];
                }
            }
            timelineFormat.showHeader = showHeader;

            var rangeTextColor: Fill = { solid: { color: '#333' } };
            if (dataView && dataView.metadata.objects) {
                var label = dataView.metadata.objects['timeRangeColor'];
                if (label && label['fill']) {
                    rangeTextColor = <Fill>label['fill'];
                }
            }
            var cellColor: Fill = { solid: { color: '#ADD8E6' } };
            if (dataView && dataView.metadata.objects) {
                var cellColorObj = dataView.metadata.objects['cellColor'];
                if (cellColorObj && cellColorObj['fill']) {
                    cellColor = <Fill>cellColorObj['fill'];
                }
            }
            timelineFormat.cellColor = cellColor;

            var lists = Timeline.aggregate(graType, dataView);
            var dataPoints = lists.timelineDatapoint;
            var aggList = lists.aggList;

            if (interactivityService) {
                interactivityService.applySelectionStateToData(dataPoints);
            }

            var cursorDatapoints = Timeline.getCursorsPosition(timelineSelection, aggList, graType);

            return {
                dragging: false,
                granularity: graType,
                categorySourceName: dataView.categorical.categories[0].source.displayName,
                cursorDatapoints: cursorDatapoints,
                aggregatedList: aggList,
                timelineDatapoints: dataPoints,
                graChanged: graChanged
            };
        }

        public static getCursorsPosition(timelineSelection: TimelineSelection, aggList: AggregatedDatapoint[], graType: string): CursorDatapoint[] {
            var cursorDatapoints = [];
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
                var startIndex = -1;
                var endIndex = -1;
                if (graType === "day") {
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].date === timelineSelection.startDate && aggList[i].month === timelineSelection.startMonth && aggList[i].year === timelineSelection.startYear) {
                            startIndex = i;
                        }
                    }
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].date === timelineSelection.endDate && aggList[i].month === timelineSelection.endMonth && aggList[i].year === timelineSelection.endYear) {
                            endIndex = i;
                        }
                    }
                } else if (graType === "quarter") {
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].quarter === timelineSelection.startQuarter && aggList[i].year === timelineSelection.startYear) {
                            startIndex = i;
                        }
                    }
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].quarter === timelineSelection.endQuarter && aggList[i].year === timelineSelection.endYear) {
                            endIndex = i;
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
                        if (aggList[i].month === timelineSelection.startMonth && aggList[i].year === timelineSelection.startYear) {
                            startIndex = i;
                        }
                    }
                    for (var i = 0; i < aggList.length; i++) {
                        if (aggList[i].month === timelineSelection.endMonth && aggList[i].year === timelineSelection.endYear) {
                            endIndex = i;
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
            
            var dataView = this.dataView = options.dataViews[0];
            this.setData(options, dataView, this.graType, false);
        }

        public setData(options: VisualUpdateOptions, dataView: DataView, graType: string, graChanged: boolean) {
            console.time("myCode");
            var data = this.data = Timeline.converter(dataView, this.timelineSelection, this.timelineFormat, graType, graChanged, this.interactivityService);
            console.timeEnd("myCode");
            var dataPoints = data.timelineDatapoints;
            console.time("render");
            var selection = this.render(options, data, this.timelineFormat, this.timelineSelection);
            console.timeEnd("render");
            var timelineClear = this.body.select(Timeline.Clear.selector);
            var behaviorOptions: TimelineBehaviorOptions = {
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
            };

            this.interactivityService.bind(dataPoints, this.behavior, behaviorOptions);
        }

        private render(options: VisualUpdateOptions, timelineData: TimelineData, timelineFormat: TimelineFormat, timelineSelection: TimelineSelection): D3.UpdateSelection[] {
            var viewport = options.viewport;

            var aggList = timelineData.aggregatedList;
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

            var bodyHeight = timelineFormat.topMargin * 3 + timelineFormat.timeRangeSize + timelineFormat.cellHeight + timelineFormat.textSize * 2 + timelineFormat.bottomMargin;

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

            var cellSelection = this.renderCells(options, timelineData, timelineFormat);
            var cellTextSelection = this.renderCellLabels(timelineData, timelineFormat);
            var cursorSelection = this.renderCursors(timelineData, timelineFormat);

            return [cellSelection, cursorSelection];
        }
        public static getTimeRangeText(timelineData: TimelineData, timelineSelection: TimelineSelection): string {
            var timeRangeText = "All period";
            if (timelineSelection.allPeriod === false) {
                var minDate = timelineSelection.startDate;
                var minMonth = timelineSelection.startMonth - 1;
                var minQuarter = timelineSelection.startQuarter;
                var minYear = timelineSelection.startYear;
                var maxDate = timelineSelection.endDate;
                var maxMonth = timelineSelection.endMonth - 1;
                var maxYear = timelineSelection.endYear;
                var maxQuarter = timelineSelection.endQuarter;
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
            var timeRangeText = Timeline.getTimeRangeText(timelineData, timelineSelection);
            this.rangeText.selectAll(Timeline.SelectionRange.selector).remove();
            this.rangeText.append('text').classed(Timeline.SelectionRange.class, true).style({
                'font-size': timelineFormat.timeRangeSize + 'px',
                'color': this.getTimeRangeColorFill(this.dataView).solid.color
            })
                .text(timeRangeText);
        }

        public renderCells(options: VisualUpdateOptions, timelineData: TimelineData, timelineFormat: TimelineFormat): D3.UpdateSelection {
            var duration = options.suppressAnimations ? 0 : AnimatorCommon.MinervaAnimationDuration;
            var dataPoints = timelineData.aggregatedList;
            this.mainGroupElement.selectAll(Timeline.Cell.selector).remove();
            var cellSelection = this.mainGroupElement.selectAll(Timeline.Cell.selector)
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
            var cursorData = timelineData.cursorDatapoints;
            var cellColor = timelineFormat.cellColor;
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
            var dataPoints = timelineData.aggregatedList;
            this.mainGroupElement.selectAll(Timeline.CellTextLevel1.selector).remove();
            var cellTextSelection = this.mainGroupElement.selectAll(Timeline.CellTextLevel1.selector).data(dataPoints);
            var timeLineData = this.data;
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
            var cellTextLevel2Selection = this.mainGroupElement.selectAll(Timeline.CellTextLevel2.selector).data(dataPoints);
            cellTextLevel2Selection.enter().append('text').classed(Timeline.CellTextLevel2.class, true)
                .text(function (d) {
                    //console.log(d.name);
                    return d.name;
                })
                .attr({ 'x': d => (timelineFormat.cellWidth * (d.index + 0.5)), 'y': timelineFormat.topMargin + timelineFormat.textSize + timelineFormat.textYPosition })
                .attr('text-anchor', "middle")
                .style({ 'font-size': timelineFormat.textSize + 'px', 'fill': '#777777' });
            cellTextLevel2Selection.exit().remove();
            return cellTextSelection;
        }

        public renderCursors(timelineData: TimelineData, timelineFormat: TimelineFormat): D3.UpdateSelection {
            this.cursorGroupElement.selectAll(Timeline.Cursor.selector).remove();
            var cursorSelection = this.cursorGroupElement.selectAll(Timeline.Cursor.selector).data(timelineData.cursorDatapoints);

            cursorSelection.enter().append('path').classed(Timeline.Cursor.class, true).attr("d",
                d3.svg.arc()
                    .innerRadius(0)
                    .outerRadius(timelineFormat.cellHeight / 2)
                    .startAngle(d=> d.index * Math.PI + Math.PI) //converting from degs to radians
                    .endAngle(d=> d.index * Math.PI + 2 * Math.PI)
                )
                .attr('fill', 'grey')
                .attr("transform", function (d) {
                    //console.log("translate(" + d.cursorPosition * timelineFormat.cellWidth + "," + (timelineFormat.cellHeight / 2 + timelineFormat.timelineYPosition) + ")");
                    return "translate(" + d.cursorPosition * timelineFormat.cellWidth + "," + (timelineFormat.cellHeight / 2 + timelineFormat.cellsYPosition) + ")";
                });//.call(drag);
                
            cursorSelection.exit().remove();
            return cursorSelection;
        }

        public onClearSelection(): void {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }
        public getTimeRangeColorFill(dataView: DataView): Fill {
            if (dataView && dataView.metadata.objects) {
                var label = dataView.metadata.objects['timeRangeColor'];
                if (label) {
                    return <Fill>label['fill'];
                }
            }
            return { solid: { color: '#333' } };
        }

        public getHeaderFill(dataView: DataView): Fill {
            var headerColor: Fill = { solid: { color: '#333' } };
            if (dataView && dataView.metadata.objects) {
                var header = dataView.metadata.objects['header'];
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
            var instances: VisualObjectInstance[] = [];
            switch (options.objectName) {
                case 'cellColor':
                    var cellColor: VisualObjectInstance = {
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
                    var timeRangeColor: VisualObjectInstance = {
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