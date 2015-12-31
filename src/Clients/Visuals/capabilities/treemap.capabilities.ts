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
    export const treemapCapabilities: VisualCapabilities = {
        dataRoles: [
            {
                name: 'Group',
                kind: VisualDataRoleKind.Grouping,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Group'),
                description: data.createDisplayNameGetter('Role_DisplayName_GroupTreemapDescription')
            }, {
                name: 'Details',
                kind: VisualDataRoleKind.Grouping,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Details'),
            }, {
                name: 'Values',
                kind: VisualDataRoleKind.Measure,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Values'),
                description: data.createDisplayNameGetter('Role_DisplayName_ValuesDescription'),
                requiredTypes: [{ numeric: true }, { integer: true }],
            }, {
                name: 'Gradient',
                kind: VisualDataRoleKind.Measure,
                displayName: data.createDisplayNameGetter('Role_DisplayName_Gradient'),
                description: data.createDisplayNameGetter('Role_DisplayName_GradientDescription'),
                requiredTypes: [{ numeric: true }, { integer: true }],
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
                        type: { text: true }
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
                    fill: {
                        type: { fill: { solid: { color: true } } }
                    },
                    fillRule: {
                        displayName: data.createDisplayNameGetter('Visual_Gradient'),
                        type: { fillRule: {} },
                        rule: {
                            inputRole: 'Gradient',
                            output: {
                                property: 'fill',
                                selector: ['Group'],
                            }
                        }
                    }
                }
            },
            labels: {
                displayName: data.createDisplayNameGetter('Visual_DataPointsLabels'),
                description: data.createDisplayNameGetter('Visual_DataPointsLabelsDescription'),
                properties: {
                    show: {
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
                        type: { formatting: { labelDisplayUnits: true } }
                    },
                    labelPrecision: {
                        displayName: data.createDisplayNameGetter('Visual_Precision'),
                        description: data.createDisplayNameGetter('Visual_PrecisionDescription'),
                        placeHolderText: data.createDisplayNameGetter('Visual_Precision_Auto'),
                        type: { numeric: true }
                    },
                }
            },
            categoryLabels: {
                displayName: data.createDisplayNameGetter('Visual_CategoryLabels'),
                description: data.createDisplayNameGetter('Visual_CategoryLabelsDescription'),
                properties: {
                    show: {
                        type: { bool: true }
                    },
                },
            },
        },
        dataViewMappings: [{
            conditions: [
                { 'Group': { max: 1 }, 'Details': { max: 0 }, 'Gradient': { max: 1 } },
                { 'Group': { max: 1 }, 'Details': { min: 1, max: 1 }, 'Values': { max: 1 }, 'Gradient': { max: 0 } }
            ],
            categorical: {
                categories: {
                    for: { in: 'Group' },
                    dataReductionAlgorithm: { top: {} }
                },
                values: {
                    group: {
                        by: 'Details',
                        select: [{ bind: { to: 'Values' } }, { bind: { to: 'Gradient' } }],
                        dataReductionAlgorithm: { top: {} }
                    }
                },
                rowCount: { preferred: { min: 2 } }
            }
        }],
        supportsHighlight: true,
        sorting: {
            custom: {},
            implicit: {
                clauses: [{ role: 'Values', direction: SortDirection.Descending }]
            },
        },
        drilldown: {
            roles: ['Group']
        },
    };
    
    export const treemapProps = {
        general: {
            formatString: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'formatString' },
        },
        dataPoint: {
            fill: <DataViewObjectPropertyIdentifier>{ objectName: 'dataPoint', propertyName: 'fill' },
        },
        legend: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'show' },
            position: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'position' },
            showTitle: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'showTitle' },
            titleText: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'titleText' },
            labelColor: <DataViewObjectPropertyIdentifier>{ objectName: 'legend', propertyName: 'labelColor' },
        },
        labels: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'show' },
            color: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'color' },
            labelDisplayUnits: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'labelDisplayUnits' },
            labelPrecision: <DataViewObjectPropertyIdentifier>{ objectName: 'labels', propertyName: 'labelPrecision' },
        },
        categoryLabels: {
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'categoryLabels', propertyName: 'show' },
        },
    };
}