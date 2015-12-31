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
    export const basicShapeCapabilities: VisualCapabilities = {
        objects: {
            line: {
                displayName: data.createDisplayNameGetter('Visual_BasicShape_Line'),
                properties: {
                    lineColor: {
                        displayName: data.createDisplayNameGetter('Visual_BasicShape_LineColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    transparency: {
                        displayName: data.createDisplayNameGetter('Visual_Background_Transparency'),
                        description: data.createDisplayNameGetter('Visual_Background_TransparencyDescription'),
                        type: { numeric: true }
                    },
                    weight: {
                        displayName: data.createDisplayNameGetter('Visual_BasicShape_Weight'),
                        type: { numeric: true }
                    },
                    roundEdge: {
                        displayName: data.createDisplayNameGetter('Visual_BasicShape_RoundEdges'),
                        type: { numeric: true }
                    }
                }
            },
            fill: {
                displayName: data.createDisplayNameGetter('Visual_Fill'),
                properties: {
                    show: {
                        displayName: data.createDisplayNameGetter('Visual_Show'),
                        type: { bool: true }
                    },
                    fillColor: {
                        displayName: data.createDisplayNameGetter('Visual_BasicShape_FillColor'),
                        type: { fill: { solid: { color: true } } }
                    },
                    transparency: {
                        displayName: data.createDisplayNameGetter('Visual_Background_Transparency'),
                        description: data.createDisplayNameGetter('Visual_Background_TransparencyDescription'),
                        type: { numeric: true }
                    },
                }
            },
            rotation: {
                displayName: data.createDisplayNameGetter('Visual_BasicShape_Rotate'),
                properties: {
                    angle: {
                        displayName: data.createDisplayNameGetter('Visual_BasicShape_Rotate'),
                        type: { numeric: true }
                    }
                }
            },
            general: {
                properties: {
                    shapeType: {
                        type: { text: true }
                    }
                }
            }
        },
        suppressDefaultTitle: true,
        canRotate: false,
        supportsSelection: false,
    };

    export const basicShapeProps = {
        general: {
            shapeType: <DataViewObjectPropertyIdentifier>{ objectName: 'general', propertyName: 'shapeType' },
        },
        line: {
            transparency: <DataViewObjectPropertyIdentifier>{ objectName: 'line', propertyName: 'transparency' },
            weight: <DataViewObjectPropertyIdentifier>{ objectName: 'line', propertyName: 'weight' },
            roundEdge: <DataViewObjectPropertyIdentifier>{ objectName: 'line', propertyName: 'roundEdge' },
            lineColor: <DataViewObjectPropertyIdentifier>{ objectName: 'line', propertyName: 'lineColor' }
        },
        fill: {
            transparency: <DataViewObjectPropertyIdentifier>{ objectName: 'fill', propertyName: 'transparency' },
            fillColor: <DataViewObjectPropertyIdentifier>{ objectName: 'fill', propertyName: 'fillColor' },
            show: <DataViewObjectPropertyIdentifier>{ objectName: 'fill', propertyName: 'show' }
        },
        rotation: {
            angle: <DataViewObjectPropertyIdentifier>{ objectName: 'rotation', propertyName: 'angle' }
        }
    };
}