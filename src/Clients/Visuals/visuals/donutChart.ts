﻿/*
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
    import ClassAndSelector = jsCommon.CssConstants.ClassAndSelector;
    import createClassAndSelector = jsCommon.CssConstants.createClassAndSelector;
    import PixelConverter = jsCommon.PixelConverter;
    import ISize = shapes.ISize;

    export interface DonutConstructorOptions {
        sliceWidthRatio?: number;
        animator?: IDonutChartAnimator;
        isScrollable?: boolean;
        disableGeometricCulling?: boolean;
        behavior?: IInteractiveBehavior;
        tooltipsEnabled?: boolean;
    }

    /**
     * Used because data points used in D3 pie layouts are placed within a container with pie information.
     */
    export interface DonutArcDescriptor extends D3.Layout.ArcDescriptor {
        data: DonutDataPoint;
    }

    export interface DonutDataPoint extends SelectableDataPoint, TooltipEnabledDataPoint {
        measure: number;
        measureFormat?: string;
        percentage: number;
        highlightRatio: number;
        label: string;
        index: number;
        /** Data points that may be drilled into */
        internalDataPoints?: DonutDataPoint[];
        color: string;
        strokeWidth: number;
        //taken from column metadata
        labelFormatString: string;
        /** This is set to true only when it's the last slice and all slices have the same color*/
        isLastInDonut?: boolean;
    }

    export interface DonutData {
        dataPointsToDeprecate: DonutDataPoint[];
        dataPoints: DonutArcDescriptor[]; // The data points will be culled based on viewport size to remove invisible slices
        unCulledDataPoints: DonutDataPoint[]; // The unculled data points will never be culled
        dataPointsToEnumerate?: LegendDataPoint[];
        legendData: LegendData;
        hasHighlights: boolean;
        dataLabelsSettings: VisualDataLabelsSettings;
        legendObjectProperties?: DataViewObject;
        maxValue?: number;
        visibleGeometryCulled?: boolean;
        defaultDataPointColor?: string;
        showAllDataPoints?: boolean;
    }

    interface DonutChartSettings {
        /**
         * The duration for a long animation displayed after a user interaction with an interactive chart. 
         */
        chartRotationAnimationDuration?: number;
        /**
         * The duration for a short animation displayed after a user interaction with an interactive chart.
         */
        legendTransitionAnimationDuration?: number;
    }

    interface InteractivityState {
        interactiveLegend: DonutChartInteractiveLegend;
        valueToAngleFactor: number; // Ratio between 360 and the sum of the angles
        sliceAngles: number[]; // Saves the angle to rotate of each slice
        currentRotate: number; // Keeps how much the donut is rotated by
        interactiveChosenSliceFinishedSetting: boolean; // flag indicating whether the chosen interactive slice was set
        lastChosenInteractiveSliceIndex: number; // keeps the index of the selected slice
        donutCenter: { // center of the chart
            x: number; y: number;
        };
        totalDragAngleDifference: number; // keeps how much of a rotation happened in the drag
        previousDragAngle: number; // previous angle of the drag event
        currentIndexDrag: number; // index of the slice that is currently showing in the legend 
        previousIndexDrag: number; // index of the slice that was showing in the legend before current drag event
    }

    export interface DonutLayout {
        fontSize: string;
        shapeLayout: {
            d: (d: DonutArcDescriptor) => string;
        };
        highlightShapeLayout: {
            d: (d: DonutArcDescriptor) => string;
        };
        zeroShapeLayout: {
            d: (d: DonutArcDescriptor) => string;
        };
    }

    /**
     * Renders a donut chart.
     */
    export class DonutChart implements IVisual {
        private static ClassName = 'donutChart';
        private static InteractiveLegendClassName = 'donutLegend';
        private static InteractiveLegendArrowClassName = 'donutLegendArrow';
        private static DrillDownAnimationDuration = 1000;
        private static OuterArcRadiusRatio = 0.9;
        private static InnerArcRadiusRatio = 0.8;
        private static InteractiveLegendContainerHeight = 70;
        private static OpaqueOpacity = 1.0;
        private static SemiTransparentOpacity = 0.6;
        private static defaultSliceWidthRatio: number = 0.48;
        private static invisibleArcLengthInPixels: number = 3;
        private static sliceClass: ClassAndSelector = createClassAndSelector('slice');
        private static sliceHighlightClass: ClassAndSelector = createClassAndSelector('slice-highlight');
        private static twoPi = 2 * Math.PI;

        public static EffectiveZeroValue = 0.000000001; // Very small multiplier so that we have a properly shaped zero arc to animate to/from.
        public static PolylineOpacity = 0.5;

        private dataViews: DataView[];
        private sliceWidthRatio: number;
        private svg: D3.Selection;
        private mainGraphicsContext: D3.Selection;
        private labelGraphicsContext: D3.Selection;
        private clearCatcher: D3.Selection;
        private legendContainer: D3.Selection;
        private interactiveLegendArrow: D3.Selection;
        private parentViewport: IViewport;
        private currentViewport: IViewport;
        private formatter: ICustomValueFormatter;
        private data: DonutData;
        private pie: D3.Layout.PieLayout;
        private arc: D3.Svg.Arc;
        private outerArc: D3.Svg.Arc;
        private radius: number;
        private previousRadius: number;
        private key: any;
        private colors: IDataColorPalette;
        private style: IVisualStyle;
        private drilled: boolean;
        private allowDrilldown: boolean;
        private options: VisualInitOptions;
        private isInteractive: boolean;
        private interactivityState: InteractivityState;
        private chartRotationAnimationDuration: number;
        private interactivityService: IInteractivityService;
        private behavior: IInteractiveBehavior;
        private legend: ILegend;
        private hasSetData: boolean;
        private isScrollable: boolean;
        private disableGeometricCulling: boolean;
        private hostService: IVisualHostServices;
        private settings: DonutChartSettings;
        private tooltipsEnabled: boolean;

        /**
         * Note: Public for testing.
         */
        public animator: IDonutChartAnimator;

        constructor(options?: DonutConstructorOptions) {
            if (options) {
                this.sliceWidthRatio = options.sliceWidthRatio;
                this.animator = options.animator;
                this.isScrollable = options.isScrollable ? options.isScrollable : false;
                this.disableGeometricCulling = options.disableGeometricCulling ? options.disableGeometricCulling : false;
                this.behavior = options.behavior;
                this.tooltipsEnabled = options.tooltipsEnabled;
            }
            if (this.sliceWidthRatio == null) {
                this.sliceWidthRatio = DonutChart.defaultSliceWidthRatio;
            }
        }

        public static converter(dataView: DataView, colors: IDataColorPalette, defaultDataPointColor?: string, viewport?: IViewport, disableGeometricCulling?: boolean, interactivityService?: IInteractivityService): DonutData {
            let converter = new DonutChartConversion.DonutChartConverter(dataView, colors, defaultDataPointColor);
            converter.convert();
            let d3PieLayout = d3.layout.pie()
                .sort(null)
                .value((d: DonutDataPoint) => {
                    return d.percentage;
                });

            if (interactivityService) {
                interactivityService.applySelectionStateToData(converter.dataPoints);
                interactivityService.applySelectionStateToData(converter.legendData.dataPoints);
            }

            let culledDataPoints = (!disableGeometricCulling && viewport) ? DonutChart.cullDataByViewport(converter.dataPoints, converter.maxValue, viewport) : converter.dataPoints;
            return {
                dataPointsToDeprecate: culledDataPoints,
                dataPoints: d3PieLayout(culledDataPoints),
                unCulledDataPoints: converter.dataPoints,
                dataPointsToEnumerate: converter.legendData.dataPoints,
                legendData: converter.legendData,
                hasHighlights: converter.hasHighlights,
                dataLabelsSettings: converter.dataLabelsSettings,
                legendObjectProperties: converter.legendObjectProperties,
                maxValue: converter.maxValue,
                visibleGeometryCulled: converter.dataPoints.length !== culledDataPoints.length,
            };
        }

        public init(options: VisualInitOptions) {
            this.options = options;
            let element = options.element;
            // Ensure viewport is empty on init
            element.empty();
            this.parentViewport = options.viewport;
            // avoid deep copy
            this.currentViewport = {
                height: options.viewport.height,
                width: options.viewport.width,
            };

            this.formatter = valueFormatter.format;
            this.data = {
                dataPointsToDeprecate: [],
                dataPointsToEnumerate: [],
                dataPoints: [],
                unCulledDataPoints: [],
                legendData: { title: "", dataPoints: [], fontSize: SVGLegend.DefaultFontSizeInPt},
                hasHighlights: false,
                dataLabelsSettings: dataLabelUtils.getDefaultDonutLabelSettings(),
            };
            this.drilled = false;
            // Leaving this false for now, will depend on the datacategory in the future
            this.allowDrilldown = false;
            this.style = options.style;
            this.colors = this.style.colorPalette.dataColors;
            this.radius = 0;
            this.isInteractive = options.interactivity && options.interactivity.isInteractiveLegend;
            let donutChartSettings = this.settings;

            if (this.behavior) {
                this.interactivityService = createInteractivityService(options.host);
            }
            this.legend = createLegend(element, options.interactivity && options.interactivity.isInteractiveLegend, this.interactivityService, this.isScrollable);

            this.hostService = options.host;

            if (this.isInteractive) {
                this.chartRotationAnimationDuration = (donutChartSettings && donutChartSettings.chartRotationAnimationDuration) ? donutChartSettings.chartRotationAnimationDuration : 0;

                // Create interactive legend
                let legendContainer = this.legendContainer = d3.select(element.get(0))
                    .append('div')
                    .classed(DonutChart.InteractiveLegendClassName, true);
                this.interactivityState = {
                    interactiveLegend: new DonutChartInteractiveLegend(this, legendContainer, this.colors, options, this.settings),
                    valueToAngleFactor: 0,
                    sliceAngles: [],
                    currentRotate: 0,
                    interactiveChosenSliceFinishedSetting: false,
                    lastChosenInteractiveSliceIndex: 0,
                    totalDragAngleDifference: 0,
                    currentIndexDrag: 0,
                    previousIndexDrag: 0,
                    previousDragAngle: 0,
                    donutCenter: { x: 0, y: 0 },
                };
            }

            this.svg = d3.select(element.get(0))
                .append('svg')
                .style('position', 'absolute')
                .classed(DonutChart.ClassName, true);

            if (this.behavior)
                this.clearCatcher = appendClearCatcher(this.svg);

            this.mainGraphicsContext = this.svg.append('g');
            this.mainGraphicsContext.append("g")
                .classed('slices', true);

            this.labelGraphicsContext = this.svg
                .append("g")
                .classed(NewDataLabelUtils.labelGraphicsContextClass.class, true);

            this.pie = d3.layout.pie()
                .sort(null)
                .value((d: DonutDataPoint) => {
                    return d.percentage;
                });
        }

        public update(options: VisualUpdateOptions): void {
            debug.assertValue(options, 'options');

            // Viewport resizing
            let viewport = options.viewport;
            this.parentViewport = viewport;

            let dataViews = this.dataViews = options.dataViews;
            if (dataViews && dataViews.length > 0 && dataViews[0].categorical) {
                let dataViewMetadata = dataViews[0].metadata;
                let showAllDataPoints = undefined;
                let defaultDataPointColor = undefined;
                if (dataViewMetadata) {
                    let objects: DataViewObjects = dataViewMetadata.objects;

                    if (objects) {
                        showAllDataPoints = DataViewObjects.getValue<boolean>(objects, donutChartProps.dataPoint.showAllDataPoints);
                        defaultDataPointColor = DataViewObjects.getFillColor(objects, donutChartProps.dataPoint.defaultColor);
                    }
                }

                this.data = DonutChart.converter(dataViews[0], this.colors, defaultDataPointColor, this.currentViewport, this.disableGeometricCulling, this.interactivityService);
                this.data.showAllDataPoints = showAllDataPoints;
                this.data.defaultDataPointColor = defaultDataPointColor;
                if (!(this.options.interactivity && this.options.interactivity.isInteractiveLegend))
                    this.renderLegend();
            }

            else {
                this.data = {
                    dataPointsToDeprecate: [],
                    dataPointsToEnumerate: [],
                    dataPoints: [],
                    unCulledDataPoints: [],
                    legendData: { title: "", dataPoints: [] },
                    hasHighlights: false,
                    dataLabelsSettings: dataLabelUtils.getDefaultDonutLabelSettings(),
                };
            }

            this.initViewportDependantProperties();
            this.updateInternal(this.data, options.suppressAnimations);
            this.hasSetData = true;

            if (dataViews) {
                let warnings = getInvalidValueWarnings(
                    dataViews,
                    false /*supportsNaN*/,
                    false /*supportsNegativeInfinity*/,
                    false /*supportsPositiveInfinity*/);

                if (this.data.visibleGeometryCulled) {
                    warnings.unshift(new GeometryCulledWarning());
                }

                    this.hostService.setWarnings(warnings);
            }
        }

        public onDataChanged(options: VisualDataChangedOptions): void {
            debug.assertValue(options, 'options');

            this.update({
                dataViews: options.dataViews,
                suppressAnimations: options.suppressAnimations,
                viewport: this.currentViewport,
                });
        }

        public onResizing(viewport: IViewport): void {
            this.update({
                dataViews: this.dataViews,
                suppressAnimations: true,
                viewport: viewport,
            });
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let enumeration = new ObjectEnumerationBuilder();

            let dataLabelsSettings = this.data && this.data.dataLabelsSettings
                ? this.data.dataLabelsSettings
                : dataLabelUtils.getDefaultDonutLabelSettings();

            switch (options.objectName) {
                case 'legend':
                    this.enumerateLegend(enumeration);
                    break;
                case 'dataPoint':
                    this.enumerateDataPoints(enumeration);
                    break;
                case 'labels':
                    let labelSettingOptions: VisualDataLabelsSettingsOptions = {
                        enumeration: enumeration,
                        dataLabelsSettings: dataLabelsSettings,
                        show: true,
                        displayUnits: true,
                        precision: true,
                        fontSize: true,
                        labelStyle: true,
                    };
                    dataLabelUtils.enumerateDataLabels(labelSettingOptions);
                    break;
            }
            return enumeration.complete();
        }

        private enumerateDataPoints(enumeration: ObjectEnumerationBuilder): void {
            let data = this.data;
            if (!data)
                return;

            enumeration.pushInstance({
                objectName: 'dataPoint',
                selector: null,
                properties: {
                    defaultColor: { solid: { color: data.defaultDataPointColor || this.colors.getColorByIndex(0).value } }
                },
            }).pushInstance({
                objectName: 'dataPoint',
                selector: null,
                properties: {
                    showAllDataPoints: !!data.showAllDataPoints
                },
            });

            let dataPoints = data.dataPointsToEnumerate;
            let dataPointsLength = dataPoints.length;

            for (let i = 0; i < dataPointsLength; i++) {
                let dataPoint = dataPoints[i];
                enumeration.pushInstance({
                    objectName: 'dataPoint',
                    displayName: dataPoint.label,
                    selector: ColorHelper.normalizeSelector(dataPoint.identity.getSelector()),
                    properties: {
                        fill: { solid: { color: dataPoint.color } }
                    },
                });
            }
        }

        private enumerateLegend(enumeration: ObjectEnumerationBuilder): ObjectEnumerationBuilder {
            let data = this.data;
            if (!data)
                return;

            let legendObjectProperties: DataViewObjects = { legend: data.legendObjectProperties };

            let show = DataViewObjects.getValue(legendObjectProperties, donutChartProps.legend.show, this.legend.isVisible());
            let showTitle = DataViewObjects.getValue(legendObjectProperties, donutChartProps.legend.showTitle, true);
            let titleText = DataViewObjects.getValue(legendObjectProperties, donutChartProps.legend.titleText, this.data.legendData.title);
            let labelColor = DataViewObject.getValue(legendObjectProperties, legendProps.labelColor, this.data.legendData.labelColor);
            let labelFontSize = DataViewObject.getValue(legendObjectProperties, legendProps.fontSize, this.data.legendData.fontSize);

            enumeration.pushInstance({
                selector: null,
                objectName: 'legend',
                properties: {
                    show: show,
                    position: LegendPosition[this.legend.getOrientation()],
                    showTitle: showTitle,
                    titleText: titleText,
                    labelColor: labelColor,
                    fontSize: labelFontSize
                }
            });
        }

        public setInteractiveChosenSlice(sliceIndex: number): void {
            if (this.interactivityState.sliceAngles.length === 0) return;

            this.interactivityState.lastChosenInteractiveSliceIndex = sliceIndex;
            this.interactivityState.interactiveChosenSliceFinishedSetting = false;
            let viewport = this.currentViewport;
            let moduledIndex = sliceIndex % this.data.dataPoints.length;
            let angle = this.interactivityState.sliceAngles[moduledIndex];

            this.svg.select('g')
                .transition()
                .duration(this.chartRotationAnimationDuration)
                .ease('elastic')
                .attr('transform', SVGUtil.translateAndRotate(viewport.width / 2, viewport.height / 2, 0, 0, angle))
                .each('end', () => { this.interactivityState.interactiveChosenSliceFinishedSetting = true; });

            this.interactivityState.currentRotate = angle;
            this.interactivityState.interactiveLegend.updateLegend(moduledIndex);
            // Set the opacity of chosen slice to full and the others to semi-transparent
            this.svg.selectAll('.slice').attr('opacity', (d, index) => {
                return index === moduledIndex ? 1 : 0.6;
            });

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private calculateRadius(): number {
            let viewport = this.currentViewport;
            if (!this.isInteractive && this.data && this.data.dataLabelsSettings.show) {
                // if we have category or data labels, use a sigmoid to blend the desired denominator from 2 to 3.
                // if we are taller than we are wide, we need to use a larger denominator to leave horizontal room for the labels.
                let hw = viewport.height / viewport.width;
                let denom = 2 + (1 / (1 + Math.exp(-5 * (hw - 1))));
                return Math.min(viewport.height, viewport.width) / denom;
            }

            // no labels (isInteractive does not have labels since the interactive legend shows extra info)
            return Math.min(viewport.height, viewport.width) / 2;
        }

        private initViewportDependantProperties(duration: number = 0) {
            this.currentViewport.height = this.parentViewport.height;
            this.currentViewport.width = this.parentViewport.width;
            let viewport = this.currentViewport;

            if (this.isInteractive) {
                viewport.height -= DonutChart.InteractiveLegendContainerHeight; // leave space for the legend
            }
            else {
                let legendMargins = this.legend.getMargins();
                viewport.height -= legendMargins.height;
                viewport.width -= legendMargins.width;
            }

            this.svg.attr({
                'width': viewport.width,
                'height': viewport.height
            });

            if (this.isInteractive) {
                this.legendContainer
                    .style({
                        'width': '100%',
                        'height': DonutChart.InteractiveLegendContainerHeight + 'px',
                        'overflow': 'hidden',
                        'top': 0
                    });
                this.svg
                    .style('top', DonutChart.InteractiveLegendContainerHeight);
            }

            this.previousRadius = this.radius;
            let radius = this.radius = this.calculateRadius();
            let halfViewportWidth = viewport.width / 2;
            let halfViewportHeight = viewport.height / 2;

            this.arc = d3.svg.arc();

            this.outerArc = d3.svg.arc()
                .innerRadius(radius * DonutChart.OuterArcRadiusRatio)
                .outerRadius(radius * DonutChart.OuterArcRadiusRatio);

            if (this.isInteractive) {
                this.mainGraphicsContext.attr('transform', SVGUtil.translate(halfViewportWidth, halfViewportHeight));
                this.labelGraphicsContext.attr('transform', SVGUtil.translate(halfViewportWidth, halfViewportHeight));
            } else {
                this.mainGraphicsContext.transition().duration(duration).attr('transform', SVGUtil.translate(halfViewportWidth, halfViewportHeight));
                this.labelGraphicsContext.transition().duration(duration).attr('transform', SVGUtil.translate(halfViewportWidth, halfViewportHeight));
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private mergeDatasets(first: any[], second: any[]): any[] {
            let secondSet = d3.set();
            second.forEach((d) => {
                secondSet.add(d.identity ? d.identity.getKey() : d.data.identity.getKey());
            });

            let onlyFirst = first.filter((d) => {
                return !secondSet.has(d.identity ? d.identity.getKey() : d.data.identity.getKey());
            }).map((d) => {
                let derived = Prototype.inherit(d);
                derived.percentage === undefined ? derived.data.percentage = 0 : derived.percentage = 0;
                return derived;
            });

            return d3.merge([second, onlyFirst]);
        }

        private updateInternal(data: DonutData, suppressAnimations: boolean, duration: number = 0) {
            let viewport = this.currentViewport;
            duration = duration || AnimatorCommon.GetAnimationDuration(this.animator, suppressAnimations);
            if (this.animator) {
                let layout = DonutChart.getLayout(this.radius, this.sliceWidthRatio, viewport, data.dataLabelsSettings);
                let result: DonutChartAnimationResult;
                let shapes: D3.UpdateSelection;
                let highlightShapes: D3.UpdateSelection;
                let labelSettings = data.dataLabelsSettings;
                let labels: Label[] = [];
                if (labelSettings && labelSettings.show) {
                    labels = this.createLabels();
                }
                if (!suppressAnimations) {
                    let animationOptions: DonutChartAnimationOptions = {
                        viewModel: data,
                        colors: this.colors,
                        graphicsContext: this.mainGraphicsContext,
                        labelGraphicsContext: this.labelGraphicsContext,
                        interactivityService: this.interactivityService,
                        layout: layout,
                        radius: this.radius,
                        sliceWidthRatio: this.sliceWidthRatio,
                        viewport: viewport,
                        labels: labels,
                        innerArcRadiusRatio: DonutChart.InnerArcRadiusRatio,
                    };
                    result = this.animator.animate(animationOptions);
                    shapes = result.shapes;
                    highlightShapes = result.highlightShapes;
                }
                if (suppressAnimations || result.failed) {
                    shapes = DonutChart.drawDefaultShapes(this.svg, data, layout, this.colors, this.radius, this.interactivityService && this.interactivityService.hasSelection(), this.sliceWidthRatio, this.data.defaultDataPointColor);
                    highlightShapes = DonutChart.drawDefaultHighlightShapes(this.svg, data, layout, this.colors, this.radius, this.sliceWidthRatio);
                    NewDataLabelUtils.drawDefaultLabels(this.labelGraphicsContext, labels, false);
                    NewDataLabelUtils.drawLabelLeaderLines(this.labelGraphicsContext, labels);
                }

                this.assignInteractions(shapes, highlightShapes, data);

                if (this.tooltipsEnabled) {
                    TooltipManager.addTooltip(shapes, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
                    TooltipManager.addTooltip(highlightShapes, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
                }
            }
            else {
                this.updateInternalToMove(data, duration);
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private createLabels(): Label[]{
            let labels: Label[] = [];
            let labelDataPoints: DonutLabelDataPoint[] = this.createLabelDataPoints();
            let labelLayout = new DonutLabelLayout({
                maximumOffset: NewDataLabelUtils.maxLabelOffset,
                startingOffset: NewDataLabelUtils.startingLabelOffset
            });
            let donutProreties: DonutChartProperties = {
                viewport: this.currentViewport,
                radius: this.radius,
                arc: this.arc.innerRadius(0).outerRadius(this.radius * DonutChart.InnerArcRadiusRatio),
                outerArc: this.outerArc,
                innerArcRadiusRatio: DonutChart.InnerArcRadiusRatio,
                outerArcRadiusRatio: DonutChart.OuterArcRadiusRatio,
                dataLabelsSettings: this.data.dataLabelsSettings,
            };
            labels = labelLayout.layout(labelDataPoints, donutProreties);
            return labels;
        }
        private createLabelDataPoints(): DonutLabelDataPoint[] {
            let data = this.data;
            let labelDataPoints: DonutLabelDataPoint[] = [];
            for (let i = 0; i < this.data.dataPoints.length; i++) {
                let alternativeScale: number = null;
                if (data.dataLabelsSettings.displayUnits === 0)
                    alternativeScale = <number>d3.max(data.dataPoints, d => Math.abs(d.data.measure));
                let label = this.createLabelDataPoint(data.dataPoints[i], alternativeScale);
                labelDataPoints.push(label);
            }
            return labelDataPoints;
        }
        
        private createLabelDataPoint(d: DonutArcDescriptor, alternativeScale: number): DonutLabelDataPoint {
            let labelPoint = this.outerArc.centroid(d);
            let viewport = this.currentViewport;
            let labelX = NewDataLabelUtils.getXPositionForDonutLabel(labelPoint[0]);
            let labelY = labelPoint[1];
            let labelSettings = this.data.dataLabelsSettings;
            let label: DonutLabelDataPoint;
            let measureFormattersCache = dataLabelUtils.createColumnFormatterCacheManager();
            let measureFormatter = measureFormattersCache.getOrCreate(d.data.measureFormat, labelSettings, alternativeScale);
            let spaceAvailableForLabels = viewport.width / 2 - Math.abs(labelX) - NewDataLabelUtils.maxLabelOffset;
            let properties: TextProperties;
            let labelWidth: number;
            let isTruncated = false;
            /*When both category and data labels are turned on*/
            if (labelSettings.show) {
                switch (labelSettings.labelStyle) {
                    case labelStyle.both: {
                        //categoty label
                        properties = {
                            text: d.data.label,
                            fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                            fontSize: PixelConverter.fromPoint(labelSettings.fontSize),
                            fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
                        };
                        labelWidth = TextMeasurementService.measureSvgTextWidth(properties);
                        if (labelWidth > spaceAvailableForLabels / 2)
                            isTruncated = true;
                        //data label
                        let dataProperties = {
                            text: " (" + measureFormatter.format(d.data.measure) + ")",
                            fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                            fontSize: PixelConverter.fromPoint(labelSettings.fontSize),
                            fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
                        };
                        let dataLabelWidth = TextMeasurementService.measureSvgTextWidth(dataProperties);
                        // label width = category width + data width
                        labelWidth += dataLabelWidth;
                        if (dataLabelWidth > spaceAvailableForLabels / 2)
                            isTruncated = true;
                        break;
                    }
                    case labelStyle.category:
                    case labelStyle.data: {
                        properties = {
                            text: labelSettings.labelStyle === labelStyle.category ? d.data.label : measureFormatter.format(d.data.measure),
                            fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                            fontSize: PixelConverter.fromPoint(labelSettings.fontSize),
                            fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
                        };
                        labelWidth = TextMeasurementService.measureSvgTextWidth(properties);
                        if (labelWidth > spaceAvailableForLabels)
                            isTruncated = true;

                        break;
                    }
                }
            }
            let text = NewDataLabelUtils.setLabelTextDonutChart(d, labelX, viewport, labelSettings, alternativeScale);
            properties = {
                text: text,
                fontFamily: NewDataLabelUtils.LabelTextProperties.fontFamily,
                fontSize: PixelConverter.fromPoint(labelSettings.fontSize),
                fontWeight: NewDataLabelUtils.LabelTextProperties.fontWeight,
            };
            let textSize: ISize = {
                width: TextMeasurementService.measureSvgTextWidth(properties),
                height: TextMeasurementService.measureSvgTextHeight(properties),
            };
            let position = labelX < 0 ? NewPointLabelPosition.Left : NewPointLabelPosition.Right;
            let pointPosition: LabelParentPoint = {
                point: {
                    x: labelX,
                    y: labelY,
                },
                validPositions: [position],
                radius: 0,
            };
            label = {
                isPreferred: true,
                text: text,
                textSize: textSize,
                outsideFill: labelSettings.labelColor ? labelSettings.labelColor : NewDataLabelUtils.defaultLabelColor,
                isParentRect: false,
                fontSize: labelSettings.fontSize,
                identity: d.data.identity,
                donutArcDescriptor: d,
                parentShape: pointPosition,
                insideFill: NewDataLabelUtils.defaultInsideLabelColor,
                alternativeScale: alternativeScale,
                isTruncated: isTruncated,
                parentType: LabelDataPointParentType.Point
            };
            return label;
        }

        private renderLegend(): void {
            if (!this.isInteractive) {
                let legendObjectProperties = this.data.legendObjectProperties;
                if (legendObjectProperties) {
                    let legendData = this.data.legendData;
                    LegendData.update(legendData, legendObjectProperties);
                    let position = <string>legendObjectProperties[legendProps.position];
                    if (position)
                        this.legend.changeOrientation(LegendPosition[position]);

                    this.legend.drawLegend(legendData, this.parentViewport);
                } else {
                    this.legend.changeOrientation(LegendPosition.Top);
                    this.legend.drawLegend({ dataPoints: [] }, this.parentViewport);
                }
            }
        }

        private addInteractiveLegendArrow(): void {
            let arrowHeightOffset = 11;
            let arrowWidthOffset = 33 / 2;
            if (!this.interactiveLegendArrow) {
                let interactiveLegendArrow = this.svg.append('g');
                interactiveLegendArrow.append('path')
                    .classed(DonutChart.InteractiveLegendArrowClassName, true)
                    .attr('d', 'M1.5,2.6C0.65,1.15,1.85,0,3,0l27,0c1.65,0,2.35,1.15,1.5,2.6L18,26.45c-0.8,1.45-2.15,1.45-2.95,0L1.95,2.6z');
                this.interactiveLegendArrow = interactiveLegendArrow;
            }
            let viewport = this.currentViewport;
            // Calculate the offsets from the legend container to the arrow.
            let distanceBetweenLegendAndArrow = (viewport.height - 2 * this.radius) / 2 + arrowHeightOffset;
            let middleOfChart = viewport.width / 2 - arrowWidthOffset;

            this.interactiveLegendArrow.attr('transform', SVGUtil.translate(middleOfChart, distanceBetweenLegendAndArrow));
        }

        private calculateSliceAngles(): void {
            let angles: number[] = [];
            let data = this.data.dataPoints;

            if (data.length === 0) {
                this.interactivityState.valueToAngleFactor = 0;
                this.interactivityState.sliceAngles = [];
                return;
            }

            let sum = 0;
            for (let i = 0, ilen = data.length; i < ilen; i++) {
                sum += data[i].data.percentage; // value is an absolute number
            }
            debug.assert(sum !== 0, 'sum of slices values cannot be zero');
            this.interactivityState.valueToAngleFactor = 360 / sum; // Calculate the ratio between 360 and the sum to know the angles to rotate by

            let currentAngle = 0;
            for (let i = 0, ilen = data.length; i < ilen; i++) {
                let relativeAngle = data[i].data.percentage * this.interactivityState.valueToAngleFactor;
                currentAngle += relativeAngle;
                angles.push((relativeAngle / 2) - currentAngle);
            }

            this.interactivityState.sliceAngles = angles;
        }

        private assignInteractions(slices: D3.Selection, highlightSlices: D3.Selection, data: DonutData): void {
            // assign interactions according to chart interactivity type
            if (this.isInteractive) {
                this.assignInteractiveChartInteractions(slices);
            }
            else if (this.interactivityService) {
                let dataPoints = data.dataPoints.map((value: DonutArcDescriptor) => value.data);
                let behaviorOptions: DonutBehaviorOptions = {
                    clearCatcher: this.clearCatcher,
                    slices: slices,
                    highlightSlices: highlightSlices,
                    allowDrilldown: this.allowDrilldown,
                    visual: this,
                    hasHighlights: data.hasHighlights,
                    svg: this.svg,
                };

                this.interactivityService.bind(dataPoints, this.behavior, behaviorOptions);
            }
        }

        public setDrilldown(selection?: DonutDataPoint): void {
            if (selection) {
                let d3PieLayout = d3.layout.pie()
                    .sort(null)
                    .value((d: DonutDataPoint) => {
                        return d.percentage;
                    });
                // Drill into the current selection.
                let legendDataPoints: LegendDataPoint[] = [{ label: selection.label, color: selection.color, icon: LegendIcon.Box, identity: selection.identity, selected: selection.selected }];
                let legendData: LegendData = { title: "", dataPoints: legendDataPoints };
                let drilledDataPoints = d3PieLayout(selection.internalDataPoints);
                this.updateInternal({
                    dataPointsToDeprecate: selection.internalDataPoints,
                    dataPoints: drilledDataPoints,
                    unCulledDataPoints: drilledDataPoints.map((value) => value.data),
                    legendData: legendData,
                    hasHighlights: false,
                    dataLabelsSettings: this.data.dataLabelsSettings,
                }, false /* suppressAnimations */, DonutChart.DrillDownAnimationDuration);
            } else {
                // Pop out of drill down to view the "outer" data.
                this.updateInternal(this.data, false /* suppressAnimations */, DonutChart.DrillDownAnimationDuration);
            }
        }

        private assignInteractiveChartInteractions(slice: D3.Selection) {
            let svg = this.svg;

            this.interactivityState.interactiveChosenSliceFinishedSetting = true;
            let svgRect = svg.node().getBoundingClientRect();
            this.interactivityState.donutCenter = { x: svgRect.left + svgRect.width / 2, y: svgRect.top + svgRect.height / 2 }; // Center of the donut chart
            this.interactivityState.totalDragAngleDifference = 0;
            this.interactivityState.currentRotate = 0;

            this.calculateSliceAngles();

            // Set the on click method for the slices so thsete pie chart will turn according to each slice's corresponding angle [the angle its on top]
            slice.on('click', (d: DonutArcDescriptor, clickedIndex: number) => {
                if (d3.event.defaultPrevented) return; // click was suppressed, for example from drag event
                this.setInteractiveChosenSlice(clickedIndex);
            });

            // Set the drag events
            let drag = d3.behavior.drag()
                .origin(Object)
                .on('dragstart', () => this.interactiveDragStart())
                .on('drag', () => this.interactiveDragMove())
                .on('dragend', () => this.interactiveDragEnd());
            svg.call(drag);
        }

        /**
         * Get the angle (in degrees) of the drag event coordinates.
         * The angle is calculated against the plane of the center of the donut
         * (meaning, when the center of the donut is at (0,0) coordinates).
         */
        private getAngleFromDragEvent(): number {
            let interactivityState = this.interactivityState;

            // get pageX and pageY (coordinates of the drag event) according to event type
            let pageX, pageY;
            let sourceEvent = <any>d3.event.sourceEvent;
            // check if that's a touch event or not
            if (sourceEvent.type.toLowerCase().indexOf('touch') !== -1) {
                if (sourceEvent.touches.length !== 1) return null; // in case there isn't a single touch - return null and do nothing.
                // take the first, single, touch surface.
                let touch = sourceEvent.touches[0];
                pageX = touch.pageX;
                pageY = touch.pageY;
            } else {
                pageX = sourceEvent.pageX;
                pageY = sourceEvent.pageY;
            }

            // Adjust the coordinates, putting the donut center as the (0,0) coordinates
            let adjustedCoordinates = { x: pageX - interactivityState.donutCenter.x, y: -pageY + interactivityState.donutCenter.y };
            // Move to polar axis - take only the angle (theta), and convert to degrees
            let angleToThePlane = Math.atan2(adjustedCoordinates.y, adjustedCoordinates.x) * 180 / Math.PI;
            return angleToThePlane;
        }

        private interactiveDragStart(): void {
            this.interactivityState.totalDragAngleDifference = 0;
            this.interactivityState.previousDragAngle = this.getAngleFromDragEvent();
        }

        private interactiveDragMove(): void {
            let data = this.data.dataPoints;
            let viewport = this.currentViewport;

            let interactivityState = this.interactivityState;

            if (interactivityState.interactiveChosenSliceFinishedSetting === true) {
                // get current angle from the drag event
                let currentDragAngle = this.getAngleFromDragEvent();
                if (!currentDragAngle) return; // if no angle was returned, do nothing
                // compare it to the previous drag event angle
                let angleDragDiff = interactivityState.previousDragAngle - currentDragAngle;

                interactivityState.totalDragAngleDifference += angleDragDiff;
                interactivityState.previousDragAngle = currentDragAngle;

                // Rotate the chart by the difference in angles
                interactivityState.currentRotate += angleDragDiff;

                // Rotate the chart to the current rotate angle
                this.svg.select('g')
                    .attr('transform', SVGUtil.translateAndRotate(viewport.width / 2, viewport.height / 2, 0, 0, this.interactivityState.currentRotate));

                let currentHigherLimit = data[0].data.percentage * interactivityState.valueToAngleFactor;
                let currentAngle = interactivityState.currentRotate <= 0 ? (interactivityState.currentRotate * -1) % 360 : (360 - (interactivityState.currentRotate % 360));

                interactivityState.currentIndexDrag = 0;
                //consider making this  ++interactivityState.currentIndexDrag ? then you don't need the if statement, the interactivityState.currentIndexDrag +1 and interactivityState.currentIndexDrag++
                // Check the current index according to the angle 
                let dataLength = data.length;
                while ((interactivityState.currentIndexDrag < dataLength) && (currentAngle > currentHigherLimit)) {
                    if (interactivityState.currentIndexDrag < (dataLength - 1)) {
                        currentHigherLimit += (data[interactivityState.currentIndexDrag + 1].data.percentage * interactivityState.valueToAngleFactor);
                    }
                    interactivityState.currentIndexDrag++;
                }

                // If the index changed update the legend and opacity
                if (interactivityState.currentIndexDrag !== interactivityState.previousIndexDrag) {
                    interactivityState.interactiveLegend.updateLegend(interactivityState.currentIndexDrag);
                    // set the opacticity of the top slice to full and the others to semi-transparent
                    this.svg.selectAll('.slice').attr('opacity', (d, index) => {
                        return index === interactivityState.currentIndexDrag ? DonutChart.OpaqueOpacity : DonutChart.SemiTransparentOpacity;
                    });
                    interactivityState.previousIndexDrag = interactivityState.currentIndexDrag;
                }
            }
        }

        private interactiveDragEnd(): void {
            // If totalDragDifference was changed, means we have a drag event (compared to a click event)
            if (this.interactivityState.totalDragAngleDifference !== 0) {
                this.setInteractiveChosenSlice(this.interactivityState.currentIndexDrag);
                // drag happened - disable click event
                d3.event.sourceEvent.stopPropagation();
            }
        }

        private updateInternalToMove(data: DonutData, duration: number = 0) {
            // Cache for performance
            let svg = this.svg;
            let pie = this.pie;
            let key = this.key;
            let arc = this.arc;
            let radius = this.radius;
            let previousRadius = this.previousRadius;
            let sliceWidthRatio = this.sliceWidthRatio;

            let existingData = this.svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data().map((d: DonutArcDescriptor) => d.data);

            if (existingData.length === 0) {
                existingData = data.dataPointsToDeprecate;
            }

            let is = this.mergeDatasets(existingData, data.dataPointsToDeprecate);

            let slice = svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(pie(data.dataPointsToDeprecate), key);

            slice.enter()
                .insert('path')
                .classed(DonutChart.sliceClass.class, true)
                .each(function (d) { this._current = d; });

            slice = svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(pie(is), key);

            let innerRadius = radius * sliceWidthRatio;
            DonutChart.isSingleColor(data.dataPoints);

            slice
                .style('fill', (d: DonutArcDescriptor) => d.data.color)
                .style('fill-opacity', (d: DonutArcDescriptor) => ColumnUtil.getFillOpacity(d.data.selected, false, false, data.hasHighlights))
                .style('stroke', 'white')
                .style('stroke-dasharray', (d: DonutArcDescriptor) => DonutChart.drawStrokeForDonutChart(radius, DonutChart.InnerArcRadiusRatio, d, sliceWidthRatio))
                .style('stroke-width', (d: DonutArcDescriptor) => d.data.strokeWidth)        
                .transition().duration(duration)
                .attrTween('d', function (d) {
                    let i = d3.interpolate(this._current, d),
                        k = d3.interpolate(previousRadius * DonutChart.InnerArcRadiusRatio
                            , radius * DonutChart.InnerArcRadiusRatio);

                    this._current = i(0);

                    return function (t) {
                        return arc.innerRadius(innerRadius).outerRadius(k(t))(i(t));
                    };
                });

            slice = svg.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(pie(data.dataPointsToDeprecate), key);

            slice.exit()
                .transition()
                .delay(duration)
                .duration(0)
                .remove();

            // For interactive chart, there shouldn't be slice labels (as you have the legend).
            if (!this.isInteractive) {
                let labelSettings = data.dataLabelsSettings;
                let labels: Label[] = [];
                if (labelSettings && labelSettings.show) {
                    labels = this.createLabels();
                }
                NewDataLabelUtils.drawDefaultLabels(this.labelGraphicsContext, labels, false);
                NewDataLabelUtils.drawLabelLeaderLines(this.labelGraphicsContext, labels);
            }
            let highlightSlices = undefined;
            if (data.hasHighlights) {
                // Draw partial highlight slices.
                highlightSlices = svg
                    .select('.slices')
                    .selectAll('path' + DonutChart.sliceHighlightClass.selector)
                    .data(pie(data.dataPointsToDeprecate), key);

                highlightSlices
                    .enter()
                    .insert('path')
                    .classed(DonutChart.sliceHighlightClass.class, true)
                    .each(function (d) { this._current = d; });

                DonutChart.isSingleColor(data.dataPoints);

                highlightSlices
                    .style('fill', (d: DonutArcDescriptor) => d.data.color)
                    .style('fill-opacity', 1.0)
                    .style('stroke', 'white')
                    .style('stroke-dasharray', (d: DonutArcDescriptor) => DonutChart.drawStrokeForDonutChart(radius, DonutChart.InnerArcRadiusRatio, d, sliceWidthRatio, d.data.highlightRatio))
                    .style('stroke-width', (d: DonutArcDescriptor) => d.data.highlightRatio === 0 ? 0 : d.data.strokeWidth)
                    .transition().duration(duration)
                    .attrTween('d', function (d: DonutArcDescriptor) {
                        let i = d3.interpolate(this._current, d),
                            k = d3.interpolate(
                                previousRadius * DonutChart.InnerArcRadiusRatio,
                                DonutChart.getHighlightRadius(radius, sliceWidthRatio, d.data.highlightRatio));

                        this._current = i(0);

                        return function (t) {
                            return arc.innerRadius(innerRadius).outerRadius(k(t))(i(t));
                        };
                    });

                highlightSlices
                    .exit()
                    .transition()
                    .delay(duration)
                    .duration(0)
                    .remove();
            }
            else {
                svg
                    .selectAll('path' + DonutChart.sliceHighlightClass.selector)
                    .transition()
                    .delay(duration)
                    .duration(0)
                    .remove();
            }

            this.assignInteractions(slice, highlightSlices, data);

            if (this.tooltipsEnabled) {
                TooltipManager.addTooltip(slice, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
                if (data.hasHighlights) {
                    TooltipManager.addTooltip(highlightSlices, (tooltipEvent: TooltipEvent) => tooltipEvent.data.data.tooltipInfo);
                }
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);

            if (this.isInteractive) {
                this.addInteractiveLegendArrow();
                this.interactivityState.interactiveLegend.drawLegend(this.data.dataPointsToDeprecate);
                this.setInteractiveChosenSlice(this.interactivityState.lastChosenInteractiveSliceIndex ? this.interactivityState.lastChosenInteractiveSliceIndex : 0);
            }
        }

        public static drawDefaultShapes(graphicsContext: D3.Selection, donutData: DonutData, layout: DonutLayout, colors: IDataColorPalette, radius: number, hasSelection: boolean, sliceWidthRatio: number, defaultColor?: string): D3.UpdateSelection {
            let shapes = graphicsContext.select('.slices')
                .selectAll('path' + DonutChart.sliceClass.selector)
                .data(donutData.dataPoints, (d: DonutArcDescriptor) => d.data.identity.getKey());

            shapes.enter()
                .insert('path')
                .classed(DonutChart.sliceClass.class, true);

            DonutChart.isSingleColor(donutData.dataPoints);

            shapes
                .style('fill', (d: DonutArcDescriptor) => d.data.color)
                .style('fill-opacity', (d: DonutArcDescriptor) => ColumnUtil.getFillOpacity(d.data.selected, false, hasSelection, donutData.hasHighlights))
                .style('stroke-dasharray', (d: DonutArcDescriptor) => DonutChart.drawStrokeForDonutChart(radius, DonutChart.InnerArcRadiusRatio, d, sliceWidthRatio))
                .style('stroke-width', (d: DonutArcDescriptor) => d.data.strokeWidth)
                .attr(layout.shapeLayout);

            shapes.exit()
                .remove();

            return shapes;
        }

        public static drawDefaultHighlightShapes(graphicsContext: D3.Selection, donutData: DonutData, layout: DonutLayout, colors: IDataColorPalette, radius: number, sliceWidthRatio: number): D3.UpdateSelection {
            let shapes = graphicsContext.select('.slices')
                .selectAll('path' + DonutChart.sliceHighlightClass.selector)
                .data(donutData.dataPoints.filter((value: DonutArcDescriptor) => value.data.highlightRatio != null), (d: DonutArcDescriptor) => d.data.identity.getKey());

            shapes.enter()
                .insert('path')
                .classed(DonutChart.sliceHighlightClass.class, true)
                .each(function (d) { this._current = d; });

            DonutChart.isSingleColor(donutData.dataPoints);

            shapes
                .style('fill', (d: DonutArcDescriptor) => d.data.color)
                .style('fill-opacity', (d: DonutArcDescriptor) => ColumnUtil.getFillOpacity(d.data.selected, true, false, donutData.hasHighlights))
                .style('stroke', 'white')
                .style('stroke-dasharray', (d: DonutArcDescriptor) => DonutChart.drawStrokeForDonutChart(radius, DonutChart.InnerArcRadiusRatio, d, sliceWidthRatio, d.data.highlightRatio))
                .style('stroke-width', (d: DonutArcDescriptor) => d.data.highlightRatio === 0 ? 0 : d.data.strokeWidth)
                .attr(layout.highlightShapeLayout);

            shapes.exit()
                .remove();

            return shapes;
        }
        
        /**
            Set true to the last data point when all slices have the same color
        */
        public static isSingleColor(dataPoints: DonutArcDescriptor[]): void {
            if (dataPoints.length > 1) {
                let lastPoint = dataPoints.length - 1;
                dataPoints[lastPoint].data.isLastInDonut = dataPoints[lastPoint].data.color === dataPoints[0].data.color;
            }
        }

        public static drawStrokeForDonutChart(radius: number, innerArcRadiusRatio: number, d: DonutArcDescriptor, sliceWidthRatio: number, highlightRatio: number = 1): string {
            let sliceRadius = radius * innerArcRadiusRatio * highlightRatio;
            let sliceArc = (d.endAngle - d.startAngle) * sliceRadius;
            let sectionWithoutStroke: number;
            let sectionWithStroke: number;

            /*Donut chart*/
            if (sliceWidthRatio) {
                let innerRadius = radius * sliceWidthRatio;
                let outerRadius = highlightRatio * radius * (DonutChart.InnerArcRadiusRatio - sliceWidthRatio);
                let innerSliceArc = (d.endAngle - d.startAngle) * innerRadius;
                if (d.data.highlightRatio)
                    sliceArc = (d.endAngle - d.startAngle) * (outerRadius + innerRadius);

                if (d.data.isLastInDonut) {
                    //if all slices have the same color, the stroke of the last slice needs to be drawn on both radiuses
                    return 0 + " " + sliceArc + " " + outerRadius + " " + innerSliceArc + " " + outerRadius;
                }
                sectionWithoutStroke = sliceArc + outerRadius + innerSliceArc;
                sectionWithStroke = outerRadius;
            }

            /*Pie Chart*/
            else {
                if (d.data.isLastInDonut) {
                    //if all slices have the same color, the stroke of the last slice needs to be drawn on both radiuses
                    sectionWithoutStroke = sliceArc;
                    sectionWithStroke = sliceRadius * 2;
                }
                else {
                    sectionWithoutStroke = sliceArc + sliceRadius;
                    sectionWithStroke = sliceRadius;
                }
            }
            
            return 0 + " " + sectionWithoutStroke + " " + sectionWithStroke;
        }
       
        public onClearSelection() {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }

        public static getLayout(radius: number, sliceWidthRatio: number, viewport: IViewport, labelSettings: VisualDataLabelsSettings): DonutLayout {
            let innerRadius = radius * sliceWidthRatio;
            let arc = d3.svg.arc().innerRadius(innerRadius);
            let arcWithRadius = arc.outerRadius(radius * DonutChart.InnerArcRadiusRatio);
            let fontSize = PixelConverter.fromPoint(labelSettings.fontSize);
            return {
                fontSize: fontSize,
                shapeLayout: {
                    d: (d: DonutArcDescriptor) => {
                        return arcWithRadius(d);
                    }
                },
                highlightShapeLayout: {
                    d: (d: DonutArcDescriptor) => {
                        let highlightArc = arc.outerRadius(DonutChart.getHighlightRadius(radius, sliceWidthRatio, d.data.highlightRatio));
                        return highlightArc(d);
                    }
                },
                zeroShapeLayout: {
                    d: (d: DonutArcDescriptor) => {
                        let zeroWithZeroRadius = arc.outerRadius(innerRadius || DonutChart.EffectiveZeroValue);
                        return zeroWithZeroRadius(d);
                    }
                },
            };
        }

        private static getHighlightRadius(radius: number, sliceWidthRatio: number, highlightRatio: number): number {
            let innerRadius = radius * sliceWidthRatio;
            return innerRadius + highlightRatio * radius * (DonutChart.InnerArcRadiusRatio - sliceWidthRatio);
        }

        public static cullDataByViewport(dataPoints: DonutDataPoint[], maxValue: number, viewport: IViewport): DonutDataPoint[] {
            let estimatedRadius = Math.min(viewport.width, viewport.height) / 2;
            // Ratio of slice too small to show (invisible) = invisbleArcLength / circumference
            let cullRatio = this.invisibleArcLengthInPixels / (estimatedRadius * DonutChart.twoPi);
            let cullableValue = cullRatio * maxValue;
            let culledDataPoints: DonutDataPoint[] = [];
            let prevPointColor: string;
            for (let datapoint of dataPoints) {
                if (datapoint.measure >= cullableValue) {
                    //updates the stroke width
                    datapoint.strokeWidth = prevPointColor === datapoint.color ? 1 : 0;
                    prevPointColor = datapoint.color;
                    culledDataPoints.push(datapoint);
                }
            }

            return culledDataPoints;
        }
    }

    /**
    * This class is an interactive legend for the Donut Chart. 
     * 
     * Features: It is scrollable indefinitely, using drag gesture
     * when you interact with it, it updates the donut chart itself.
    */
    class DonutChartInteractiveLegend {

        private static LegendContainerClassName = 'legend-container';
        private static LegendContainerSelector = '.legend-container';
        private static LegendItemClassName = 'legend-item';
        private static LegendItemSelector = '.legend-item';
        private static LegendItemCategoryClassName = 'category';
        private static LegendItemPercentageClassName = 'percentage';
        private static LegendItemValueClassName = 'value';

        private static MaxLegendItemBoxSize = 160;
        private static ItemMargin = 30; // Margin between items
        private static MinimumSwipeDX = 15; // Minimup swipe gesture to create a change in the legend
        private static MinimumItemsInLegendForCycled = 3; // Minimum items in the legend before we cycle it

        private donutChart: DonutChart;
        private legendContainerParent: D3.Selection;
        private legendContainer: D3.Selection;
        private legendContainerWidth: number;
        private data: DonutDataPoint[];
        private colors: IDataColorPalette;
        private visualInitOptions: VisualInitOptions;

        private currentNumberOfLegendItems: number;
        private currentIndex: number;
        private leftMostIndex: number;
        private rightMostIndex: number;
        private currentXOffset: number;
        private legendItemsPositions: { startX: number; boxWidth: number; }[];
        private legendTransitionAnimationDuration: number;

        constructor(donutChart: DonutChart, legendContainer: D3.Selection, colors: IDataColorPalette, visualInitOptions: VisualInitOptions, settings?: DonutChartSettings) {
            this.legendContainerParent = legendContainer;
            this.colors = colors;
            this.donutChart = donutChart;
            this.visualInitOptions = visualInitOptions;
            this.legendItemsPositions = [];

            this.legendTransitionAnimationDuration = settings && settings.legendTransitionAnimationDuration ? settings.legendTransitionAnimationDuration : 0;
        }

        public drawLegend(data: DonutDataPoint[]): void {
            this.data = data;

            this.currentNumberOfLegendItems = data.length;
            this.currentIndex = 0;
            this.leftMostIndex = 0;
            this.rightMostIndex = data.length - 1;

            if (this.legendContainerParent.select(DonutChartInteractiveLegend.LegendContainerSelector).empty()) {
                this.legendContainer = this.legendContainerParent.append('div').classed(DonutChartInteractiveLegend.LegendContainerClassName, true);
            }

            let legendItems = this.legendContainer.selectAll(DonutChartInteractiveLegend.LegendItemSelector).data(data);
            let legendContainerWidth = this.legendContainerWidth = this.legendContainer.node().getBoundingClientRect().width;
            let initialXOffset = legendContainerWidth / 2 - (legendContainerWidth * 0.4 / 2) + DonutChartInteractiveLegend.ItemMargin;
            let currX = initialXOffset;
            this.currentXOffset = initialXOffset;

            // Given the legend item div, create the item values (category, percentage and measure) on top of it.
            let createLegendItem = (itemDiv: JQuery, datum: DonutDataPoint) => {
                // position the legend item
                itemDiv
                    .attr('data-legend-index', datum.index) // assign index for later use
                    .css({
                        'position': 'absolute',
                        'left': currX,
                        //'margin-right': DonutChartInteractiveLegend.ItemMargin + 'px',
                    });

                // Add the category, percentage and value
                let itemCategory = valueFormatter.format(datum.label);
                let itemValue = valueFormatter.format(datum.measure, datum.measureFormat);
                let itemPercentage = valueFormatter.format(datum.percentage, '0.00 %;-0.00 %;0.00 %');
                let itemColor = datum.color;

                // Create basic spans for width calculations
                let itemValueSpan = DonutChartInteractiveLegend.createBasicLegendItemSpan(DonutChartInteractiveLegend.LegendItemValueClassName, itemValue, 11);
                let itemCategorySpan = DonutChartInteractiveLegend.createBasicLegendItemSpan(DonutChartInteractiveLegend.LegendItemCategoryClassName, itemCategory, 11);
                let itemPercentageSpan = DonutChartInteractiveLegend.createBasicLegendItemSpan(DonutChartInteractiveLegend.LegendItemPercentageClassName, itemPercentage, 20);

                // Calculate Legend Box size according to widths and set the width accordingly
                let valueSpanWidth = DonutChartInteractiveLegend.spanWidth(itemValueSpan);
                let categorySpanWidth = DonutChartInteractiveLegend.spanWidth(itemCategorySpan);
                let precentageSpanWidth = DonutChartInteractiveLegend.spanWidth(itemPercentageSpan);
                let currentLegendBoxWidth = DonutChartInteractiveLegend.legendBoxSize(valueSpanWidth, categorySpanWidth, precentageSpanWidth);
                itemDiv.css('width', currentLegendBoxWidth);

                // Calculate margins so that all the spans will be placed in the middle
                let getLeftValue = (spanWidth: number) => {
                    return currentLegendBoxWidth - spanWidth > 0 ? (currentLegendBoxWidth - spanWidth) / 2 : 0;
                };
                let marginLeftValue = getLeftValue(valueSpanWidth);
                let marginLeftCategory = getLeftValue(categorySpanWidth);
                let marginLeftPrecentage = getLeftValue(precentageSpanWidth);

                // Create the actual spans with the right styling and margins so it will be center aligned and add them
                DonutChartInteractiveLegend.createLegendItemSpan(itemCategorySpan, marginLeftCategory);
                DonutChartInteractiveLegend.createLegendItemSpan(itemValueSpan, marginLeftValue);
                DonutChartInteractiveLegend.createLegendItemSpan(itemPercentageSpan, marginLeftPrecentage).css('color', itemColor);

                itemDiv.append(itemCategorySpan);
                itemDiv.append(itemPercentageSpan);
                itemDiv.append(itemValueSpan);

                this.legendItemsPositions.push({
                    startX: currX,
                    boxWidth: currentLegendBoxWidth,
                });
                currX += currentLegendBoxWidth + DonutChartInteractiveLegend.ItemMargin;
            };

            // Create the Legend Items
            legendItems.enter()
                .insert('div')
                .classed(DonutChartInteractiveLegend.LegendItemClassName, true)
                .each(function (d: DonutDataPoint) {
                    createLegendItem($(this), d);
                });

            legendItems.exit().remove();

            // Assign interactions on the legend
            this.assignInteractions();
        }

        public updateLegend(sliceIndex): void {
            if (this.currentNumberOfLegendItems <= 1) return; // If the number of labels is one no updates are needed
            let legendContainerWidth = this.legendContainerWidth;

            this.currentIndex = sliceIndex;
            // "rearrange" legend items if needed, so we would have contnious endless scrolling
            this.updateLabelBlocks(sliceIndex);
            let legendTransitionAnimationDuration = this.legendTransitionAnimationDuration;
            // Transform the legend so that the selected slice would be in the middle
            let nextXOffset = (this.legendItemsPositions[sliceIndex].startX + (this.legendItemsPositions[sliceIndex].boxWidth / 2) - (legendContainerWidth / 2)) * (-1);
            this.legendContainer
                .transition()
                .styleTween('-webkit-transform', (d: any, i: number, a: any) => {
                    return d3.interpolate(
                        SVGUtil.translateWithPixels(this.currentXOffset, 0),
                        SVGUtil.translateWithPixels(nextXOffset, 0));
                })
                .styleTween('transform', (d: any, i: number, a: any) => {
                    return d3.interpolate(
                        SVGUtil.translateWithPixels(this.currentXOffset, 0),
                        SVGUtil.translateWithPixels(nextXOffset, 0));
                })
                .duration(legendTransitionAnimationDuration)
                .ease('bounce')
                .each('end', () => {
                    this.currentXOffset = nextXOffset;
                });
            SVGUtil.flushAllD3TransitionsIfNeeded(this.visualInitOptions);
        }

        private assignInteractions() {
            let currentDX = 0; // keep how much drag had happened
            let hasChanged = false; // flag to indicate if we changed the "center" value in the legend. We only change it once per swipe.

            let dragStart = () => {
                currentDX = 0; // start of drag gesture
                hasChanged = false;
            };

            let dragMove = () => {
                currentDX += d3.event.dx;
                // Detect if swipe occured and if the index already changed in this drag
                if (hasChanged || Math.abs(currentDX) < DonutChartInteractiveLegend.MinimumSwipeDX) return;

                let dragDirectionLeft = (currentDX < 0);
                this.dragLegend(dragDirectionLeft);
                hasChanged = true;
            };

            let drag = d3.behavior.drag()
                .origin(Object)
                .on('drag', dragMove)
                .on('dragstart', dragStart);

            this.legendContainer.call(drag);
        }

        private dragLegend(dragDirectionLeft: boolean): void {

            if (this.currentNumberOfLegendItems > (DonutChartInteractiveLegend.MinimumItemsInLegendForCycled - 1)) {
                this.currentIndex = this.getCyclingCurrentIndex(dragDirectionLeft);
            } else {
                if (this.shouldChangeIndexInNonCycling(dragDirectionLeft)) {
                    if (dragDirectionLeft) {
                        this.currentIndex++;
                    } else {
                        this.currentIndex--;
                    }
                }
            }
            this.donutChart.setInteractiveChosenSlice(this.currentIndex);
        }

        private shouldChangeIndexInNonCycling(dragDirectionLeft: boolean): boolean {
            if ((this.currentIndex === 0 && !dragDirectionLeft) || (this.currentIndex === (this.currentNumberOfLegendItems - 1) && dragDirectionLeft)) {
                return false;
            }
            return true;
        }

        private getCyclingCurrentIndex(dragDirectionLeft: boolean): number {
            let dataLen = this.data.length;
            let delta = dragDirectionLeft ? 1 : -1;
            let newIndex = (this.currentIndex + delta) % (dataLen || 1); // modolu of negative number stays negative on javascript
            return (newIndex < 0) ? newIndex + dataLen : newIndex;
        }

        private updateLegendItemsBlocks(rightSidedShift: boolean, numberOfLegendItemsBlocksToShift: number) {
            let legendContainer$ = $(this.legendContainer[0]);

            if (rightSidedShift) {
                let smallestItem = legendContainer$.find('[data-legend-index=' + this.leftMostIndex + ']');
                smallestItem.remove().insertAfter(legendContainer$.find('[data-legend-index=' + this.rightMostIndex + ']'));
                let newX = this.legendItemsPositions[this.rightMostIndex].startX + this.legendItemsPositions[this.rightMostIndex].boxWidth + DonutChartInteractiveLegend.ItemMargin;
                this.legendItemsPositions[this.leftMostIndex].startX = newX;
                smallestItem.css('left', newX);

                this.rightMostIndex = this.leftMostIndex;
                this.leftMostIndex = (this.leftMostIndex + 1) % this.data.length;
            } else {
                let highestItem = legendContainer$.find('[data-legend-index=' + this.rightMostIndex + ']');
                highestItem.remove().insertBefore(legendContainer$.find('[data-legend-index=' + this.leftMostIndex + ']'));
                let newX = this.legendItemsPositions[this.leftMostIndex].startX - this.legendItemsPositions[this.rightMostIndex].boxWidth - DonutChartInteractiveLegend.ItemMargin;
                this.legendItemsPositions[this.rightMostIndex].startX = newX;
                highestItem.css('left', newX);

                this.leftMostIndex = this.rightMostIndex;
                this.rightMostIndex = (this.rightMostIndex - 1) === -1 ? (this.legendItemsPositions.length - 1) : (this.rightMostIndex - 1);
            }

            if ((numberOfLegendItemsBlocksToShift - 1) !== 0) {
                this.updateLegendItemsBlocks(rightSidedShift, (numberOfLegendItemsBlocksToShift - 1));
            }
        }

        /** Update the legend items, allowing for endless rotation */
        private updateLabelBlocks(index: number) {

            if (this.currentNumberOfLegendItems > DonutChartInteractiveLegend.MinimumItemsInLegendForCycled) {
                // The idea of the four if's is to keep two labels before and after the current one so it will fill the screen.

                // If the index of the slice is the highest currently availble add 2 labels "ahead" of it
                if (this.rightMostIndex === index) this.updateLegendItemsBlocks(true, 2);

                // If the index of the slice is the lowest currently availble add 2 labels "before" it
                if (this.leftMostIndex === index) this.updateLegendItemsBlocks(false, 2);

                // If the index of the slice is the second highest currently availble add a labels "ahead" of it
                if (this.rightMostIndex === (index + 1) || ((this.rightMostIndex === 0) && (index === (this.currentNumberOfLegendItems - 1)))) this.updateLegendItemsBlocks(true, 1);

                // If the index of the slice is the second lowest currently availble add a labels "before" it
                if (this.leftMostIndex === (index - 1) || ((this.leftMostIndex === (this.currentNumberOfLegendItems - 1) && (index === 0)))) this.updateLegendItemsBlocks(false, 1);

            } else {

                if (this.currentNumberOfLegendItems === DonutChartInteractiveLegend.MinimumItemsInLegendForCycled) {
                    // If the index of the slice is the highest currently availble add a label "ahead" of it
                    if (this.rightMostIndex === index) this.updateLegendItemsBlocks(true, 1);

                    // If the index of the slice is the lowest currently availble add a label "before" it
                    if (this.leftMostIndex === index) this.updateLegendItemsBlocks(false, 1);
                }
            }
        }

        private static createBasicLegendItemSpan(spanClass: string, text: string, fontSize: number): JQuery {
            return $('<span/>')
                .addClass(spanClass)
                .css({
                    'white-space': 'nowrap',
                    'font-size': fontSize + 'px',
                })
                .text(text);
        }

        /** This method alters the given span and sets it to the final legen item span style. */
        private static createLegendItemSpan(existingSpan: JQuery, marginLeft: number): JQuery {
            existingSpan
                .css({
                    'overflow': 'hidden',
                    'text-overflow': 'ellipsis',
                    'display': 'inline-block',
                    'width': '100%',
                    'margin-left': marginLeft
                });
            return existingSpan;
        }

        /** Caclulte entire legend box size according to its building spans */
        private static legendBoxSize(valueSpanWidth: number, categorySpanWidth: number, precentageSpanWidth: number): number {
            let boxSize = valueSpanWidth > categorySpanWidth ? valueSpanWidth : categorySpanWidth;
            boxSize = boxSize > precentageSpanWidth ? boxSize : precentageSpanWidth;
            boxSize = boxSize > DonutChartInteractiveLegend.MaxLegendItemBoxSize ? DonutChartInteractiveLegend.MaxLegendItemBoxSize : (boxSize + 2);
            return boxSize;
        }

        private static FakeElementSpan: JQuery;
        private static spanWidth(span: JQuery): any {
            if (!this.FakeElementSpan) {
                this.FakeElementSpan = $('<span>').hide().appendTo(document.body);
            }
            this.FakeElementSpan.empty();
            this.FakeElementSpan.append(span);
            return this.FakeElementSpan.width();
        }
    }

    module DonutChartConversion {

        interface ConvertedDataPoint {
            identity: SelectionId;
            measureFormat: string;
            measureValue: MeasureAndValue;
            highlightMeasureValue: MeasureAndValue;
            index: number;
            label: any;
            categoryLabel: string;
            color: string;
            seriesIndex?: number;
        };

        interface MeasureAndValue {
            measure: number;
            value: number;
        }

        export class DonutChartConverter {
            private dataViewCategorical: DataViewCategorical;
            private dataViewMetadata: DataViewMetadata;
            private highlightsOverflow: boolean;
            private total: number;
            private highlightTotal: number;
            private grouped: DataViewValueColumnGroup[];
            private isMultiMeasure: boolean;
            private isSingleMeasure: boolean;
            private isDynamicSeries: boolean;
            private seriesCount: number;
            private categoryIdentities: DataViewScopeIdentity[];
            private categoryValues: any[];
            private allCategoryObjects: DataViewObjects[];
            private categoryColumnRef: data.SQExpr[];
            private legendDataPoints: LegendDataPoint[];
            private colorHelper: ColorHelper;
            private categoryFormatString: string;

            public hasHighlights: boolean;
            public dataPoints: DonutDataPoint[];
            public legendData: LegendData;
            public dataLabelsSettings: VisualDataLabelsSettings;
            public legendObjectProperties: DataViewObject;
            public maxValue: number;

            public constructor(dataView: DataView, colors: IDataColorPalette, defaultDataPointColor?: string) {
                let dataViewCategorical = dataView.categorical;
                this.dataViewCategorical = dataViewCategorical;
                this.dataViewMetadata = dataView.metadata;

                this.seriesCount = dataViewCategorical.values ? dataViewCategorical.values.length : 0;
                this.colorHelper = new ColorHelper(colors, donutChartProps.dataPoint.fill, defaultDataPointColor);
                this.maxValue = 0;

                if (dataViewCategorical.categories && dataViewCategorical.categories.length > 0) {
                    let category = dataViewCategorical.categories[0];
                    this.categoryIdentities = category.identity;
                    this.categoryValues = category.values;
                    this.allCategoryObjects = category.objects;
                    this.categoryColumnRef = category.identityFields;
                    this.categoryFormatString = valueFormatter.getFormatString(category.source, donutChartProps.general.formatString);
                }

                let grouped = this.grouped = dataViewCategorical && dataViewCategorical.values ? dataViewCategorical.values.grouped() : undefined;
                this.isMultiMeasure = grouped && grouped.length > 0 && grouped[0].values && grouped[0].values.length > 1;
                this.isSingleMeasure = grouped && grouped.length === 1 && grouped[0].values && grouped[0].values.length === 1;
                this.isDynamicSeries = !!(dataViewCategorical.values && dataViewCategorical.values.source);

                this.hasHighlights = this.seriesCount > 0 && !_.isEmpty(dataViewCategorical.values) && !!dataViewCategorical.values[0].highlights;
                this.highlightsOverflow = false;
                this.total = 0;
                this.highlightTotal = 0;
                this.dataPoints = [];
                this.legendDataPoints = [];
                this.dataLabelsSettings = null;

                for (let seriesIndex = 0; seriesIndex < this.seriesCount; seriesIndex++) {
                    let seriesData = dataViewCategorical.values[seriesIndex];
                    for (let measureIndex = 0; measureIndex < seriesData.values.length; measureIndex++) {
                        this.total += Math.abs(seriesData.values[measureIndex]);
                        this.highlightTotal += this.hasHighlights ? Math.abs(seriesData.highlights[measureIndex]) : 0;
                    }
                }

                this.total = AxisHelper.normalizeNonFiniteNumber(this.total);
                this.highlightTotal = AxisHelper.normalizeNonFiniteNumber(this.highlightTotal);
            }

            private static normalizedMeasureAndValue(measureAndValue: MeasureAndValue): MeasureAndValue {
                let normalized: MeasureAndValue = $.extend(true, {}, measureAndValue);
                normalized.measure = AxisHelper.normalizeNonFiniteNumber(normalized.measure);
                normalized.value = AxisHelper.normalizeNonFiniteNumber(normalized.value);

                return normalized;
            }

            public convert(): void {
                let convertedData: ConvertedDataPoint[];
                if (this.total !== 0) {
                    // We render based on categories, series, or measures in that order of preference
                    if (this.categoryValues) {
                        convertedData = this.convertCategoricalWithSlicing();
                    }
                    else if (this.isDynamicSeries) {
                            // Series but no category.
                            convertedData = this.convertSeries();
                        }
                    else {
                        // No category or series; only measures.
                        convertedData = this.convertMeasures();
                    }
                }
                else {
                    convertedData = [];
                }

                // Check if any of the highlight values are > non-highlight values
                let highlightsOverflow = false;
                for (let i = 0, dataPointCount = convertedData.length; i < dataPointCount && !highlightsOverflow; i++) {
                    let point = convertedData[i];
                    if (Math.abs(point.highlightMeasureValue.measure) > Math.abs(point.measureValue.measure)) {
                        highlightsOverflow = true;
                    }
                }

                // Create data labels settings
                this.dataLabelsSettings = this.convertDataLabelSettings();

                let dataViewMetadata = this.dataViewMetadata;
                if (dataViewMetadata) {
                    let objects: DataViewObjects = dataViewMetadata.objects;
                    if (objects) {
                        this.legendObjectProperties = <DataViewObject>objects['legend'];
                    }
                }

                this.dataPoints = [];
                let formatStringProp = donutChartProps.general.formatString;
                let prevPointColor: string;

                for (let i = 0, dataPointCount = convertedData.length; i < dataPointCount; i++) {
                    let point = convertedData[i];

                    // Normalize the values here and then handle tooltip value as infinity
                    let normalizedHighlight = DonutChartConverter.normalizedMeasureAndValue(point.highlightMeasureValue);
                    let normalizedNonHighlight = DonutChartConverter.normalizedMeasureAndValue(point.measureValue);

                    let measure = normalizedNonHighlight.measure;
                    let percentage = (this.total > 0) ? normalizedNonHighlight.value / this.total : 0.0;
                    let highlightRatio = 0;
                    if (normalizedNonHighlight.value > this.maxValue)
                        this.maxValue = normalizedNonHighlight.value;
                    if (normalizedHighlight.value > this.maxValue)
                        this.maxValue = normalizedHighlight.value;

                    if (this.hasHighlights) {
                        // When any highlight value is greater than the corresponding non-highlight value
                        // we just render all of the highlight values and discard the non-highlight values.
                        if (highlightsOverflow) {
                            measure = normalizedHighlight.measure;

                            percentage = (this.highlightTotal > 0) ? normalizedHighlight.value / this.highlightTotal : 0.0;
                            highlightRatio = 1;
                        }
                        else {
                            highlightRatio = normalizedHighlight.value / normalizedNonHighlight.value;
                        }

                        if (!highlightRatio) {
                            highlightRatio = DonutChart.EffectiveZeroValue;
                        }
                    }

                    
                    let categoryValue = point.categoryLabel;
                    let categorical = this.dataViewCategorical;
                    let valueIndex: number = categorical.categories ? null : i;
                    valueIndex = point.seriesIndex !== undefined ? point.seriesIndex : valueIndex;
                    let valuesMetadata = categorical.values[valueIndex].source;
                    let value: number = point.measureValue.measure;
                    let highlightedValue: number = this.hasHighlights && point.highlightMeasureValue.value !== 0 ? point.highlightMeasureValue.measure : undefined;
                    let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, categorical, categoryValue, value, null, null, valueIndex, i, highlightedValue);
                    let strokeWidth = prevPointColor === point.color && value && value > 0 ? 1 : 0;
                    prevPointColor = value && value > 0 ? point.color : prevPointColor;
                    this.dataPoints.push({
                        identity: point.identity,
                        measure: measure,
                        measureFormat: point.measureFormat,
                        percentage: percentage,
                        index: point.index,
                        label: point.label,
                        highlightRatio: highlightRatio,
                        selected: false,
                        tooltipInfo: tooltipInfo,
                        color: point.color,
                        strokeWidth: strokeWidth,
                        labelFormatString: valuesMetadata.format,
                    });
                }

                this.legendData = this.convertLegendData();
            }

            private getLegendTitle(): string {
                if (this.total !== 0) {
                    // If category exists, we render title using category source. If not, we render title
                    // using measure.
                    let dvValuesSourceName = this.dataViewCategorical.values && this.dataViewCategorical.values.source
                        ? this.dataViewCategorical.values.source.displayName : "";
                    let dvCategorySourceName = this.dataViewCategorical.categories && this.dataViewCategorical.categories.length > 0 && this.dataViewCategorical.categories[0].source
                        ? this.dataViewCategorical.categories[0].source.displayName : "";
                    if (this.categoryValues) {
                        return dvCategorySourceName;
                    }
                    else {
                        return dvValuesSourceName;
                    }
                }
                else {
                    return "";
                }
            }

            private convertCategoricalWithSlicing(): ConvertedDataPoint[] {
                let dataViewCategorical = this.dataViewCategorical;
                let formatStringProp = donutChartProps.general.formatString;
                let dataPoints: ConvertedDataPoint[] = [];

                for (let categoryIndex = 0, categoryCount = this.categoryValues.length; categoryIndex < categoryCount; categoryIndex++) {
                    let categoryValue = this.categoryValues[categoryIndex];
                    let thisCategoryObjects = this.allCategoryObjects ? this.allCategoryObjects[categoryIndex] : undefined;

                    let legendIdentity = SelectionId.createWithId(this.categoryIdentities[categoryIndex]);
                    let color = this.colorHelper.getColorForSeriesValue(thisCategoryObjects, this.categoryColumnRef, categoryValue);
                    let categoryLabel = valueFormatter.format(categoryValue, this.categoryFormatString);

                    // Series are either measures in the multi-measure case, or the single series otherwise
                    for (let seriesIndex = 0; seriesIndex < this.seriesCount; seriesIndex++) {
                        let seriesData = dataViewCategorical.values[seriesIndex];

                        let label = this.isSingleMeasure
                            ? categoryLabel
                            : converterHelper.getFormattedLegendLabel(seriesData.source, dataViewCategorical.values, formatStringProp);

                        let nonHighlight = seriesData.values[categoryIndex] || 0;
                        let highlight = this.hasHighlights ? seriesData.highlights[categoryIndex] || 0 : 0;

                        let measure: string;
                        let seriesGroup: any;

                        if (this.isMultiMeasure) {
                            measure = seriesData.source.queryName;
                        }
                        else if (seriesData.identity)
                            seriesGroup = seriesData;

                        let identity: SelectionId = SelectionIdBuilder.builder()
                            .withCategory(dataViewCategorical.categories[0], categoryIndex)
                            .withSeries(seriesGroup, seriesGroup)
                            .withMeasure(measure)
                            .createSelectionId();

                        let dataPoint: ConvertedDataPoint = {
                            identity: identity,
                            measureFormat: valueFormatter.getFormatString(seriesData.source, formatStringProp, true),
                            measureValue: <MeasureAndValue> {
                                measure: nonHighlight,
                                value: Math.abs(nonHighlight),
                            },
                            highlightMeasureValue: <MeasureAndValue> {
                                measure: highlight,
                                value: Math.abs(highlight),
                            },
                            index: categoryIndex,
                            label: label,
                            categoryLabel: categoryLabel,
                            color: color,
                            seriesIndex: seriesIndex
                        };
                        dataPoints.push(dataPoint);
                    }

                    this.legendDataPoints.push({
                        label: categoryLabel,
                        color: color,
                        icon: LegendIcon.Box,
                        identity: legendIdentity,
                        selected: false
                    });
                }

                return dataPoints;
            }

            private convertMeasures(): ConvertedDataPoint[] {
                let dataViewCategorical = this.dataViewCategorical;
                let dataPoints: ConvertedDataPoint[] = [];
                let formatStringProp = donutChartProps.general.formatString;

                for (let measureIndex = 0; measureIndex < this.seriesCount; measureIndex++) {
                    let measureData = dataViewCategorical.values[measureIndex];
                    let measureFormat = valueFormatter.getFormatString(measureData.source, formatStringProp, true);
                    let measureLabel = measureData.source.displayName;
                    let identity = SelectionId.createWithMeasure(measureData.source.queryName);

                    debug.assert(measureData.values.length > 0, 'measure should have data points');
                    debug.assert(!this.hasHighlights || measureData.highlights.length > 0, 'measure with highlights should have highlight data points');
                    let nonHighlight = measureData.values[0] || 0;
                    let highlight = this.hasHighlights ? measureData.highlights[0] || 0 : 0;

                    let color = this.colorHelper.getColorForMeasure(measureData.source.objects, measureData.source.queryName);

                    let dataPoint: ConvertedDataPoint = {
                        identity: identity,
                        measureFormat: measureFormat,
                        measureValue: <MeasureAndValue> {
                            measure: nonHighlight,
                            value: Math.abs(nonHighlight),
                        },
                        highlightMeasureValue: <MeasureAndValue> {
                            measure: highlight,
                            value: Math.abs(highlight),
                        },
                        index: measureIndex,
                        label: measureLabel,
                        categoryLabel: measureLabel,
                        color: color
                    };
                    dataPoints.push(dataPoint);

                    this.legendDataPoints.push({
                        label: dataPoint.label,
                        color: dataPoint.color,
                        icon: LegendIcon.Box,
                        identity: dataPoint.identity,
                        selected: false
                    });
                }

                return dataPoints;
            }

            private convertSeries(): ConvertedDataPoint[] {
                let dataViewCategorical = this.dataViewCategorical;
                let dataPoints: ConvertedDataPoint[] = [];
                let formatStringProp = donutChartProps.general.formatString;

                for (let seriesIndex = 0; seriesIndex < this.seriesCount; seriesIndex++) {
                    let seriesData = dataViewCategorical.values[seriesIndex];
                    let seriesFormat = valueFormatter.getFormatString(seriesData.source, formatStringProp, true);
                    let label = converterHelper.getFormattedLegendLabel(seriesData.source, dataViewCategorical.values, formatStringProp);
                    let identity = SelectionId.createWithId(seriesData.identity);
                    let seriesName = converterHelper.getSeriesName(seriesData.source);
                    let objects = this.grouped && this.grouped[seriesIndex] && this.grouped[seriesIndex].objects;                    

                    debug.assert(seriesData.values.length > 0, 'measure should have data points');
                    debug.assert(!this.hasHighlights || seriesData.highlights.length > 0, 'measure with highlights should have highlight data points');
                    let nonHighlight = seriesData.values[0] || 0;
                    let highlight = this.hasHighlights ? seriesData.highlights[0] || 0 : 0;

                    let color = this.colorHelper.getColorForSeriesValue(objects, dataViewCategorical.values.identityFields, seriesName);

                    let dataPoint: ConvertedDataPoint = {
                        identity: identity,
                        measureFormat: seriesFormat,
                        measureValue: <MeasureAndValue> {
                            measure: nonHighlight,
                            value: Math.abs(nonHighlight),
                        },
                        highlightMeasureValue: <MeasureAndValue> {
                            measure: highlight,
                            value: Math.abs(highlight),
                        },
                        index: seriesIndex,
                        label: label,
                        categoryLabel: label,
                        color: color,
                        seriesIndex: seriesIndex
                    };
                    dataPoints.push(dataPoint);

                    this.legendDataPoints.push({
                        label: dataPoint.label,
                        color: dataPoint.color,
                        icon: LegendIcon.Box,
                        identity: dataPoint.identity,
                        selected: false
                    });
                }

                return dataPoints;
            }

            private convertDataLabelSettings(): VisualDataLabelsSettings {
                let dataViewMetadata = this.dataViewMetadata;
                let dataLabelsSettings = dataLabelUtils.getDefaultDonutLabelSettings();

                if (dataViewMetadata) {
                    let objects: DataViewObjects = dataViewMetadata.objects;
                    if (objects) {
                        // Handle lables settings
                        let labelsObj = <DataLabelObject>objects['labels'];
                        if (labelsObj) {
                            dataLabelUtils.updateLabelSettingsFromLabelsObject(labelsObj, dataLabelsSettings);
                        }
                    }
                }

                return dataLabelsSettings;
            }

            private convertLegendData(): LegendData {
               return {
                    dataPoints: this.legendDataPoints,
                    labelColor: LegendData.DefaultLegendLabelFillColor,
                    title: this.getLegendTitle(),
                    fontSize: SVGLegend.DefaultFontSizeInPt,
                };
            }
        }
    }
}