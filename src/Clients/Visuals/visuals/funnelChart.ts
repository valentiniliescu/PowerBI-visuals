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

    export interface FunnelChartConstructorOptions {
        animator?: IFunnelAnimator;
        funnelSmallViewPortProperties?: FunnelSmallViewPortProperties;
        behavior?: FunnelWebBehavior;
        tooltipsEnabled?: boolean;
    }

    export interface FunnelPercent {
        value: number;
        percent: number;
        isTop: boolean;
    }

    /**
     * value and highlightValue may be modified in the converter to
     * allow rendering non-standard values, such as negatives.
     * Store the original values for non-rendering, user-facing elements
     * e.g. data labels
     */
    export interface FunnelSlice extends SelectableDataPoint, TooltipEnabledDataPoint, LabelEnabledDataPoint {
        value: number;
        originalValue: number;
        label: string;
        key: string;
        categoryOrMeasureIndex: number;
        highlight?: boolean;
        highlightValue?: number;
        originalHighlightValue?: number;
        color: string;
    }

    export interface FunnelData {
        slices: FunnelSlice[];
        categoryLabels: string[];
        valuesMetadata: DataViewMetadataColumn[];
        hasHighlights: boolean;
        highlightsOverflow: boolean;
        dataLabelsSettings: VisualDataLabelsSettings;
        percentBarLabelSettings: VisualDataLabelsSettings;
        canShowDataLabels: boolean;
        hasNegativeValues: boolean;
        allValuesAreNegative: boolean;
    }

    export interface FunnelAxisOptions {
        maxScore: number;
        xScale: D3.Scale.OrdinalScale;
        yScale: D3.Scale.LinearScale;
        verticalRange: number;
        margin: IMargin;
        rangeStart: number;
        rangeEnd: number;
        barToSpaceRatio: number;
        categoryLabels: string[];
    }

    export interface IFunnelLayout {
        percentBarLayout: {
            mainLine: {
                x2: (d: FunnelPercent) => number;
                transform: (d: FunnelPercent) => string;
            },
            leftTick: {
                y2: (d: FunnelPercent) => number;
                transform: (d: FunnelPercent) => string;
            },
            rightTick: {
                y2: (d: FunnelPercent) => number;
                transform: (d: FunnelPercent) => string;
            },
            text: {
                x: (d: FunnelPercent) => number;
                y: (d: FunnelPercent) => number;
                dy: (d: FunnelPercent) => string;
                style: () => string;
                transform: (d: FunnelPercent) => string;
                fill: string;
                maxWidth: number,
            },
        };
        shapeLayout: {
            width: (d: FunnelSlice) => number;
            height: (d: FunnelSlice) => number;
            x: (d: FunnelSlice) => number;
            y: (d: FunnelSlice) => number;
        };
        shapeLayoutWithoutHighlights: {
            width: (d: FunnelSlice) => number;
            height: (d: FunnelSlice) => number;
            x: (d: FunnelSlice) => number;
            y: (d: FunnelSlice) => number;
        };
        zeroShapeLayout: {
            width: (d: FunnelSlice) => number;
            height: (d: FunnelSlice) => number;
            x: (d: FunnelSlice) => number;
            y: (d: FunnelSlice) => number;
        };
        interactorLayout: {
            width: (d: FunnelSlice) => number;
            height: (d: FunnelSlice) => number;
            x: (d: FunnelSlice) => number;
            y: (d: FunnelSlice) => number;
        };
    }

    export interface IFunnelChartSelectors {
        funnel: {
            bars: ClassAndSelector;
            highlights: ClassAndSelector;
            interactors: ClassAndSelector;
        };
        percentBar: {
            root: ClassAndSelector;
            mainLine: ClassAndSelector;
            leftTick: ClassAndSelector;
            rightTick: ClassAndSelector;
            text: ClassAndSelector;
        };
    }

    export interface FunnelSmallViewPortProperties {
        hideFunnelCategoryLabelsOnSmallViewPort: boolean;
        minHeightFunnelCategoryLabelsVisible: number;
    }

    /**
     * Renders a funnel chart.
     */
    export class FunnelChart implements IVisual {
        public static DefaultBarOpacity = 1;
        public static DimmedBarOpacity = 0.4;
        public static PercentBarToBarRatio = 2;
        public static TickPadding = 0;
        public static InnerTickSize = 0;
        public static MinimumInteractorSize = 15;
        public static InnerTextClassName = 'labelSeries';
        public static Selectors: IFunnelChartSelectors = {
            funnel: {
                bars: createClassAndSelector('funnelBar'),
                highlights: createClassAndSelector('highlight'),
                interactors: createClassAndSelector('funnelBarInteractor'),
            },
            percentBar: {
                root: createClassAndSelector('percentBars'),
                mainLine: createClassAndSelector('mainLine'),
                leftTick: createClassAndSelector('leftTick'),
                rightTick: createClassAndSelector('rightTick'),
                text: createClassAndSelector('value'),
            },
        };
        public static FunnelBarHighlightClass = [FunnelChart.Selectors.funnel.bars.class, FunnelChart.Selectors.funnel.highlights.class].join(' ');

        private static VisualClassName = 'funnelChart';
        private static BarToSpaceRatio = 0.1;
        private static MaxBarWidth = 40;
        private static MinBarThickness = 12;
        private static LabelFunnelPadding = 6;
        private static InnerTextMinimumPadding = 10;
        private static OverflowingHighlightWidthRatio = 0.5;
        
        private svg: D3.Selection;
        private funnelGraphicsContext: D3.Selection;
        private percentGraphicsContext: D3.Selection;
        private clearCatcher: D3.Selection;
        private axisGraphicsContext: D3.Selection;
        private currentViewport: IViewport;
        private colors: IDataColorPalette;
        private data: FunnelData;
        private hostServices: IVisualHostServices;
        private margin: IMargin;
        private options: VisualInitOptions;
        private interactivityService: IInteractivityService;
        private behavior: FunnelWebBehavior;
        private defaultDataPointColor: string;
        private labelPositionObjects: string[] = [labelPosition.outsideEnd, labelPosition.insideCenter];
        // TODO: Remove onDataChanged & onResizing once all visuals have implemented update.
        private dataViews: DataView[];
        private funnelSmallViewPortProperties: FunnelSmallViewPortProperties;
        private tooltipsEnabled: boolean;

        /**
         * Note: Public for testing.
         */
        public animator: IFunnelAnimator;

        constructor(options?: FunnelChartConstructorOptions) {
            if (options) {
                this.tooltipsEnabled = options.tooltipsEnabled;
                if (options.funnelSmallViewPortProperties) {
                    this.funnelSmallViewPortProperties = options.funnelSmallViewPortProperties;
                }
                if (options.animator) {
                    this.animator = options.animator;
                }
                if (options.behavior) {
                    this.behavior = options.behavior;
                }
            }
        }

        private static isValidValueColumn(valueColumn: DataViewValueColumn): boolean {
            debug.assertValue(valueColumn, 'valueColumn');
            return DataRoleHelper.hasRole(valueColumn.source, 'Y');
        }

        private static getFirstValidValueColumn(values: DataViewValueColumns): DataViewValueColumn {
            for (let valueColumn of values) {
                if (!FunnelChart.isValidValueColumn(valueColumn))
                    continue;
                return valueColumn;
            }

            return undefined;
        }

        public static converter(dataView: DataView, colors: IDataColorPalette, hostServices: IVisualHostServices, defaultDataPointColor?: string): FunnelData {
            let slices: FunnelSlice[] = [];
            let formatStringProp = funnelChartProps.general.formatString;
            let categorical: DataViewCategorical = dataView.categorical;
            let categories = categorical.categories || [];
            let values = categorical.values;
            let valueMetaData: DataViewMetadataColumn[] = [];
            if (values) {
                valueMetaData = _.map(values, (v) => { return v.source; });
            }
            let hasHighlights = values && values.length > 0 && values[0] && !!values[0].highlights;
            let highlightsOverflow = false;
            let hasNegativeValues = false;
            let allValuesAreNegative = false;
            let categoryLabels = [];
            let dataLabelsSettings: VisualDataLabelsSettings = dataLabelUtils.getDefaultFunnelLabelSettings();
            let percentBarLabelSettings: VisualDataLabelsSettings = dataLabelUtils.getDefaultLabelSettings(true);
            let colorHelper = new ColorHelper(colors, funnelChartProps.dataPoint.fill, defaultDataPointColor);
            let firstValue: number;
            let firstHighlight: number;
            let previousValue: number;
            let previousHighlight: number;

            if (dataView && dataView.metadata && dataView.metadata.objects) {
                let labelsObj = <DataLabelObject>dataView.metadata.objects['labels'];
                if (labelsObj)
                    dataLabelUtils.updateLabelSettingsFromLabelsObject(labelsObj, dataLabelsSettings);

                let percentLabelsObj = <DataLabelObject>dataView.metadata.objects['percentBarLabel'];
                if (percentLabelsObj)
                    dataLabelUtils.updateLabelSettingsFromLabelsObject(percentLabelsObj, percentBarLabelSettings);
            }

            // Always take the first valid value field
            let firstValueColumn = !_.isEmpty(values) && FunnelChart.getFirstValidValueColumn(values);
            
            // If we don't have a valid value column, just return
            if (!firstValueColumn)
                return {
                    slices: slices,
                    categoryLabels: categoryLabels,
                    valuesMetadata: valueMetaData,
                    hasHighlights: hasHighlights,
                    highlightsOverflow: highlightsOverflow,
                    canShowDataLabels: true,
                    dataLabelsSettings: dataLabelsSettings,
                    hasNegativeValues: hasNegativeValues,
                    allValuesAreNegative: allValuesAreNegative,
                    percentBarLabelSettings: percentBarLabelSettings,
                };

            // Calculate the first value for percent tooltip values
            firstValue = firstValueColumn.values[0];
            if (hasHighlights) {
                firstHighlight = firstValueColumn.highlights[0];
            }

            if (categories.length === 1) {
                // Single Category, Value and (optional) Gradient
                let category = categories[0];
                let categoryValues = category.values;
                let categorySourceFormatString = valueFormatter.getFormatString(category.source, formatStringProp);

                for (let i = 0, ilen = categoryValues.length; i < ilen; i++) {
                    let measureName = firstValueColumn.source.queryName;

                    let identity = SelectionIdBuilder.builder()
                        .withCategory(category, i)
                        .withMeasure(measureName)
                        .createSelectionId();

                    let value = firstValueColumn.values[i];
                    let formattedCategoryValue = valueFormatter.format(categoryValues[i], categorySourceFormatString);
                    let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, categorical, formattedCategoryValue, value, null, null, 0, i);

                    if (hasHighlights) {
                        let highlight = firstValueColumn.highlights[i];
                        if (highlight !== 0) {
                            tooltipInfo = TooltipBuilder.createTooltipInfo(formatStringProp, categorical, formattedCategoryValue, value, null, null, 0, i, highlight);
                        }
                    }
                    FunnelChart.addFunnelPercentsToTooltip(tooltipInfo, hostServices, firstValue ? value / firstValue : null, previousValue ? value / previousValue : null);

                    // Same color for all bars
                    let color = colorHelper.getColorForMeasure(category.objects && category.objects[i], '');

                    slices.push({
                        label: formattedCategoryValue,
                        value: value,
                        originalValue: value,
                        categoryOrMeasureIndex: i,
                        identity: identity,
                        selected: false,
                        key: identity.getKey(),
                        tooltipInfo: tooltipInfo,
                        color: color,
                        labelFill: dataLabelsSettings.labelColor,
                    });
                    if (hasHighlights) {
                        let highlightIdentity = SelectionId.createWithHighlight(identity);
                        let highlight = firstValueColumn.highlights[i];
                        let highlightedValue = highlight !== 0 ? highlight : undefined;
                        let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, categorical, formattedCategoryValue, value, null, null, 0, i, highlightedValue);
                        FunnelChart.addFunnelPercentsToTooltip(tooltipInfo, hostServices, firstHighlight ? highlight / firstHighlight : null, previousHighlight ? highlight / previousHighlight : null, true);

                        slices.push({
                            label: formattedCategoryValue,
                            value: value,
                            originalValue: value,
                            categoryOrMeasureIndex: i,
                            identity: highlightIdentity,
                            selected: false,
                            key: highlightIdentity.getKey(),
                            highlight: true,
                            highlightValue: highlight,
                            originalHighlightValue: highlight,
                            tooltipInfo: tooltipInfo,
                            color: color,
                        });
                        previousHighlight = highlight;
                    }
                    previousValue = value;
                }
            }
            else if (valueMetaData.length > 0 && values && values.length > 0) {
                // Multi-measures
                for (let i = 0, len = values.length; i < len; i++) {
                    let valueColumn = values[i];

                    if (!FunnelChart.isValidValueColumn(valueColumn))
                        continue;

                    let value = valueColumn.values[0];
                    let identity = SelectionId.createWithMeasure(valueColumn.source.queryName);
                    let categoryValue: any = valueMetaData[i].displayName;
                    let valueIndex: number = categorical.categories ? null : i;
                    let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, categorical, categoryValue, value, null, null, valueIndex, i);

                    // Same color for all bars
                    let color = colorHelper.getColorForMeasure(valueColumn.source.objects, '');

                    if (hasHighlights) {
                        let highlight = valueColumn.highlights[0];
                        if (highlight !== 0) {
                            tooltipInfo = TooltipBuilder.createTooltipInfo(formatStringProp, categorical, categoryValue, value, null, null, 0, i, highlight);
                        }
                    }
                    FunnelChart.addFunnelPercentsToTooltip(tooltipInfo, hostServices, firstValue ? value / firstValue : null, previousValue ? value / previousValue : null);

                    slices.push({
                        label: valueMetaData[i].displayName,
                        value: value,
                        originalValue: value,
                        categoryOrMeasureIndex: i,
                        identity: identity,
                        selected: false,
                        key: identity.getKey(),
                        tooltipInfo: tooltipInfo,
                        color: color,
                        labelFill: dataLabelsSettings.labelColor,
                    });
                    if (hasHighlights) {
                        let highlightIdentity = SelectionId.createWithHighlight(identity);
                        let highlight = valueColumn.highlights[0];
                        if (highlight > value) {
                            highlightsOverflow = true;
                        }
                        let highlightedValue = highlight !== 0 ? highlight : undefined;
                        let tooltipInfo: TooltipDataItem[] = TooltipBuilder.createTooltipInfo(formatStringProp, categorical, categoryValue, value, null, null, 0, i, highlightedValue);
                        FunnelChart.addFunnelPercentsToTooltip(tooltipInfo, hostServices, firstHighlight ? highlight / firstHighlight : null, previousHighlight ? highlight / previousHighlight : null, true);

                        slices.push({
                            label: valueMetaData[i].displayName,
                            value: value,
                            originalValue: value,
                            categoryOrMeasureIndex: i,
                            identity: highlightIdentity,
                            key: highlightIdentity.getKey(),
                            selected: false,
                            highlight: true,
                            originalHighlightValue: highlight,
                            highlightValue: highlight,
                            tooltipInfo: tooltipInfo,
                            color: color,
                        });
                        previousHighlight = highlight;
                    }
                    previousValue = value;
                }
            }

            for (let i = 0; i < slices.length; i += hasHighlights ? 2 : 1) {
                let slice = slices[i];
                categoryLabels.push(slice.label);
            }

            // Calculate negative value warning flags
            allValuesAreNegative = slices.length > 0 && _.every(slices, (slice: FunnelSlice) => (slice.highlight ? slice.highlightValue <= 0 : true) && slice.value < 0);
            for (let slice of slices) {
                if (allValuesAreNegative) {
                    slice.value = Math.abs(slice.value);
                    if (slice.highlight)
                        slice.highlightValue = Math.abs(slice.highlightValue);
                }
                else {
                    let value = slice.value;
                    let isValueNegative = value < 0;
                    if (isValueNegative)
                        slice.value = 0;

                    let isHighlightValueNegative = false;
                    if (slice.highlight) {
                        let highlightValue = slice.highlightValue;
                        isHighlightValueNegative = highlightValue < 0;
                        slice.highlightValue = isHighlightValueNegative ? 0 : highlightValue;
                    }

                    if (!hasNegativeValues)
                        hasNegativeValues = isValueNegative || isHighlightValueNegative;
                }

                if (slice.highlightValue > slice.value) {
                    highlightsOverflow = true;
                }
            }

            return {
                slices: slices,
                categoryLabels: categoryLabels,
                valuesMetadata: valueMetaData,
                hasHighlights: hasHighlights,
                highlightsOverflow: highlightsOverflow,
                canShowDataLabels: true,
                dataLabelsSettings: dataLabelsSettings,
                hasNegativeValues: hasNegativeValues,
                allValuesAreNegative: allValuesAreNegative,
                percentBarLabelSettings: percentBarLabelSettings,
            };
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            let enumeration = new ObjectEnumerationBuilder();

            switch (options.objectName) {
                case 'dataPoint':
                    let dataViewCat: DataViewCategorical = this.dataViews && this.dataViews.length > 0 && this.dataViews[0] && this.dataViews[0].categorical;
                    let hasGradientRole = GradientUtils.hasGradientRole(dataViewCat);
                    if (!hasGradientRole) {
                        this.enumerateDataPoints(enumeration);
                    }
                    break;
                case 'labels':
                    let labelSettingsOptions= FunnelChart.getLabelSettingsOptions(enumeration, this.data.dataLabelsSettings, true, this.labelPositionObjects);
                    dataLabelUtils.enumerateDataLabels(labelSettingsOptions);
                    break;
                case 'percentBarLabel':
                    let percentLabelSettingOptions = FunnelChart.getLabelSettingsOptions(enumeration, this.data.percentBarLabelSettings, false);
                    dataLabelUtils.enumerateDataLabels(percentLabelSettingOptions);
                    break;
            }

            return enumeration.complete();
        }

        private static getLabelSettingsOptions(enumeration: ObjectEnumerationBuilder, labelSettings: VisualDataLabelsSettings, isDataLabels: boolean, positionObject?: any): VisualDataLabelsSettingsOptions {
            return {
                enumeration: enumeration,
                dataLabelsSettings: labelSettings,
                show: true,
                displayUnits: isDataLabels,
                precision: isDataLabels,
                position: isDataLabels,
                positionObject: positionObject,
                fontSize: true,
            };
        }

        private enumerateDataPoints(enumeration: ObjectEnumerationBuilder): void {
            let data = this.data;
            if (!data)
                return;

            let slices = data.slices;

            enumeration.pushInstance({
                objectName: 'dataPoint',
                selector: null,
                properties: {
                    defaultColor: { solid: { color: this.defaultDataPointColor || this.colors.getColorByIndex(0).value } }
                },
            });

            for (let i = 0; i < slices.length; i++) {
                let slice = slices[i];
                if (slice.highlight)
                    continue;

                let color = slice.color;
                let selector = slice.identity.getSelector();
                let isSingleSeries = !!selector.data;

                enumeration.pushInstance({
                    objectName: 'dataPoint',
                    displayName: slice.label,
                    selector: ColorHelper.normalizeSelector(selector, isSingleSeries),
                    properties: {
                        fill: { solid: { color: color } }
                    },
                });
            }
        }

        public init(options: VisualInitOptions) {
            this.options = options;
            let element = options.element;
            let svg = this.svg = d3.select(element.get(0))
                .append('svg')
                .classed(FunnelChart.VisualClassName, true);

            if (this.behavior)
                this.clearCatcher = appendClearCatcher(this.svg);

            this.currentViewport = options.viewport;
            this.margin = {
                left: 5,
                right: 5,
                top: 0,
                bottom: 0
            };
            let style = options.style;
            this.colors = style.colorPalette.dataColors;
            this.hostServices = options.host;
            if (this.behavior) {
                this.interactivityService = createInteractivityService(this.hostServices);
            }
            this.percentGraphicsContext = svg.append('g').classed(FunnelChart.Selectors.percentBar.root.class, true);
            this.funnelGraphicsContext = svg.append('g');
            this.axisGraphicsContext = svg.append('g');
            
            this.updateViewportProperties();
        }

        private updateViewportProperties() {
            let viewport = this.currentViewport;
            this.svg.attr('width', viewport.width)
                .attr('height', viewport.height);
        }

        public update(options: VisualUpdateOptions): void {
            debug.assertValue(options, 'options');
            this.data = {
                slices: [],
                categoryLabels: [],
                valuesMetadata: [],
                hasHighlights: false,
                highlightsOverflow: false,
                canShowDataLabels: true,
                dataLabelsSettings: dataLabelUtils.getDefaultFunnelLabelSettings(),
                hasNegativeValues: false,
                allValuesAreNegative: false,
                percentBarLabelSettings: dataLabelUtils.getDefaultLabelSettings(true),
            };

            let dataViews = this.dataViews = options.dataViews;
            this.currentViewport = options.viewport;

            if (dataViews && dataViews.length > 0) {
                let dataView = dataViews[0];

                if (dataView.metadata && dataView.metadata.objects) {
                    let defaultColor = DataViewObjects.getFillColor(dataView.metadata.objects, funnelChartProps.dataPoint.defaultColor);
                    if (defaultColor)
                        this.defaultDataPointColor = defaultColor;
                }

                if (dataView.categorical) {
                    this.data = FunnelChart.converter(dataView, this.colors, this.hostServices, this.defaultDataPointColor);

                    if (this.interactivityService) {
                        this.interactivityService.applySelectionStateToData(this.data.slices);
                    }
                }

                let warnings = getInvalidValueWarnings(
                    dataViews,
                    false /*supportsNaN*/,
                    false /*supportsNegativeInfinity*/,
                    false /*supportsPositiveInfinity*/);

                if (this.data.allValuesAreNegative) {
                    warnings.unshift(new AllNegativeValuesWarning());
                }
                else if (this.data.hasNegativeValues) {
                    warnings.unshift(new NegativeValuesNotSupportedWarning());
                }

                this.hostServices.setWarnings(warnings);
            }

            this.updateViewportProperties();
            this.updateInternal(options.suppressAnimations);
        }

        // TODO: Remove onDataChanged & onResizing once all visuals have implemented update.
        public onDataChanged(options: VisualDataChangedOptions): void {
            this.update({
                dataViews: options.dataViews,
                suppressAnimations: options.suppressAnimations,
                viewport: this.currentViewport
            });
        }

        // TODO: Remove onDataChanged & onResizing once all visuals have implemented update.
        public onResizing(viewport: IViewport): void {
            this.currentViewport = viewport;
            this.update({
                dataViews: this.dataViews,
                suppressAnimations: true,
                viewport: this.currentViewport
            });
        }

        private getMaxLeftMargin(labels: string[], properties: TextProperties): number {
            let max = 0;
            let textMeasurer: ITextAsSVGMeasurer = TextMeasurementService.measureSvgTextWidth;
            for (let i = 0, len = labels.length; i < len; i++) {
                properties.text = labels[i];
                max = Math.max(max, textMeasurer(properties));
            }
            return max + FunnelChart.LabelFunnelPadding;
        }

        private updateInternal(suppressAnimations: boolean) {
            if (this.data == null)
                return;

            let data = this.data;
            let slices = data.slices;
            let slicesWithoutHighlights = slices.filter((d: FunnelSlice) => !d.highlight);
            let isHidingPercentBars = this.isHidingPercentBars();

            let axisOptions = this.setUpAxis();
            let margin = axisOptions.margin;
            let verticalRange = axisOptions.verticalRange;

            let funnelContext = this.funnelGraphicsContext.attr('transform',
                SVGUtil.translateAndRotate(margin.left, margin.top, verticalRange / 2, verticalRange / 2, 90));

            this.percentGraphicsContext.attr('transform',
                SVGUtil.translate(margin.left, margin.top));

            this.svg.style('font-family', dataLabelUtils.StandardFontFamily);

            let layout = FunnelChart.getLayout(data, axisOptions);
            let labelLayout = dataLabelUtils.getFunnelChartLabelLayout(
                data,
                axisOptions,
                FunnelChart.InnerTextMinimumPadding,
                data.dataLabelsSettings,
                this.currentViewport);

            let result: FunnelAnimationResult;
            let shapes: D3.UpdateSelection;
            let dataLabels: D3.UpdateSelection;

            if (this.animator && !suppressAnimations) {
                let animationOptions: FunnelAnimationOptions = {
                    viewModel: data,
                    interactivityService: this.interactivityService,
                    layout: layout,
                    axisGraphicsContext: this.axisGraphicsContext,
                    shapeGraphicsContext: funnelContext,
                    percentGraphicsContext: this.percentGraphicsContext,
                    labelGraphicsContext: this.svg,
                    axisOptions: axisOptions,
                    slicesWithoutHighlights: slicesWithoutHighlights,
                    colors: this.colors,
                    labelLayout: labelLayout,
                    isHidingPercentBars: isHidingPercentBars,
                    visualInitOptions: this.options,
                };
                result = this.animator.animate(animationOptions);
                shapes = result.shapes;
                dataLabels = result.dataLabels;
            }
            if (!this.animator || suppressAnimations || result.failed) {
                FunnelChart.drawDefaultAxis(this.axisGraphicsContext, axisOptions, isHidingPercentBars);
                shapes = FunnelChart.drawDefaultShapes(data, slices, funnelContext, layout, this.interactivityService && this.interactivityService.hasSelection());
                FunnelChart.drawPercentBars(data, this.percentGraphicsContext, layout, isHidingPercentBars);
                if (data.dataLabelsSettings.show && data.canShowDataLabels) {
                    dataLabels = dataLabelUtils.drawDefaultLabelsForFunnelChart(data.slices, this.svg, labelLayout);
                }
                else {
                    dataLabelUtils.cleanDataLabels(this.svg);
                }
            }

            if (this.interactivityService) {
                let interactors: D3.UpdateSelection = FunnelChart.drawInteractorShapes(slices, funnelContext, layout);
                let behaviorOptions: FunnelBehaviorOptions = {
                    bars: shapes,
                    interactors: interactors,
                    clearCatcher: this.clearCatcher,
                    hasHighlights: data.hasHighlights,
                };

                this.interactivityService.bind(slices, this.behavior, behaviorOptions);

                if (this.tooltipsEnabled) {
                    TooltipManager.addTooltip(shapes, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);
                    TooltipManager.addTooltip(interactors, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);
                }
            }
            else if (this.tooltipsEnabled) {
                TooltipManager.addTooltip(shapes, (tooltipEvent: TooltipEvent) => tooltipEvent.data.tooltipInfo);
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(this.options);
        }

        private getUsableVerticalSpace(): number {
            let categoryLabels = this.data.categoryLabels;
            let margin = this.margin;
            let verticalSpace = this.currentViewport.height - (margin.top + margin.bottom);
            return verticalSpace - (FunnelChart.MinBarThickness * categoryLabels.length);
        }

        private isHidingPercentBars(): boolean {
            let data = this.data;

            if (data.percentBarLabelSettings.show) {
                let percentBarTextProperties = FunnelChart.getTextProperties(data.percentBarLabelSettings.fontSize);
                let percentBarTextHeight = TextMeasurementService.estimateSvgTextHeight(percentBarTextProperties) * 2;
                let verticalSpace = this.getUsableVerticalSpace() - (2 * FunnelChart.MinBarThickness * FunnelChart.PercentBarToBarRatio) - percentBarTextHeight;
                return verticalSpace <= 0;
            }
            return true;
        }

        private isSparklines(): boolean {
            return this.getUsableVerticalSpace() <= 0;
        }

        private setUpAxis(): FunnelAxisOptions {
            let data = this.data;
            let slices = data.slices;
            let categoryLabels = data.categoryLabels;
            let viewport = this.currentViewport;
            let margin = this.margin;
            let horizontalRange = viewport.height - (margin.top + margin.bottom);
            let isSparklines = this.isSparklines();
            let isHidingPercentBars = this.isHidingPercentBars();

            if (categoryLabels.length > 0 && isSparklines) {
                categoryLabels = [];
                data.canShowDataLabels = false;
            } else if (this.showCategoryLabels()) {
                let textProperties = FunnelChart.getTextProperties();
                margin.left = this.getMaxLeftMargin(categoryLabels, textProperties);
            } else {
                categoryLabels = [];
            }

            let verticalRange = viewport.width - (margin.left + margin.right);
            let barToSpaceRatio = FunnelChart.BarToSpaceRatio;
            let maxScore = d3.max(slices.map(d=> d.value));
            let minScore = 0;
            let rangeStart = 0;
            let rangeEnd = horizontalRange;

            let delta: number;
            if (isHidingPercentBars)
                delta = horizontalRange - (categoryLabels.length * FunnelChart.MaxBarWidth);
            else
                delta = horizontalRange - (categoryLabels.length * FunnelChart.MaxBarWidth) - (2 * FunnelChart.MaxBarWidth * FunnelChart.PercentBarToBarRatio);

            if (categoryLabels.length > 0 && delta > 0) {
                rangeStart = Math.ceil(delta / 2);
                rangeEnd = Math.ceil(horizontalRange - delta / 2);
            }

            let yScale = d3.scale.linear()
                .domain([minScore, maxScore])
                .range([verticalRange, 0]);
            let xScale = d3.scale.ordinal()
                .domain(d3.range(0, data.categoryLabels.length))
                .rangeBands([rangeStart, rangeEnd], barToSpaceRatio, isHidingPercentBars ? barToSpaceRatio : FunnelChart.PercentBarToBarRatio);

            return {
                margin: margin,
                xScale: xScale,
                yScale: yScale,
                maxScore: maxScore,
                verticalRange: verticalRange,
                rangeStart: rangeStart,
                rangeEnd: rangeEnd,
                barToSpaceRatio: barToSpaceRatio,
                categoryLabels: categoryLabels,
            };
        }

        public onClearSelection(): void {
            if (this.interactivityService)
                this.interactivityService.clearSelection();
        }

        public static getLayout(data: FunnelData, axisOptions: FunnelAxisOptions): IFunnelLayout {
            let highlightsOverflow = data.highlightsOverflow;
            let yScale = axisOptions.yScale;
            let xScale = axisOptions.xScale;
            let maxScore = axisOptions.maxScore;
            let columnWidth = xScale.rangeBand();
            let halfColumnWidth = Math.ceil(columnWidth / 2);
            let percentBarTickHeight = halfColumnWidth;
            let overFlowHighlightColumnWidth = columnWidth * FunnelChart.OverflowingHighlightWidthRatio;
            let overFlowHighlightOffset = overFlowHighlightColumnWidth / 2;
            let lastCategoryIndex = axisOptions.categoryLabels.length - 1;
            let horizontalDistance = Math.abs(yScale(maxScore) - yScale(0));
            let emptyHorizontalSpace = (value: number): number => (horizontalDistance - Math.abs(yScale(value) - yScale(0))) / 2;
            let getMinimumShapeSize = (value: number): number => Math.max(FunnelChart.MinimumInteractorSize, Math.abs(yScale(value) - yScale(0)));
            let percentBarFontSize = PixelConverter.fromPoint(data.percentBarLabelSettings.fontSize);

            return {
                percentBarLayout: {
                    mainLine: {
                        x2: (d: FunnelPercent) => Math.abs(yScale(d.value) - yScale(0)),
                        transform: (d: FunnelPercent) => {
                            let xOffset = yScale(d.value) - emptyHorizontalSpace(d.value);
                            let yOffset = d.isTop
                                ? xScale(0) - halfColumnWidth
                                : xScale(lastCategoryIndex) + columnWidth + halfColumnWidth;
                            return SVGUtil.translate(xOffset, yOffset);
                        },
                    },
                    leftTick: {
                        y2: (d: FunnelPercent) => percentBarTickHeight,
                        transform: (d: FunnelPercent) => {
                            let xOffset = yScale(d.value) - emptyHorizontalSpace(d.value);
                            let yOffset = d.isTop
                                ? xScale(0) - halfColumnWidth - (percentBarTickHeight / 2)
                                : xScale(lastCategoryIndex) + columnWidth + halfColumnWidth - (percentBarTickHeight / 2);
                            return SVGUtil.translate(xOffset, yOffset);
                        },
                    },
                    rightTick: {
                        y2: (d: FunnelPercent) => percentBarTickHeight,
                        transform: (d: FunnelPercent) => {
                            let columnOffset = yScale(d.value) - emptyHorizontalSpace(d.value);
                            let columnHeight = Math.abs(yScale(d.value) - yScale(0));
                            let xOffset = columnOffset + columnHeight;
                            let yOffset = d.isTop
                                ? xScale(0) - halfColumnWidth - (percentBarTickHeight / 2)
                                : xScale(lastCategoryIndex) + columnWidth + halfColumnWidth - (percentBarTickHeight / 2);
                            return SVGUtil.translate(xOffset, yOffset);
                        },
                    },
                    text: {
                        x: (d: FunnelPercent) => Math.ceil((Math.abs(yScale(maxScore) - yScale(0)) / 2)),
                        y: (d: FunnelPercent) => {
                            return d.isTop
                                ? -percentBarTickHeight / 2
                                : parseInt(percentBarFontSize, 10) + (percentBarTickHeight / 2);
                        },
                        dy: (d: FunnelPercent) => d.isTop ? '' : dataLabelUtils.DefaultDy,
                        style: () => `font-size: ${percentBarFontSize}`,
                        transform: (d: FunnelPercent) => {
                            let yOffset = d.isTop
                                ? xScale(0) - halfColumnWidth
                                : xScale(lastCategoryIndex) + columnWidth + halfColumnWidth;
                            return SVGUtil.translate(0, yOffset);
                        },
                        fill: data.percentBarLabelSettings.labelColor,
                        maxWidth: horizontalDistance,
                    },
                },
                shapeLayout: {
                    width: ((d: FunnelSlice) => d.highlight && highlightsOverflow ? overFlowHighlightColumnWidth : columnWidth),
                    height: (d: FunnelSlice) => {
                        return Math.abs(yScale(FunnelChart.getFunnelSliceValue(d)) - yScale(0));
                    },
                    x: (d: FunnelSlice) => {
                        return xScale(d.categoryOrMeasureIndex) + (d.highlight && highlightsOverflow ? overFlowHighlightOffset : 0);
                    },
                    y: (d: FunnelSlice) => {
                        let value = FunnelChart.getFunnelSliceValue(d);
                        return yScale(value) - emptyHorizontalSpace(value);
                    },
                },
                shapeLayoutWithoutHighlights: {
                    width: ((d: FunnelSlice) => columnWidth),
                    height: (d: FunnelSlice) => {
                        return Math.abs(yScale(d.value) - yScale(0));
                    },
                    x: (d: FunnelSlice) => {
                        return xScale(d.categoryOrMeasureIndex) + (0);
                    },
                    y: (d: FunnelSlice) => {
                        return yScale(d.value) - emptyHorizontalSpace(d.value);
                    },
                },
                zeroShapeLayout: {
                    width: ((d: FunnelSlice) => d.highlight && highlightsOverflow ? overFlowHighlightColumnWidth : columnWidth),
                    height: (d: FunnelSlice) => 0,
                    x: (d: FunnelSlice) => {
                        return xScale(d.categoryOrMeasureIndex) + (d.highlight && highlightsOverflow ? overFlowHighlightOffset : 0);
                    },
                    y: (d: FunnelSlice) => {
                        return yScale((yScale.domain()[0] + yScale.domain()[1]) / 2);
                    },
                },
                interactorLayout: {
                    width: ((d: FunnelSlice) => d.highlight && highlightsOverflow ? overFlowHighlightColumnWidth : columnWidth),
                    height: (d: FunnelSlice) => getMinimumShapeSize(FunnelChart.getFunnelSliceValue(d)),
                    x: (d: FunnelSlice) => {
                        return xScale(d.categoryOrMeasureIndex) + (d.highlight && highlightsOverflow ? overFlowHighlightOffset : 0);
                    },
                    y: (d: FunnelSlice) => {
                        let size = getMinimumShapeSize(FunnelChart.getFunnelSliceValue(d));
                        return (horizontalDistance - size) / 2;
                    },
                },
            };
        }

        public static drawDefaultAxis(graphicsContext: D3.Selection, axisOptions: FunnelAxisOptions, isHidingPercentBars: boolean): void {
            //Generate ordinal domain
            var indices = d3.range(0, axisOptions.categoryLabels.length);
            let xScaleForAxis = d3.scale.ordinal()
                .domain(indices)
                .rangeBands([axisOptions.rangeStart, axisOptions.rangeEnd], axisOptions.barToSpaceRatio, isHidingPercentBars ? axisOptions.barToSpaceRatio : FunnelChart.PercentBarToBarRatio);
            let xAxis = d3.svg.axis()
                .scale(xScaleForAxis)
                .orient("right")
                .tickPadding(FunnelChart.TickPadding)
                .innerTickSize(FunnelChart.InnerTickSize)
                .ticks(indices.length)
                .tickValues(indices)
                .tickFormat((i) => { return axisOptions.categoryLabels[i]; }); //To output the category label
            graphicsContext.attr('class', 'axis hideLinesOnAxis')
                .attr('transform', SVGUtil.translate(0, axisOptions.margin.top))
                .call(xAxis);
        }

        public static drawDefaultShapes(data: FunnelData, slices: FunnelSlice[], graphicsContext: D3.Selection, layout: IFunnelLayout, hasSelection: boolean): D3.UpdateSelection {
            let hasHighlights = data.hasHighlights;
            let columns = graphicsContext.selectAll(FunnelChart.Selectors.funnel.bars.selector).data(slices, (d: FunnelSlice) => d.key);

            columns.enter()
                .append('rect')
                .attr("class", (d: FunnelSlice) => d.highlight ? FunnelChart.FunnelBarHighlightClass : FunnelChart.Selectors.funnel.bars.class);

            columns
                .style("fill", d => {
                    return d.color;
                })
                .style("fill-opacity", d => (d: FunnelSlice) => ColumnUtil.getFillOpacity(d.selected, d.highlight, hasSelection, hasHighlights))
                .attr(layout.shapeLayout);

            columns.exit().remove();

            return columns;
        }

        public static getFunnelSliceValue(slice: FunnelSlice, asOriginal: boolean = false) {
            if (asOriginal)
                return slice.highlight ? slice.originalHighlightValue : slice.originalValue;
            else
                return slice.highlight ? slice.highlightValue : slice.value;
        }
        
        public static drawInteractorShapes(slices: FunnelSlice[], graphicsContext: D3.Selection, layout: IFunnelLayout): D3.UpdateSelection {
            // Draw invsible ineractors for just data points which are below threshold
            let needInteractors = slices.filter((d: FunnelSlice) => {
                return !d.highlight && layout.interactorLayout.height(d) === FunnelChart.MinimumInteractorSize;
            });
            let columns = graphicsContext.selectAll(FunnelChart.Selectors.funnel.interactors.selector).data(needInteractors, (d: FunnelSlice) => d.key);

            columns.enter()
                .append('rect')
                .attr("class", FunnelChart.Selectors.funnel.interactors.class);

            columns
                .style("fill-opacity", 0)
                .attr(layout.interactorLayout);

            columns.exit().remove();

            return columns;
        }

        private static drawPercentBarComponents(graphicsContext: D3.Selection, data: FunnelPercent[], layout: IFunnelLayout, percentLabelSettings: VisualDataLabelsSettings) {
            // Main line
            let mainLine: D3.UpdateSelection = graphicsContext.selectAll(FunnelChart.Selectors.percentBar.mainLine.selector).data(data);
            mainLine.exit().remove();
            mainLine.enter()
                .append('line')
                .classed(FunnelChart.Selectors.percentBar.mainLine.class, true);
            mainLine
                .attr(layout.percentBarLayout.mainLine);

            // Left tick
            let leftTick: D3.UpdateSelection = graphicsContext.selectAll(FunnelChart.Selectors.percentBar.leftTick.selector).data(data);
            leftTick.exit().remove();
            leftTick.enter()
                .append('line')
                .classed(FunnelChart.Selectors.percentBar.leftTick.class, true);
            leftTick
                .attr(layout.percentBarLayout.leftTick);

            // Right tick
            let rightTick: D3.UpdateSelection = graphicsContext.selectAll(FunnelChart.Selectors.percentBar.rightTick.selector).data(data);
            rightTick.exit().remove();
            rightTick.enter()
                .append('line')
                .classed(FunnelChart.Selectors.percentBar.rightTick.class, true);
            rightTick
                .attr(layout.percentBarLayout.rightTick);

            // Text
            let text: D3.UpdateSelection = graphicsContext.selectAll(FunnelChart.Selectors.percentBar.text.selector).data(data);
            text.exit().remove();
            text.enter()
                .append('text')
                .classed(FunnelChart.Selectors.percentBar.text.class, true);
            text
                .attr(layout.percentBarLayout.text)
                .text((fp: FunnelPercent) => {
                    return dataLabelUtils.getLabelFormattedText({
                        label: fp.percent,
                        format: valueFormatter.getLocalizedString("Percentage1"),
                        fontSize: percentLabelSettings.fontSize,
                        maxWidth: layout.percentBarLayout.text.maxWidth,
                    });
                });
        }

        public static drawPercentBars(data: FunnelData, graphicsContext: D3.Selection, layout: IFunnelLayout, isHidingPercentBars: boolean): void {
            if (isHidingPercentBars || !data.slices || (data.hasHighlights ? data.slices.length / 2 : data.slices.length) < 2) {
                FunnelChart.drawPercentBarComponents(graphicsContext, [], layout, data.percentBarLabelSettings);
                return;
            }

            let slices = [data.slices[data.hasHighlights ? 1 : 0], data.slices[data.slices.length - 1]];
            let baseline = FunnelChart.getFunnelSliceValue(slices[0]);

            if (baseline <= 0) {
                FunnelChart.drawPercentBarComponents(graphicsContext, [], layout, data.percentBarLabelSettings);
                return;
            }

            let percentData: FunnelPercent[] = [
                {
                    value: FunnelChart.getFunnelSliceValue(slices[0]),
                    percent: 1,
                    isTop: true,
                },
                {
                    value: FunnelChart.getFunnelSliceValue(slices[1]),
                    percent: FunnelChart.getFunnelSliceValue(slices[1]) / baseline,
                    isTop: false,
                },
            ];

            FunnelChart.drawPercentBarComponents(graphicsContext, percentData, layout, data.percentBarLabelSettings);
        }

        private showCategoryLabels(): boolean {
            if (this.funnelSmallViewPortProperties) {
                if ((this.funnelSmallViewPortProperties.hideFunnelCategoryLabelsOnSmallViewPort) && (this.currentViewport.height < this.funnelSmallViewPortProperties.minHeightFunnelCategoryLabelsVisible)){
                        return false;
                }
            }
            return true;
        }

        private static addFunnelPercentsToTooltip(tooltipInfo: TooltipDataItem[], hostServices: IVisualHostServices, percentOfFirst?: number, percentOfPrevious?: number, highlight?: boolean): void {
            if (percentOfFirst != null) {
                tooltipInfo.push({
                    displayName: hostServices.getLocalizedString("Funnel_PercentOfFirst" + (highlight ? "_Highlight" : "")),
                    value: valueFormatter.format(percentOfFirst, '0.00 %;-0.00 %;0.00 %'),
                });
            }
            if (percentOfPrevious != null) {
                tooltipInfo.push({
                    displayName: hostServices.getLocalizedString("Funnel_PercentOfPrevious" + (highlight ? "_Highlight" : "")),
                    value: valueFormatter.format(percentOfPrevious, '0.00 %;-0.00 %;0.00 %'),
                });
            }
        }

        private static getTextProperties(fontSize?: number): TextProperties {
            return {
                fontSize: PixelConverter.fromPoint(fontSize || dataLabelUtils.DefaultFontSizeInPt),
                fontFamily: dataLabelUtils.StandardFontFamily,
            };
        }
    }
}