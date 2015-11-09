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

    export let bulletChartProps = {
        values: {
            targetValue: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'targetValue' },
            minimumPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'minimumPercent' },
            satisfactoryPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'satisfactoryPercent' },
            goodPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'goodPercent' },
            maximumPercent: <DataViewObjectPropertyIdentifier>{ objectName: 'values', propertyName: 'maximumPercent' },
        },
        orientation: {
            orientation: <DataViewObjectPropertyIdentifier>{ objectName: 'orientation', propertyName: 'orientation' },
        },
        colors: {
            badColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'badColor' },
            satisfactoryColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'satisfactoryColor' },
            goodColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'goodColor' },
            bulletColor: <DataViewObjectPropertyIdentifier>{ objectName: 'colors', propertyName: 'bulletColor' },
        },
        axis: {
            axis: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'axis' },
            axisColor: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'axisColor' },
            measureUnits: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'measureUnits' },
            unitsColor: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'unitsColor' },
            measureColor: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'measureColor' },
            labelsReservedArea: <DataViewObjectPropertyIdentifier>{ objectName: 'axis', propertyName: 'labelsReservedArea' },
        },
        formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },

    };

    export interface BulletConstructorOptions {
        behavior?: BulletWebBehavior;
    }

    export interface BulletDataPoint extends SelectableDataPoint {
        category: string;
        value: number;
        targetValue: number;
        minimum: number;
        satisfactory: number;
        good: number;
        maximum: number;
        toolTipInfo: TooltipDataItem[];
        highlight: boolean;
    }

    export interface BulletChartSettings {
        values: {
            targetValue: number;
            minimumPercent: number;
            satisfactoryPercent: number;
            goodPercent: number;
            maximumPercent: number;
        };
        orientation: {
            orientation: string;
            reverse: boolean;
            vertical: boolean;
        };
        colors: {
            badColor: string;
            satisfactoryColor: string;
            goodColor: string;
            bulletColor: string;
        };

        axis: {
            axis: boolean;
            axisColor: string;
            measureUnits: string;
            unitsColor: string;
            measureColor: string;
            labelsReservedArea: number;
        };
    }

    //Model
    export interface BulletChartModel {
        bulletDataPoints: BulletDataPoint[];
        bulletChartSettings: BulletChartSettings;
        width: number;
        height: number;
    }

    export let bulletChartRoleNames = {
        value: 'Value',
        targetValue: 'TargetValue',
        minValue: 'Minimum',
        satisfactoryValue: 'Satisfactory',
        goodValue: 'Good',
        maxValue: 'Maximum'
    };

    export class BulletChart implements IVisual {

        public static capabilities: VisualCapabilities = {
            dataRoles: [
                {
                    name: 'Category',
                    kind: VisualDataRoleKind.Grouping,
                    displayName: 'Category',
                },
                {
                    name: 'Value',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Value',
                }, {
                    name: 'TargetValue',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Target Value',
                }, {
                    name: 'Minimum',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Minimum',
                }, {
                    name: 'Satisfactory',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Satisfactory',
                }, {
                    name: 'Good',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Good',
                }, {
                    name: 'Maximum',
                    kind: VisualDataRoleKind.Measure,
                    displayName: 'Maximum',
                }
            ],
            objects: {
                general: {
                    displayName: data.createDisplayNameGetter('Visual_General'),
                    properties: {
                        formatString: {
                            type: { formatting: { formatString: true } },
                        },

                    },
                },
                values: {
                    displayName: 'Data values',
                    properties: {
                        targetValue: {
                            displayName: 'Target Value',
                            type: { numeric: true }
                        },
                        minimumPercent: {
                            displayName: 'Minimum %',
                            type: { numeric: true }
                        },
                        satisfactoryPercent: {
                            displayName: 'Satisfactory %',
                            type: { numeric: true }
                        },
                        goodPercent: {
                            displayName: 'Good %',
                            type: { numeric: true }
                        },
                        maximumPercent: {
                            displayName: 'Maximum %',
                            type: { numeric: true }
                        },
                    }
                },
                orientation: {
                    displayName: 'Orientation',
                    properties: {
                        orientation: {
                            displayName: 'Orientation',
                            type: { text: true }
                        }
                    }
                },
                colors: {
                    displayName: 'Colors',
                    properties: {
                        badColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Bad Color'
                        },
                        satisfactoryColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Satisfactory Color'
                        },
                        goodColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Good Color'
                        },
                        bulletColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Bullet Color'
                        }
                    },
                },
                axis: {
                    displayName: 'Axis',
                    properties: {
                        axis: {
                            displayName: 'Axis',
                            type: { bool: true }
                        },
                        axisColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Axis Color'
                        },
                        measureUnits: {
                            type: { text: true },
                            displayName: 'Measure Units '
                        },
                        unitsColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Units Color'
                        },
                        measureColor: {
                            type: { fill: { solid: { color: true } } },
                            displayName: 'Measure Color'
                        },
                        labelsReservedArea: {
                            displayName: 'Labels Reserved Area',
                            type: { numeric: true }
                        }
                    }
                }
            },
            dataViewMappings: [{
                conditions: [
                    {
                        'Category': { max: 1 }, 'Value': { max: 1 }, 'TargetValue': { max: 1 }, 'Minimum': { max: 1 },
                        'Satisfactory': { max: 1 }, 'Good': { max: 1 }, 'Maximum': { max: 1 }
                    },
                ],
                categorical: {
                    categories: {
                        for: { in: 'Category' },
                        dataReductionAlgorithm: { top: {} }
                    },
                    values: {
                        select: [
                            { bind: { to: 'Value' } },
                            { bind: { to: 'TargetValue' } },
                            { bind: { to: 'Minimum' } },
                            { bind: { to: 'Satisfactory' } },
                            { bind: { to: 'Good' } },
                            { bind: { to: 'Maximum' } },
                        ]
                    },
                },
            }],
            supportsHighlight: true,
            sorting: {
                default: {},
            },
            drilldown: {
                roles: ['Category']
            }
        };      
        //Variables
        private bulletBody: D3.Selection;
        private scrollContainer: D3.Selection;
        private model: BulletChartModel;
        private behavior: BulletWebBehavior;
        private interactivityService: IInteractivityService;
        private clearCatcher: D3.Selection;

        public static DefaultStyleProperties(): BulletChartSettings {
            return {
                values: {
                    targetValue: 0,
                    minimumPercent: 0,
                    satisfactoryPercent: 50,
                    goodPercent: 100,
                    maximumPercent: 200
                },
                orientation: {
                    orientation: 'HL',
                    reverse: false,
                    vertical: false
                },
                colors: {
                    badColor: 'Red',
                    satisfactoryColor: 'Yellow',
                    goodColor: 'Green',
                    bulletColor: 'Black'
                },
                axis: {
                    axis: true,
                    axisColor: 'Grey',
                    measureUnits: '',
                    unitsColor: 'Grey',
                    measureColor: 'Black',
                    labelsReservedArea: 80
                }
            };
        }

        // Convert a DataView into a view model
        public static converter(dataView: DataView, options: VisualUpdateOptions): BulletChartModel {
            let bulletModel: BulletChartModel;
            if (!dataView) {
                return;
            }

            let dataViewCategorical = dataView.categorical;
            if (dataViewCategorical === null || dataViewCategorical.categories === null
                || dataViewCategorical.values.length === 0 || dataView.metadata === null || dataView.metadata.columns.length === 0)
                return;

            let defaultSettings = this.DefaultStyleProperties();
            let objects = dataView.metadata.objects;
            if (objects) {
                defaultSettings.values.targetValue = DataViewObjects.getValue<number>(objects, bulletChartProps.values.targetValue, defaultSettings.values.targetValue);
                defaultSettings.values.minimumPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.minimumPercent, defaultSettings.values.minimumPercent);
                defaultSettings.values.satisfactoryPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.satisfactoryPercent, defaultSettings.values.satisfactoryPercent);
                defaultSettings.values.goodPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.goodPercent, defaultSettings.values.goodPercent);
                defaultSettings.values.maximumPercent = DataViewObjects.getValue<number>(objects, bulletChartProps.values.maximumPercent, defaultSettings.values.maximumPercent);

                defaultSettings.orientation.orientation = DataViewObjects.getValue<string>(objects, bulletChartProps.orientation.orientation, defaultSettings.orientation.orientation);

                defaultSettings.colors.badColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.badColor, defaultSettings.colors.badColor);
                defaultSettings.colors.satisfactoryColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.satisfactoryColor, defaultSettings.colors.satisfactoryColor);
                defaultSettings.colors.goodColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.goodColor, defaultSettings.colors.goodColor);
                defaultSettings.colors.bulletColor = DataViewObjects.getFillColor(objects, bulletChartProps.colors.bulletColor, defaultSettings.colors.bulletColor);

                defaultSettings.axis.axis = DataViewObjects.getValue<boolean>(objects, bulletChartProps.axis.axis, defaultSettings.axis.axis);
                defaultSettings.axis.axisColor = DataViewObjects.getFillColor(objects, bulletChartProps.axis.axisColor, defaultSettings.axis.axisColor);
                defaultSettings.axis.measureUnits = DataViewObjects.getValue<string>(objects, bulletChartProps.axis.measureUnits, defaultSettings.axis.measureUnits);
                defaultSettings.axis.unitsColor = DataViewObjects.getFillColor(objects, bulletChartProps.axis.unitsColor, defaultSettings.axis.unitsColor);
                defaultSettings.axis.measureColor = DataViewObjects.getFillColor(objects, bulletChartProps.axis.measureColor, defaultSettings.axis.measureColor);
                defaultSettings.axis.labelsReservedArea = DataViewObjects.getValue<number>(objects, bulletChartProps.axis.labelsReservedArea, defaultSettings.axis.labelsReservedArea);

            }
            if (defaultSettings.orientation.orientation === 'HR' || defaultSettings.orientation.orientation === 'VB') {
                defaultSettings.orientation.reverse = true;
            }
            if (defaultSettings.orientation.orientation === 'VT' || defaultSettings.orientation.orientation === 'VB') {
                defaultSettings.orientation.vertical = true;
            }

            let categories,
                categoryValues,
                categoryValuesLen = 1,
                categoryFormatString;


            if (dataViewCategorical.categories) {
                categories = dataViewCategorical.categories[0];
                categoryValues = categories.values;
                categoryValuesLen = categoryValues.length;
                categoryFormatString = valueFormatter.getFormatString(categories.source, bulletChartProps.formatString);
            }

            let bulletDataPoints: BulletDataPoint[] = [];

            for (let idx = 0; idx < categoryValuesLen; idx++) {
                let toolTipItems = [];
                let category: string, value: number = undefined, targetValue: number = undefined, minimum: number = undefined, satisfactory: number = undefined,
                    good: number = undefined, maximum: number = undefined;
                let highlight: boolean = false;
                if (categoryValues) {
                    let categoryValue = categoryValues[idx];
                    category = valueFormatter.format(categoryValue, categoryFormatString);
                    let categoryIdentity = categories.identity ? categories.identity[idx] : null;
                }
                let values = dataViewCategorical.values;
                let metadataColumns = dataView.metadata.columns;

                for (let i = 0; i < values.length; i++) {

                    let col = metadataColumns[i];
                    let currentVal = values[i].values[idx] || 0;
                    if (col && col.roles) {
                        if (col.roles[bulletChartRoleNames.value]) {
                            if (values[i].highlights) {
                                highlight = values[i].highlights[idx] !== null;
                            }
                            toolTipItems.push({ value: currentVal, metadata: values[i] });
                            value = currentVal;
                        } else if (col.roles[bulletChartRoleNames.targetValue]) {
                            toolTipItems.push({ value: currentVal, metadata: values[i] });
                            targetValue = currentVal;
                        } else if (col.roles[bulletChartRoleNames.minValue]) {
                            minimum = currentVal;
                        } else if (col.roles[bulletChartRoleNames.satisfactoryValue]) {
                            satisfactory = currentVal;
                        } else if (col.roles[bulletChartRoleNames.goodValue]) {
                            good = currentVal;
                        } else if (col.roles[bulletChartRoleNames.maxValue]) {
                            maximum = currentVal;
                        }
                    }
                }
                if (targetValue === undefined) {
                    targetValue = defaultSettings.values.targetValue;
                }
                if (minimum === undefined) {
                    minimum = defaultSettings.values.minimumPercent * targetValue / 100;
                }
                if (satisfactory === undefined) {
                    satisfactory = defaultSettings.values.satisfactoryPercent * targetValue / 100;
                }
                if (good === undefined) {
                    good = defaultSettings.values.goodPercent * targetValue / 100;
                }
                if (maximum === undefined) {
                    maximum = defaultSettings.values.maximumPercent * targetValue / 100;
                }
                if (!isNaN(targetValue) &&
                    !isNaN(minimum) &&
                    !isNaN(satisfactory) &&
                    !isNaN(good) &&
                    !isNaN(maximum)) {
                    bulletDataPoints.push({
                        identity: SelectionId.createWithId(categoryIdentity),
                        category: category,
                        value: value,
                        targetValue: targetValue,
                        minimum: minimum,
                        satisfactory: satisfactory,
                        good: good,
                        maximum: maximum,
                        toolTipInfo: TooltipBuilder.createTooltipInfo(bulletChartProps.formatString, null, null, null, null, toolTipItems),
                        selected: false,
                        highlight: highlight
                    });
                }
            }
            bulletModel = {
                bulletChartSettings: defaultSettings,
                bulletDataPoints: bulletDataPoints,
                width: options.viewport.width,
                height: options.viewport.height
            };
            return bulletModel;
        }

        /* One time setup*/
        public init(options: VisualInitOptions): void {
            let body = d3.select(options.element.get(0));

            this.clearCatcher = appendClearCatcher(body);
            this.bulletBody = this.clearCatcher
                .append('div')
                .classed('bullet-body', true);

            this.scrollContainer = this.bulletBody.append('div')
                .classed('bullet-scroll-region', true);

            this.behavior = new BulletWebBehavior();

            this.interactivityService = createInteractivityService(options.host);
        }

        /* Called for data, size, formatting changes*/
        public update(options: VisualUpdateOptions) {
            if (!options.dataViews && !options.dataViews[0]) return;
            let dataView = options.dataViews[0];
            let viewport = options.viewport;
            let model: BulletChartModel = BulletChart.converter(dataView, options);
            if (!model) {
                return;
            }
            if (this.interactivityService) {
                this.interactivityService.applySelectionStateToData(model.bulletDataPoints);
            }
            this.model = model;
            let hasHighlights = this.hasHighlightValues(dataView, 0);
            let hasSelection = this.interactivityService.hasSelection();
            let bullet = (bullets: D3.Selection) => {
                bullets.each(function(data: BulletDataPoint, index) {
                    let svgBullet = d3.select(this);

                    let svgRotate = svgBullet
                        .append('g');

                    let svgWrap = svgRotate
                        .append('g')
                        .attr("class", "wrap");

                    let settings = model.bulletChartSettings;
                    let ranges = [data.minimum, data.satisfactory, data.good, data.maximum];
                    let sortedRanges = ranges.sort(d3.descending);

                    let height = 25;
                    let maxRanges = d3.max(ranges).toString().length;
                    let labelSize = d3.max([maxRanges * 5, settings.axis.labelsReservedArea]) + 10;

                    let reverse = settings.orientation.reverse, vertical = settings.orientation.vertical;

                    let labels = svgRotate.append('g')
                        .classed('labels', true);

                    let width = model.width;

                    let svgTitle = labels
                        .append('text')
                        .classed('title', true)
                        .style('display', 'block')
                        .attr("fill", settings.axis.measureColor);

                    if (data.category) {
                        width -= labelSize;

                        svgTitle.text(data.category);
                    }

                    let svgSubtitle = labels
                        .append('text')
                        .classed('subtitle', true)
                        .style('display', 'block')
                        .text(settings.axis.measureUnits)
                        .attr("fill", settings.axis.unitsColor);

                    if (vertical) {
                        width = model.height - labelSize;
                        svgWrap.attr("transform", "rotate(90)translate(" + (reverse ? 0 : settings.axis.labelsReservedArea - 5) + "," + -1 * labelSize + ")");
                        svgTitle
                            .attr('transform', 'translate(62.5,' + (reverse ? width + 20 : settings.axis.labelsReservedArea - 30) + ')')
                            .style('text-anchor', 'middle');
                        svgSubtitle
                            .attr('transform', 'translate(62.5,' + (reverse ? width + 35 : settings.axis.labelsReservedArea - 15) + ')')
                            .style('text-anchor', 'middle');
                        svgRotate.attr('transform', 'translate(0,' + (reverse ? 5 : 0) + ')');
                    }
                    else {
                        svgWrap.attr("transform", "translate(0)");
                        svgTitle
                            .attr('transform', 'translate(' + (reverse ? 0 : - 10) + ',' + ((height / 2) + 5) + ')')
                            .attr('x', (reverse ? width + 10 : 0))
                            .style('text-anchor', reverse ? 'start' : 'end')
                            .attr('width', settings.axis.labelsReservedArea);
                        svgSubtitle
                            .attr('transform', 'translate(' + (reverse ? 0 : - 10) + ',' + (height + 17) + ')')
                            .attr('x', (reverse ? width + 15 : 0))
                            .style('text-anchor', reverse ? 'start' : 'end')
                            .attr('width', settings.axis.labelsReservedArea);

                        if (data.category) {
                            svgRotate.attr('transform', 'translate(' + (reverse ? 15 : settings.axis.labelsReservedArea) + ',5)');
                        } else {
                            svgRotate.attr('transform', 'translate(15,5)');
                        }
                    }

                    svgBullet
                        .attr({
                            'height': vertical ? model.height : 50,
                            'width': vertical ? 105 : model.width
                        })
                        .style('fill-opacity', (hasHighlights || hasSelection) ? ((!hasHighlights && data.selected) || data.highlight ? '1' : '0.4') : '1');

                    let targetValue = data.targetValue || 0;
                    let value = data.value || 0;
                    //Scale on X-axis
                    let scale = d3.scale.linear()
                        .domain([data.minimum, Math.max(sortedRanges[0], targetValue, value)])
                        .range(vertical ? [width, 0] : [0, width]);

                    //Set the color Scale
                    let color = d3.scale.ordinal();
                    if (data.good >= data.satisfactory) {
                        color.domain([data.satisfactory, data.good, data.maximum])
                            .range([settings.colors.badColor, settings.colors.satisfactoryColor, settings.colors.goodColor]);
                    }
                    else {
                        color.domain([data.satisfactory, data.good, data.maximum])
                            .range([settings.colors.satisfactoryColor, settings.colors.goodColor, settings.colors.badColor]);
                    }
                    //Ranges
                    let range = svgWrap.selectAll('rect.range')
                        .data(sortedRanges);

                    range.enter()
                        .append('rect')
                        .attr('class', function(d, i) { return 'range s' + i; });

                    range
                        .attr("x", (vertical ? scale : scale(data.minimum)))
                        .attr('width', function(d) { return Math.abs(scale(d) - scale(data.minimum)); })
                        .attr('height', height)
                        .attr("fill", function(d) { return color(d); });
                    //Comparison measure

                    //Main measure
                    let measure = svgWrap
                        .append('rect')
                        .classed('measure', true)
                        .style('fill', settings.colors.bulletColor);

                    measure
                        .attr('width', Math.abs(scale(value) - scale(data.minimum)))
                        .attr('height', height / 3)
                        .attr("x", vertical ? scale(value) : scale(data.minimum))
                        .attr('y', height / 3);

                    //Target markers
                    let marker = svgWrap
                        .append('line')
                        .classed('marker', true);

                    marker
                        .attr('x1', scale(targetValue))
                        .attr('x2', scale(targetValue))
                        .attr('y1', height / 6)
                        .attr('y2', height * 5 / 6)
                        .style('stroke', settings.colors.bulletColor);

                    //Ticks
                    if (settings.axis.axis) {
                        let xAxis = d3.svg.axis();
                        xAxis.orient(vertical ? "left" : "bottom");
                        let minTickSize = Math.round(Math.max(3, width / 100));
                        xAxis.ticks(minTickSize);
                        let axis = svgRotate.selectAll("g.axis").data([0]);
                        axis.enter().append("g")
                            .attr("class", "axis")
                            .attr('transform', 'translate(' + (vertical ? 65 : 0) + ',' + (vertical ? (reverse ? 0 : labelSize) : height) + ')');
                        axis.call(xAxis.scale(scale));
                        axis.selectAll('line').style('stroke', settings.axis.axisColor);
                        axis.selectAll('text').style('fill', settings.axis.axisColor);
                    }
                    TooltipManager.addTooltip(svgRotate, (tooltipEvent: TooltipEvent) => {
                        return tooltipEvent.data.toolTipInfo;
                    });
                });
            };
            this.scrollContainer.selectAll("svg").remove();
            this.bulletBody.style({
                'height': viewport.height + 'px',
                'width': viewport.width + 'px',
            });
            let visibleContainer = this.scrollContainer.node();
            if (model.bulletChartSettings.orientation.vertical) {
                this.scrollContainer.style({ 'width': (model.bulletDataPoints.length * 100) + 'px', height: '100%' });
                model.height = $(visibleContainer).outerHeight(true) - 5;
            }
            else {
                this.scrollContainer.style({ 'height': (model.bulletDataPoints.length * 50) + 'px', width: '100%' });
                model.width = $(visibleContainer).outerWidth(true);
            }

            this.scrollContainer.selectAll("svg.bullet")
                .data(model.bulletDataPoints)
                .enter().append("svg")
                .attr("class", "bullet")
                .call(bullet);
            let bullets = this.scrollContainer.selectAll("svg.bullet");
            if (this.interactivityService) {

                let behaviorOptions: BulletBehaviorOptions = {
                    bullets: bullets,
                    clearCatcher: this.clearCatcher,
                    dataPoints: model.bulletDataPoints,
                    interactivityService: this.interactivityService,
                    bulletChartSettings: model.bulletChartSettings,
                    hasHighlights: hasHighlights
                };

                this.interactivityService.bind(model.bulletDataPoints, this.behavior, behaviorOptions);
            }
        }

        /*About to remove your visual, do clean up here */
        public destroy() { }

        private hasHighlightValues(dataView: DataView, series: number): boolean {
            let column = dataView && dataView.categorical && dataView.categorical.values && dataView.categorical.values.length > 0 ? dataView.categorical.values[series] : undefined;
            return column && !!column.highlights;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] {
            let data = this.model;
            if (!data) {
                return;
            }

            let objectName = options.objectName;
            switch (objectName) {
                case 'values':
                    return this.enumerateValues(data);
                case 'orientation':
                    return this.enumerateOrientation(data);
                case 'axis':
                    return this.enumerateAxis(data);
                case 'colors':
                    return this.enumerateColors(data);
            }
        }

        private enumerateValues(data: BulletChartModel): VisualObjectInstance[] {
            let settings = data.bulletChartSettings;
            return [{
                selector: null,
                objectName: 'values',
                properties: {
                    targetValue: settings.values.targetValue,
                    minimumPercent: settings.values.minimumPercent,
                    satisfactoryPercent: settings.values.satisfactoryPercent,
                    goodPercent: settings.values.goodPercent,
                    maximumPercent: settings.values.maximumPercent,
                }
            }];
        }

        private enumerateOrientation(data: BulletChartModel): VisualObjectInstance[] {
            let settings = data.bulletChartSettings;
            return [{
                selector: null,
                objectName: 'orientation',
                properties: {
                    orientation: settings.orientation.orientation
                }
            }];
        }

        private enumerateAxis(data: BulletChartModel): VisualObjectInstance[] {
            let settings = data.bulletChartSettings;
            return [{
                selector: null,
                objectName: 'axis',
                properties: {
                    axis: settings.axis.axis,
                    axisColor: settings.axis.axisColor,
                    measureUnits: settings.axis.measureUnits,
                    unitsColor: settings.axis.unitsColor,
                    measureColor: settings.axis.measureColor,
                    labelsReservedArea: settings.axis.labelsReservedArea,
                }
            }];
        }

        private enumerateColors(data: BulletChartModel): VisualObjectInstance[] {
            let settings = data.bulletChartSettings;
            return [{
                selector: null,
                objectName: 'colors',
                properties: {
                    badColor: settings.colors.badColor,
                    satisfactoryColor: settings.colors.satisfactoryColor,
                    goodColor: settings.colors.goodColor,
                    bulletColor: settings.colors.bulletColor,
                }
            }];
        }
    }

    export interface BulletBehaviorOptions {
        bullets: D3.Selection;
        clearCatcher: D3.Selection;
        dataPoints: BulletDataPoint[];
        interactivityService: IInteractivityService;
        bulletChartSettings: BulletChartSettings;
        hasHighlights: boolean;
    }

    export class BulletWebBehavior implements IInteractiveBehavior {
        private options: BulletBehaviorOptions;

        public bindEvents(options: BulletBehaviorOptions, selectionHandler: ISelectionHandler) {
            this.options = options;
            let bullets = options.bullets;
            let clearCatcher = options.clearCatcher;

            bullets.selectAll(".wrap").on('click', (d: BulletDataPoint, i: number) => {
                d3.event.stopPropagation();
                selectionHandler.handleSelection(d, d3.event.ctrlKey);
            });

            clearCatcher.on('click', () => {
                selectionHandler.handleClearSelection();
            });
        }

        public renderSelection(hasSelection: boolean) {
            //console.log(this.options.hasHighlights);
            let options = this.options;
            options.bullets.style("fill-opacity", (d: BulletDataPoint) => {
                return hasSelection ? (d.selected ? '1' : '0.4') : '1';
            });
        }
    }
}
