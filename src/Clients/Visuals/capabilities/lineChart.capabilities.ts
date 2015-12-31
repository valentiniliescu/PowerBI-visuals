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
    export const lineChartCapabilities: VisualCapabilities = {
        dataRoles: [
            {
                name: 'Category',
                kind: VisualDataRoleKind.Grouping,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Axis'),
                description: data.createDisplayNameGetter('Role_DisplayName_AxisDescription')
            }, {
                name: 'Series',
                kind: VisualDataRoleKind.Grouping,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Legend'),
                description: data.createDisplayNameGetter('Role_DisplayName_LegendDescription')
            }, {
                name: 'Y',
                kind: VisualDataRoleKind.Measure,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Values'),
                description: data.createDisplayNameGetter('Role_DisplayName_ValuesDescription'),
                requiredTypes: [{ numeric: true }, { integer: true }],
            },
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
            legend: {
                displayName: data.createDisplayNameGetter('Visual_Legend'),
                description: data.createDisplayNameGetter('Visual_LegendDescription'),
                properties: {
                    show: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true }
                    },
                    position: {
                        displayName: data.createDisplayNameGetter('Visual_LegendPosition'),
                        description: data.createDisplayNameGetter('Visual_LegendPositionDescription'),
                        type: { enumeration: legendPosition.type }
                    },
                    showTitle: {
                        displayName: data.createDisplayNameGetter('Visual_LegendShowTitle'),
                        description: data.createDisplayNameGetter('Visual_LegendShowTitleDescription'),
                        type: { bool: true }
                    },
                    titleText: {
                        displayName: data.createDisplayNameGetter('Visual_LegendName'),
                        description: data.createDisplayNameGetter('Visual_LegendNameDescription'),
                        type: { text: true },
                        suppressFormatPainterCopy: true
                    },
                    labelColor: {
                        displayName: data.createDisplayNameGetter('Visual_LegendTitleColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    fontSize: {
                        displayName: data.createDisplayNameGetter('Visual_TextSize'),
                        type: { formatting: { fontSize: true } }
                    }
                }
            },
            dataPoint: {
                displayName: data.createDisplayNameGetter('Visual_DataPoint'),
                description: data.createDisplayNameGetter('Visual_DataPointDescription'),
                properties: {
                    defaultColor: {
                        displayName: data.createDisplayNameGetter('Visual_DefaultColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    fill: {
                        displayName: data.createDisplayNameGetter('Visual_Fill'),
                        type: { fill: { solid: { color: true } } }
                    }
                }
            },            
            categoryAxis: {
                displayName: data.createDisplayNameGetter('Visual_XAxis'),
                properties: {
                    show: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true },
                    },
                    axisScale: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Scale'),
                        type: { enumeration: axisScale.type }
                    },
                    start: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Start'),
                        description: data.createDisplayNameGetter('Visual_Axis_StartDescription'),
                        type: { numeric: true },
                        suppressFormatPainterCopy: true,
                    },
                    end: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_End'),
                        description: data.createDisplayNameGetter('Visual_Axis_EndDescription'),
                        type: { numeric: true },
                        suppressFormatPainterCopy: true,
                    },
                    axisType: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Type'),
                        type: { enumeration: axisType.type },
                    },
                    showAxisTitle: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Title'),
                        description: data.createDisplayNameGetter('Visual_Axis_XTitleDescription'),
                        type: { bool: true }
                    },
                    axisStyle: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Style'),
                        type: { enumeration: axisStyle.type }
                    },
                    labelColor: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_LabelColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    labelDisplayUnits: {
                        displayName: data.createDisplayNameGetter('Visual_DisplayUnits'),
                        type: { formatting: { labelDisplayUnits: true } },
                    },
                    labelPrecision: {
                        displayName: data.createDisplayNameGetter('Visual_Precision'),
                        placeHolderText: data.createDisplayNameGetter('Visual_Precision_Auto'),
                        type: { numeric: true },
                    }
                }
            },
            valueAxis: {
                displayName: data.createDisplayNameGetter('Visual_YAxis'),
                properties: {
                    show: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true },
                    },
                    position: {
                        displayName: data.createDisplayNameGetter('Visual_YAxis_Position'),
                        description: data.createDisplayNameGetter('Visual_YAxis_PositionDescription'),
                        type: { enumeration: yAxisPosition.type },
                    },
                    axisScale: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Scale'),
                        type: { enumeration: axisScale.type }
                    },
                    start: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Start'),
                        description: data.createDisplayNameGetter('Visual_Axis_StartDescription'),
                        type: { numeric: true },
                        suppressFormatPainterCopy: true,
                    },
                    end: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_End'),
                        description: data.createDisplayNameGetter('Visual_Axis_EndDescription'),
                        type: { numeric: true },
                        suppressFormatPainterCopy: true,
                    },
                    showAxisTitle: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Title'),
                        description: data.createDisplayNameGetter('Visual_Axis_YTitleDescription'),
                        type: { bool: true }
                    },
                    axisStyle: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_Style'),
                        type: { enumeration: axisStyle.type }
                    },
                    labelColor: {
                        displayName: data.createDisplayNameGetter('Visual_Axis_LabelColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    labelDisplayUnits: {
                        displayName: data.createDisplayNameGetter('Visual_DisplayUnits'),
                        type: { formatting: { labelDisplayUnits: true } },
                    },
                    labelPrecision: {
                        displayName: data.createDisplayNameGetter('Visual_Precision'),
                        placeHolderText: data.createDisplayNameGetter('Visual_Precision_Auto'),
                        type: { numeric: true },
                    }
                }
            },
            y1AxisReferenceLine: {
                displayName: data.createDisplayNameGetter('Visual_Reference_Line'),
                description: data.createDisplayNameGetter('Visual_Reference_Line_Description'),
                properties: {
                    show: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true }
                    },
                    value: {
                        displayName: data.createDisplayNameGetter('Visual_Reference_Line_Value'),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Value_Description'),
                        type: { numeric: true }
                    },
                    lineColor: {
                        displayName: data.createDisplayNameGetter('Visual_Reference_Line_Color'),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Color_Description'),
                        type: { fill: { solid: { color: true } } }
                    },
                    transparency: {
                        displayName: data.createDisplayNameGetter('Visual_Reference_Line_Transparency'),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Transparency_Description'),
                        type: { numeric: true }
                    },
                    style: {
                        displayName: data.createDisplayNameGetter('Visual_Reference_Line_Style'),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Style_Description'),
                        type: { enumeration: lineStyle.type }
                    },
                    position: {
                        displayName: data.createDisplayNameGetter('Visual_Reference_Line_Arrange'),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Arrange_Description'),
                        type: { enumeration: referenceLinePosition.type }
                    },
                    dataLabelShow: {
                        displayName: data.createDisplayNameGetter("Visual_Reference_Line_Data_Label"),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Data_Label_Show_Description'),
                        type: { bool: true }
                    },
                    dataLabelColor: {
                        displayName: data.createDisplayNameGetter("Visual_Reference_Line_Data_Label_Color"),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Data_Label_Color_Description'),
                        type: { fill: { solid: { color: true } } }
                    },
                    dataLabelDecimalPoints: {
                        displayName: data.createDisplayNameGetter("Visual_Reference_Line_Data_Decimal_Points"),
                        placeHolderText: data.createDisplayNameGetter('Visual_Precision_Auto'),
                        type: { numeric: true }
                    },
                    dataLabelHorizontalPosition: {
                        displayName: data.createDisplayNameGetter("Visual_Reference_Line_Data_Horizontal_Position"),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Data_Label_Horizontal_Position_Description'),
                        type: { enumeration: referenceLineDataLabelHorizontalPosition.type }
                    },
                    dataLabelVerticalPosition: {
                        displayName: data.createDisplayNameGetter("Visual_Reference_Line_Data_Vertical_Position"),
                        description: data.createDisplayNameGetter('Visual_Reference_Line_Data_Label_Vertical_Position_Description'),
                        type: { enumeration: referenceLineDataLabelVerticalPosition.type }
                    },
                },
            },
            labels: {
                displayName: data.createDisplayNameGetter('Visual_DataPointsLabels'),
                description: data.createDisplayNameGetter('Visual_DataPointsLabelsDescription'),
                properties: {
                    show: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true }
                    },
                    showSeries: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true }
                    },
                    color: {
                        displayName: data.createDisplayNameGetter('Visual_LabelsFill'),
                        description: data.createDisplayNameGetter('Visual_LabelsFillDescription'),
                        type: { fill: { solid: { color: true } } }
                    },
                    labelDisplayUnits: {
                        displayName: data.createDisplayNameGetter('Visual_DisplayUnits'),
                        description: data.createDisplayNameGetter('Visual_DisplayUnitsDescription'),
                        type: { formatting: { labelDisplayUnits: true } },
                        suppressFormatPainterCopy: true,
                    },
                    labelPrecision: {
                        displayName: data.createDisplayNameGetter('Visual_Precision'),
                        description: data.createDisplayNameGetter('Visual_PrecisionDescription'),
                        placeHolderText: data.createDisplayNameGetter('Visual_Precision_Auto'),
                        type: { numeric: true },
                        suppressFormatPainterCopy: true,
                    },
                    showAll: {
                        displayName: data.createDisplayNameGetter('Visual_ShowAll'),
                        type: { bool: true }
                    },
                    fontSize: {
                        displayName: data.createDisplayNameGetter('Visual_TextSize'),
                        type: { formatting: { fontSize: true } }
                    },
                    labelDensity: {
                        displayName: data.createDisplayNameGetter('Visual_LabelDensity'),
                        type: { formatting: { labelDensity: true } },
                    },
                },
            },
            plotArea: {
                displayName: data.createDisplayNameGetter('Visual_Plot'),
                //description: data.createDisplayNameGetter('Visual_PlotDescription'),
                properties: {
                    transparency: {
                        displayName: data.createDisplayNameGetter('Visual_Background_Transparency'),
                        type: { numeric: true },
                    },
                    image: {
                        type: { image: {} },
                    },
                },
            },
        },
        dataViewMappings: [{
            conditions: [
                { 'Category': { max: 1 }, 'Series': { max: 0 } },
                { 'Category': { max: 1 }, 'Series': { min: 1, max: 1 }, 'Y': { max: 1 } }
            ],
            categorical: {
                categories: {
                    for: { in: 'Category' },
                    dataReductionAlgorithm: { top: {} }
                },
                values: {
                    group: {
                        by: 'Series',
                        select: [{ for: { in: 'Y' } }],
                        dataReductionAlgorithm: { top: {} }
                    }
                },
            },
        }],
        sorting: {
            default: {},
        },
    };

    export const lineChartProps = {
        general: {
            formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },
        },
        dataPoint: {
            defaultColor: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'defaultColor' },
            fill: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'fill' },
        },
        categoryAxis: {
            axisType: <DataViewObjectPropertyIdentifier>{ objectName: 'categoryAxis', propertyName: 'axisType' },
        },
        legend: {
            labelColor: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'labelColor' },
        },
        labels: {
            labelDensity: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'labelDensity' },
        },
        plotArea: {
            image: <DataViewObjectPropertyIdentifier>{ objectName: 'plotArea', propertyName: 'image' },
            transparency: <DataViewObjectPropertyIdentifier>{ objectName: 'plotArea', propertyName: 'transparency' },
        },
    };    
}