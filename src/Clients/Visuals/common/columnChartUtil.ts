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

    const rectName = 'rect';

    export module ColumnUtil {
        export const DimmedOpacity = 0.4;
        export const DefaultOpacity = 1.0;

        export function applyUserMinMax(isScalar: boolean, dataView: DataViewCategorical, xAxisCardProperties: DataViewObject): DataViewCategorical {
            if (isScalar) {
                let min = xAxisCardProperties['start'];
                let max = xAxisCardProperties['end'];

                return ColumnUtil.transformDomain(dataView, min, max);
            }

            return dataView;
        }

        export function transformDomain(dataView: DataViewCategorical, min: DataViewPropertyValue, max: DataViewPropertyValue): DataViewCategorical {
            if (!dataView.categories || !dataView.values || dataView.categories.length === 0 || dataView.values.length === 0)
                return dataView;// no need to do something when there are no categories  
            
            if (typeof min !== "number" && typeof max !== "number")
                return dataView;//user did not set min max, nothing to do here        
            
            let category = dataView.categories[0];//at the moment we only support one category
            let categoryValues = category.values;
            let categoryObjects = category.objects;

            if (!categoryValues || !categoryObjects)
                return dataView;
            let newcategoryValues = [];
            let newValues = [];
            let newObjects = [];

            //get new min max
            if (typeof min !== "number") {
                min = categoryValues[0];
            }
            if (typeof max !== "number") {
                max = categoryValues[categoryValues.length - 1];
            }

            //don't allow this
            if (min > max)
                return dataView;

            //build measure array
            for (let j = 0, len = dataView.values.length; j < len; j++) {
                newValues.push([]);
            }

            for (let t = 0, len = categoryValues.length; t < len; t++) {
                if (categoryValues[t] >= min && categoryValues[t] <= max) {
                    newcategoryValues.push(categoryValues[t]);
                    if (categoryObjects) {
                        newObjects.push(categoryObjects[t]);
                    }
                          
                    //on each measure set the new range
                    if (dataView.values) {
                        for (let k = 0; k < dataView.values.length; k++) {
                            newValues[k].push(dataView.values[k].values[t]);
                        }
                    }
                }
            }

            //don't write directly to dataview
            let resultDataView = Prototype.inherit(dataView);
            let resultDataViewValues = resultDataView.values = Prototype.inherit(resultDataView.values);
            let resultDataViewCategories = resultDataView.categories = Prototype.inherit(dataView.categories);
            let resultDataViewCategories0 = resultDataView.categories[0] = Prototype.inherit(resultDataViewCategories[0]);

            resultDataViewCategories0.values = newcategoryValues;
            //only if we had objects, then you set the new objects
            if (resultDataViewCategories0.objects) {
                resultDataViewCategories0.objects = newObjects;
            }

            //update measure array
            for (let t = 0, len = dataView.values.length; t < len; t++) {
                let measureArray = resultDataViewValues[t] = Prototype.inherit(resultDataViewValues[t]);
                measureArray.values = newValues[t];
            }

            return resultDataView;
        }

        export function getCategoryAxis(
            data: ColumnChartData,
            size: number,
            layout: CategoryLayout,
            isVertical: boolean,
            forcedXMin?: DataViewPropertyValue,
            forcedXMax?: DataViewPropertyValue,
            axisScaleType?: string,
            axisDisplayUnits?: number,
            axisPrecision?: number): IAxisProperties {

            let categoryThickness = layout.categoryThickness;
            let isScalar = layout.isScalar;
            let outerPaddingRatio = layout.outerPaddingRatio;
            let domain = AxisHelper.createDomain(data.series, data.categoryMetadata ? data.categoryMetadata.type : ValueType.fromDescriptor({ text: true }), isScalar, [forcedXMin, forcedXMax]);

            let axisProperties = AxisHelper.createAxis({
                pixelSpan: size,
                dataDomain: domain,
                metaDataColumn: data.categoryMetadata,
                formatString: valueFormatter.getFormatString(data.categoryMetadata, columnChartProps.general.formatString),
                outerPadding: categoryThickness * outerPaddingRatio,
                isCategoryAxis: true,
                isScalar: isScalar,
                isVertical: isVertical,
                categoryThickness: categoryThickness,
                useTickIntervalForDisplayUnits: true,
                getValueFn: (index, type) => CartesianHelper.lookupXValue(data, index, type, isScalar),
                scaleType: axisScaleType,
                axisDisplayUnits: axisDisplayUnits,
                axisPrecision: axisPrecision
            });

            // intentionally updating the input layout by ref
            layout.categoryThickness = axisProperties.categoryThickness;

            return axisProperties;
        }

        export function applyInteractivity(columns: D3.Selection, onDragStart): void {
            debug.assertValue(columns, 'columns');

            if (onDragStart) {
                columns
                    .attr('draggable', 'true')
                    .on('dragstart', onDragStart);
            }
        }

        export function getFillOpacity(selected: boolean, highlight: boolean, hasSelection: boolean, hasPartialHighlights: boolean): number {
            if ((hasPartialHighlights && !highlight) || (hasSelection && !selected))
                return DimmedOpacity;
            return DefaultOpacity;
        }

        export function getClosestColumnIndex(coordinate: number, columnsCenters: number[]): number {
            let currentIndex = 0;
            let distance: number = Number.MAX_VALUE;
            for (let i = 0, ilen = columnsCenters.length; i < ilen; i++) {
                let currentDistance = Math.abs(coordinate - columnsCenters[i]);
                if (currentDistance < distance) {
                    distance = currentDistance;
                    currentIndex = i;
                }
            }

            return currentIndex;
        }

        export function setChosenColumnOpacity(mainGraphicsContext: D3.Selection, columnGroupSelector: string, selectedColumnIndex: number, lastColumnIndex: number): void {
            let series = mainGraphicsContext.selectAll(ColumnChart.SeriesClasses.selector);
            let lastColumnUndefined = typeof lastColumnIndex === 'undefined';
            // find all columns that do not belong to the selected column and set a dimmed opacity with a smooth animation to those columns
            series.selectAll(rectName + columnGroupSelector).filter((d: ColumnChartDataPoint) => {
                return (d.categoryIndex !== selectedColumnIndex) && (lastColumnUndefined || d.categoryIndex === lastColumnIndex);
            }).transition().style('fill-opacity', DimmedOpacity);

            // set the default opacity for the selected column
            series.selectAll(rectName + columnGroupSelector).filter((d: ColumnChartDataPoint) => {
                return d.categoryIndex === selectedColumnIndex;
            }).style('fill-opacity', DefaultOpacity);
        }

        export function drawSeries(data: ColumnChartData, graphicsContext: D3.Selection, axisOptions: ColumnAxisOptions): D3.UpdateSelection {
            let colGroupSelection = graphicsContext.selectAll(ColumnChart.SeriesClasses.selector);
            let series = colGroupSelection.data(data.series,(d: ColumnChartSeries) => d.key);

            series
                .enter()
                .append('g')
                .classed(ColumnChart.SeriesClasses.class, true);
            series
                .exit()
                .remove();
            return series;
        }

        export function drawDefaultShapes(data: ColumnChartData, series: D3.UpdateSelection, layout: IColumnLayout, itemCS: ClassAndSelector, filterZeros: boolean, hasSelection: boolean): D3.UpdateSelection {
            // We filter out invisible (0, null, etc.) values from the dataset
            // based on whether animations are enabled or not, Dashboard and
            // Exploration mode, respectively.
            let dataSelector: (d: ColumnChartSeries) => any[];
            if (filterZeros) {
                dataSelector = (d: ColumnChartSeries) => {
                    let filteredData = _.filter(d.data,(datapoint: ColumnChartDataPoint) => !!datapoint.value);
                    return filteredData;
                };
            }
            else {
                dataSelector = (d: ColumnChartSeries) => d.data;
            }

            let shapeSelection = series.selectAll(itemCS.selector);
            let shapes = shapeSelection.data(dataSelector, (d: ColumnChartDataPoint) => d.key);

            shapes.enter()
                .append(rectName)
                .attr("class",(d: ColumnChartDataPoint) => itemCS.class.concat(d.highlight ? " highlight" : ""));

            shapes
                .style("fill",(d: ColumnChartDataPoint) => d.color)
                .style("fill-opacity",(d: ColumnChartDataPoint) => ColumnUtil.getFillOpacity(d.selected, d.highlight, hasSelection, data.hasHighlights))
                .attr(layout.shapeLayout);

            shapes
                .exit()
                .remove();

            return shapes;

        }

        export function drawDefaultLabels(series: D3.UpdateSelection, context: D3.Selection, layout: ILabelLayout, viewPort: IViewport, isAnimator: boolean = false, animationDuration?: number): D3.UpdateSelection {
            if (series) {
                let seriesData = series.data();
                let dataPoints: ColumnChartDataPoint[] = [];

                for (let i = 0, len = seriesData.length; i < len; i++) {
                    Array.prototype.push.apply(dataPoints, seriesData[i].data);
                }

                return dataLabelUtils.drawDefaultLabelsForDataPointChart(dataPoints, context, layout, viewPort, isAnimator, animationDuration);
            }
            else {
                dataLabelUtils.cleanDataLabels(context);
            }
        }

        export function normalizeInfinityInScale(scale: D3.Scale.GenericScale<any>): void {
            // When large values (eg Number.MAX_VALUE) are involved, a call to scale.nice occasionally
            // results in infinite values being included in the domain. To correct for that, we need to
            // re-normalize the domain now to not include infinities.
            let scaledDomain = scale.domain();
            for (let i = 0, len = scaledDomain.length; i < len; ++i) {
                if (scaledDomain[i] === Number.POSITIVE_INFINITY)
                    scaledDomain[i] = Number.MAX_VALUE;
                else if (scaledDomain[i] === Number.NEGATIVE_INFINITY)
                    scaledDomain[i] = -Number.MAX_VALUE;
            }

            scale.domain(scaledDomain);
        }

        export function calculatePosition(d: ColumnChartDataPoint, axisOptions: ColumnAxisOptions): number {
            let xScale = axisOptions.xScale;
            let yScale = axisOptions.yScale;
            let scaledY0 = yScale(0);
            let scaledX0 = xScale(0);
            switch (d.chartType) {
                case ColumnChartType.stackedBar:
                case ColumnChartType.hundredPercentStackedBar:
                    return scaledX0 + Math.abs(AxisHelper.diffScaled(xScale, 0, d.valueAbsolute)) +
                        AxisHelper.diffScaled(xScale, d.position - d.valueAbsolute, 0) + dataLabelUtils.defaultColumnLabelMargin;
                case ColumnChartType.clusteredBar:
                    return scaledX0 + AxisHelper.diffScaled(xScale, Math.max(0, d.value), 0) + dataLabelUtils.defaultColumnLabelMargin;
                case ColumnChartType.stackedColumn:
                case ColumnChartType.hundredPercentStackedColumn:
                    return scaledY0 + AxisHelper.diffScaled(yScale, d.position, 0) - dataLabelUtils.defaultColumnLabelMargin;
                case ColumnChartType.clusteredColumn:
                    return scaledY0 + AxisHelper.diffScaled(yScale, Math.max(0, d.value), 0) - dataLabelUtils.defaultColumnLabelMargin;
            }

        }
    }

    export module ClusteredUtil {

        export function clearColumns(
            mainGraphicsContext: D3.Selection,
            itemCS: ClassAndSelector): void {

            debug.assertValue(mainGraphicsContext, 'mainGraphicsContext');
            debug.assertValue(itemCS, 'itemCS');

            let cols = mainGraphicsContext.selectAll(itemCS.selector)
                .data([]);

            cols.exit().remove();
        }
    }

    export interface ValueMultiplers {
        pos: number;
        neg: number;
    }

    export module StackedUtil {
        const PctRoundingError = 0.0001;

        export function getSize(scale: D3.Scale.GenericScale<any>, size: number, zeroVal: number = 0): number {
            return AxisHelper.diffScaled(scale, zeroVal, size);
        }

        export function calcValueDomain(data: ColumnChartSeries[], is100pct: boolean): NumberRange {
            let defaultNumberRange = {
                min: 0,
                max: 10
            };

            if (data.length === 0)
                return defaultNumberRange;

            // Can't use AxisHelper because Stacked layout has a slightly different calc, (position - valueAbs)
            let min = d3.min<ColumnChartSeries, number>(data, d => d3.min<ColumnChartDataPoint, number>(d.data, e => e.position - e.valueAbsolute));
            let max = d3.max<ColumnChartSeries, number>(data, d => d3.max<ColumnChartDataPoint, number>(d.data, e => e.position));

            if (is100pct) {
                min = Double.roundToPrecision(min, PctRoundingError);
                max = Double.roundToPrecision(max, PctRoundingError);
            }

            return {
                min: min,
                max: max,
            };
        }

        export function getStackedMultiplier(
            dataView: DataViewCategorical,
            rowIdx: number,
            seriesCount: number,
            categoryCount: number,
            converterStrategy: IColumnChartConverterStrategy): ValueMultiplers {
            debug.assertValue(dataView, 'dataView');
            debug.assertValue(rowIdx, 'rowIdx');

            let pos: number = 0,
                neg: number = 0;
            
            for (let i = 0; i < seriesCount; i++) {
                let value: number = converterStrategy.getValueBySeriesAndCategory(i, rowIdx);
                value = AxisHelper.normalizeNonFiniteNumber(value);

                if (value > 0)
                    pos += value;
                else if (value < 0)
                    neg -= value;
            }

            let absTotal = pos + neg;
            return {
                pos: pos ? (pos / absTotal) / pos : 1,
                neg: neg ? (neg / absTotal) / neg : 1,
            };
        }

        export function clearColumns(
            mainGraphicsContext: D3.Selection,
            itemCS: ClassAndSelector): void {

            debug.assertValue(mainGraphicsContext, 'mainGraphicsContext');
            debug.assertValue(itemCS, 'itemCS');

            let bars = mainGraphicsContext.selectAll(itemCS.selector)
                .data([]);

            bars.exit().remove();
        }
    }
}